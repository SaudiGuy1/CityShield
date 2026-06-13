"""In-memory, OpenSearch-compatible data store.

A drop-in replacement for ``OpenSearchClient`` that keeps all data in Python
dicts, so the backend runs as a single lightweight service with NO OpenSearch
dependency. It is enabled with ``USE_IN_MEMORY_STORE=true`` and is intended for
demos: data is seeded on startup (admin user, scenarios, rules, assets) exactly
like the real stack, but is NOT persisted across restarts.

It implements the subset of the OpenSearch query DSL the app actually uses:
match_all / term / terms / match / range / exists / prefix / wildcard /
query_string / multi_match / bool(must/should/must_not/filter), plus `terms`
and `date_histogram` aggregations, and size/from/sort/_source options.
"""
import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Field access helpers
# --------------------------------------------------------------------------- #
def _strip_keyword(field: str) -> str:
    """`severity.keyword` -> `severity` (text/keyword multi-field aliasing)."""
    return field[:-8] if field.endswith(".keyword") else field


def _get_field(doc: Dict[str, Any], field: str) -> Any:
    """Resolve a (possibly dotted) field path into a nested document."""
    field = _strip_keyword(field)
    cur: Any = doc
    for part in field.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def _as_comparable(v: Any) -> Any:
    """Best-effort coercion so ISO date strings and numbers compare sensibly."""
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        # ISO datetimes compare correctly lexicographically; numbers as floats.
        try:
            return float(v)
        except ValueError:
            return v
    return v


# --------------------------------------------------------------------------- #
# Query matching
# --------------------------------------------------------------------------- #
def _wildcard_to_regex(pattern: str) -> "re.Pattern":
    esc = re.escape(pattern).replace(r"\*", ".*").replace(r"\?", ".")
    return re.compile(f"^{esc}$", re.IGNORECASE)


def _match_leaf(doc: Dict[str, Any], clause: str, body: Any) -> bool:
    if clause == "match_all":
        return True
    if clause == "match_none":
        return False

    if clause in ("term", "match_phrase"):
        (field, val), = body.items()
        if isinstance(val, dict):
            val = val.get("value")
        actual = _get_field(doc, field)
        if isinstance(actual, list):
            return val in actual
        if isinstance(actual, str) and isinstance(val, str):
            return actual.lower() == val.lower()
        return actual == val

    if clause == "terms":
        (field, vals), = body.items()
        actual = _get_field(doc, field)
        vals_l = [v.lower() if isinstance(v, str) else v for v in vals]
        if isinstance(actual, list):
            return any((a.lower() if isinstance(a, str) else a) in vals_l for a in actual)
        return (actual.lower() if isinstance(actual, str) else actual) in vals_l

    if clause == "match":
        (field, val), = body.items()
        if isinstance(val, dict):
            val = val.get("query")
        actual = _get_field(doc, field)
        if actual is None:
            return False
        if isinstance(actual, str) and isinstance(val, str):
            return val.lower() in actual.lower()
        return actual == val

    if clause == "range":
        (field, conds), = body.items()
        actual = _get_field(doc, field)
        if actual is None:
            return False
        a = _as_comparable(actual)
        for op, ref in conds.items():
            if op in ("format", "time_zone", "boost"):
                continue
            r = _as_comparable(ref)
            try:
                if op == "gte" and not (a >= r):
                    return False
                if op == "gt" and not (a > r):
                    return False
                if op == "lte" and not (a <= r):
                    return False
                if op == "lt" and not (a < r):
                    return False
            except TypeError:
                return False
        return True

    if clause == "exists":
        return _get_field(doc, body["field"]) is not None

    if clause == "prefix":
        (field, val), = body.items()
        if isinstance(val, dict):
            val = val.get("value")
        actual = _get_field(doc, field)
        return isinstance(actual, str) and actual.lower().startswith(str(val).lower())

    if clause == "wildcard":
        (field, val), = body.items()
        if isinstance(val, dict):
            val = val.get("value")
        actual = _get_field(doc, field)
        return isinstance(actual, str) and bool(_wildcard_to_regex(str(val)).match(actual))

    if clause in ("query_string", "multi_match"):
        q = body.get("query", "")
        text = str(q).split(":")[-1].strip().strip("*").lower()
        if not text:
            return True
        for v in _iter_strings(doc):
            if text in v.lower():
                return True
        return False

    if clause == "ids":
        # handled at a higher level via _id; treated as no-op here
        return True

    # Unknown clause: don't exclude the doc (be permissive for a demo).
    logger.debug("memory_store: unsupported query clause %r — treating as match", clause)
    return True


def _iter_strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for v in value.values():
            yield from _iter_strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from _iter_strings(v)


def _matches(doc: Dict[str, Any], query: Optional[Dict[str, Any]]) -> bool:
    if not query:
        return True
    (clause, body), = query.items()

    if clause == "bool":
        must = body.get("must", []) or []
        should = body.get("should", []) or []
        must_not = body.get("must_not", []) or []
        filt = body.get("filter", []) or []
        must = must if isinstance(must, list) else [must]
        should = should if isinstance(should, list) else [should]
        must_not = must_not if isinstance(must_not, list) else [must_not]
        filt = filt if isinstance(filt, list) else [filt]

        if not all(_matches(doc, m) for m in must):
            return False
        if not all(_matches(doc, f) for f in filt):
            return False
        if any(_matches(doc, m) for m in must_not):
            return False
        if should:
            min_should = body.get("minimum_should_match")
            need = 1 if (min_should is None and not must and not filt) else (min_should or 0)
            matched = sum(1 for s in should if _matches(doc, s))
            if matched < need:
                return False
        return True

    if clause in ("constant_score",):
        return _matches(doc, body.get("filter", {}))

    return _match_leaf(doc, clause, body)


# --------------------------------------------------------------------------- #
# Aggregations
# --------------------------------------------------------------------------- #
_INTERVAL_DELTAS = {
    "minute": timedelta(minutes=1),
    "1m": timedelta(minutes=1),
    "hour": timedelta(hours=1),
    "1h": timedelta(hours=1),
    "day": timedelta(days=1),
    "1d": timedelta(days=1),
    "week": timedelta(weeks=1),
    "1w": timedelta(weeks=1),
}


def _parse_dt(v: Any) -> Optional[datetime]:
    if isinstance(v, (int, float)):
        return datetime.utcfromtimestamp(v / 1000.0)
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            return None
    return None


def _truncate(dt: datetime, interval: str) -> datetime:
    if interval in ("minute", "1m"):
        return dt.replace(second=0, microsecond=0)
    if interval in ("hour", "1h"):
        return dt.replace(minute=0, second=0, microsecond=0)
    if interval in ("day", "1d"):
        return dt.replace(hour=0, minute=0, second=0, microsecond=0)
    if interval in ("week", "1w"):
        start = dt - timedelta(days=dt.weekday())
        return start.replace(hour=0, minute=0, second=0, microsecond=0)
    return dt.replace(second=0, microsecond=0)


def _run_aggs(docs: List[Dict[str, Any]], aggs: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for name, spec in aggs.items():
        sub_aggs = spec.get("aggs") or spec.get("aggregations")

        if "terms" in spec:
            field = spec["terms"]["field"]
            size = spec["terms"].get("size", 10)
            groups: Dict[Any, List[Dict[str, Any]]] = {}
            for d in docs:
                key = _get_field(d, field)
                if key is None:
                    continue
                keys = key if isinstance(key, list) else [key]
                for k in keys:
                    groups.setdefault(k, []).append(d)
            buckets = []
            for k, gdocs in sorted(groups.items(), key=lambda kv: len(kv[1]), reverse=True)[:size]:
                bucket = {"key": k, "doc_count": len(gdocs)}
                if sub_aggs:
                    bucket.update(_run_aggs(gdocs, sub_aggs))
                buckets.append(bucket)
            out[name] = {"buckets": buckets}

        elif "date_histogram" in spec:
            dh = spec["date_histogram"]
            field = dh["field"]
            interval = dh.get("calendar_interval") or dh.get("fixed_interval") or "hour"
            groups: Dict[datetime, List[Dict[str, Any]]] = {}
            for d in docs:
                dt = _parse_dt(_get_field(d, field))
                if dt is None:
                    continue
                groups.setdefault(_truncate(dt, interval), []).append(d)
            # min_doc_count:0 -> fill gaps across the observed range
            keys = sorted(groups)
            if keys and dh.get("min_doc_count", 1) == 0 and interval in _INTERVAL_DELTAS:
                step = _INTERVAL_DELTAS[interval]
                filled, cur = [], keys[0]
                while cur <= keys[-1]:
                    filled.append(cur)
                    cur = cur + step
                keys = filled
            buckets = []
            for k in keys:
                gdocs = groups.get(k, [])
                bucket = {
                    "key": int(k.timestamp() * 1000),
                    "key_as_string": k.isoformat(),
                    "doc_count": len(gdocs),
                }
                if sub_aggs:
                    bucket.update(_run_aggs(gdocs, sub_aggs))
                buckets.append(bucket)
            out[name] = {"buckets": buckets}

        elif "value_count" in spec:
            field = spec["value_count"]["field"]
            out[name] = {"value": sum(1 for d in docs if _get_field(d, field) is not None)}

        elif "cardinality" in spec:
            field = spec["cardinality"]["field"]
            out[name] = {"value": len({_get_field(d, field) for d in docs if _get_field(d, field) is not None})}

        elif any(m in spec for m in ("sum", "avg", "max", "min")):
            metric = next(m for m in ("sum", "avg", "max", "min") if m in spec)
            field = spec[metric]["field"]
            vals = [_get_field(d, field) for d in docs]
            vals = [v for v in vals if isinstance(v, (int, float))]
            if not vals:
                out[name] = {"value": None}
            elif metric == "sum":
                out[name] = {"value": sum(vals)}
            elif metric == "avg":
                out[name] = {"value": sum(vals) / len(vals)}
            elif metric == "max":
                out[name] = {"value": max(vals)}
            else:
                out[name] = {"value": min(vals)}

        elif "filter" in spec:
            fdocs = [d for d in docs if _matches(d, spec["filter"])]
            bucket = {"doc_count": len(fdocs)}
            if sub_aggs:
                bucket.update(_run_aggs(fdocs, sub_aggs))
            out[name] = bucket

    return out


# --------------------------------------------------------------------------- #
# Sorting
# --------------------------------------------------------------------------- #
def _sort_key(sort_spec: Any):
    parsed = []  # list of (field, reverse)
    if isinstance(sort_spec, dict):
        sort_spec = [sort_spec]
    for item in sort_spec or []:
        if isinstance(item, str):
            parsed.append((item, False))
        elif isinstance(item, dict):
            for f, opt in item.items():
                order = opt.get("order", "asc") if isinstance(opt, dict) else opt
                parsed.append((f, str(order).lower() == "desc"))
    return parsed


def _apply_sort(docs: List[Dict[str, Any]], sort_spec: Any) -> List[Dict[str, Any]]:
    parsed = _sort_key(sort_spec)
    if not parsed:
        return docs
    for field, reverse in reversed(parsed):
        if field in ("_score", "_doc"):
            continue
        docs = sorted(
            docs,
            key=lambda d: (_get_field(d, field) is None, _as_comparable(_get_field(d, field)) or ""),
            reverse=reverse,
        )
    return docs


# --------------------------------------------------------------------------- #
# The store
# --------------------------------------------------------------------------- #
class _Indices:
    def __init__(self, store: "InMemoryClient"):
        self._store = store

    def exists(self, index: str, **_):
        return bool(self._store._resolve_indices(index))

    def create(self, index: str, body=None, **_):
        self._store._data.setdefault(index, {})
        return {"acknowledged": True}

    def get_mapping(self, index: str, **_):
        return {index: {"mappings": {"properties": {}}}}

    def put_mapping(self, index: str, body=None, **_):
        return {"acknowledged": True}

    def refresh(self, **_):
        return {"acknowledged": True}


class _Cluster:
    def health(self, **_):
        return {"status": "green", "number_of_nodes": 1, "active_shards": 1}

    def stats(self, **_):
        return {"status": "green", "indices": {"count": 0, "docs": {"count": 0}}}


class _LowLevel:
    """Mimics the opensearch-py client object exposed as `.client`."""

    def __init__(self, store: "InMemoryClient"):
        self._store = store
        self.indices = _Indices(store)
        self.cluster = _Cluster()

    def ping(self, **_):
        return True

    def info(self, **_):
        return {"version": {"number": "in-memory"}, "tagline": "CityShield in-memory store"}

    def search(self, index: str, body: Optional[Dict[str, Any]] = None, **_):
        return self._store._search_raw(index, body or {})

    def count(self, index: str, body: Optional[Dict[str, Any]] = None, **_):
        docs = self._store._collect(index, (body or {}).get("query"))
        return {"count": len(docs)}

    def index(self, index: str, body: Dict[str, Any], id: Optional[str] = None, **_):
        return self._store.index_document(index, body, id)

    def get(self, index: str, id: str, **_):
        src = self._store.get_document(index, id)
        if src is None:
            from opensearchpy.exceptions import NotFoundError
            raise NotFoundError(404, "not_found", {})
        return {"_index": index, "_id": id, "_source": src, "found": True}

    def update(self, index: str, id: str, body: Dict[str, Any], **_):
        return self._store.update_document(index, id, body.get("doc", {}))

    def delete(self, index: str, id: str, **_):
        return self._store.delete_document(index, id)


class InMemoryClient:
    """Drop-in replacement for OpenSearchClient (see module docstring)."""

    def __init__(self):
        # {index_name: {doc_id: source}}
        self._data: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self.client = _LowLevel(self)
        logger.warning(
            "IN-MEMORY data store active (USE_IN_MEMORY_STORE=true). "
            "Data is seeded on startup and NOT persisted across restarts."
        )

    # ---- index resolution (supports the `logs-*` style wildcard) ---- #
    def _resolve_indices(self, index: str) -> List[str]:
        names = [index] if isinstance(index, str) else list(index)
        resolved: List[str] = []
        for name in names:
            for part in name.split(","):
                part = part.strip()
                if part in ("", "_all", "*"):
                    resolved.extend(self._data.keys())
                elif part.endswith("*"):
                    prefix = part[:-1]
                    resolved.extend(k for k in self._data if k.startswith(prefix))
                else:
                    resolved.append(part)
        # de-dup, preserve order
        seen, out = set(), []
        for r in resolved:
            if r not in seen:
                seen.add(r)
                out.append(r)
        return out

    def _collect(self, index: str, query: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        docs: List[Dict[str, Any]] = []
        for name in self._resolve_indices(index):
            for doc_id, src in self._data.get(name, {}).items():
                if _matches(src, query):
                    docs.append({"_index": name, "_id": doc_id, "_source": src})
        return docs

    # ---- raw search returning an OpenSearch-shaped response ---- #
    def _search_raw(self, index: str, body: Dict[str, Any]) -> Dict[str, Any]:
        hits = self._collect(index, body.get("query"))
        total = len(hits)

        sources = _apply_sort([h["_source"] for h in hits], body.get("sort"))
        # rebuild hit envelopes in sorted order
        by_src_id = {id(h["_source"]): h for h in hits}
        ordered = [by_src_id[id(s)] for s in sources]

        size = body.get("size", 10)
        frm = body.get("from", 0)
        page = ordered[frm: frm + size] if size else []

        _source = body.get("_source", True)
        out_hits = []
        for h in page:
            src = h["_source"]
            if _source is False:
                src = {}
            elif isinstance(_source, list):
                src = {f: _get_field(h["_source"], f) for f in _source}
            out_hits.append({"_index": h["_index"], "_id": h["_id"], "_source": src})

        resp: Dict[str, Any] = {
            "hits": {"total": {"value": total, "relation": "eq"}, "hits": out_hits},
        }
        aggs = body.get("aggs") or body.get("aggregations")
        if aggs:
            resp["aggregations"] = _run_aggs([h["_source"] for h in hits], aggs)
        return resp

    # ---- high-level API (mirrors OpenSearchClient) ---- #
    def search(self, index: str, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        return [h["_source"] for h in self._search_raw(index, query)["hits"]["hits"]]

    def search_with_aggregations(self, index: str, query: Dict[str, Any]) -> Dict[str, Any]:
        return self._search_raw(index, query)

    def index_document(self, index: str, document: Dict[str, Any], doc_id: Optional[str] = None) -> Dict[str, Any]:
        doc_id = doc_id or uuid.uuid4().hex
        self._data.setdefault(index, {})[doc_id] = document
        return {"_index": index, "_id": doc_id, "result": "created"}

    def get_document(self, index: str, doc_id: str) -> Optional[Dict[str, Any]]:
        for name in self._resolve_indices(index):
            if doc_id in self._data.get(name, {}):
                return self._data[name][doc_id]
        return None

    def update_document(self, index: str, doc_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        for name in self._resolve_indices(index):
            if doc_id in self._data.get(name, {}):
                _deep_merge(self._data[name][doc_id], updates)
                return {"_index": name, "_id": doc_id, "result": "updated"}
        # match OpenSearch behaviour: updating a missing doc raises
        from opensearchpy.exceptions import NotFoundError
        raise NotFoundError(404, "document_missing_exception", {})

    def delete_document(self, index: str, doc_id: str) -> Dict[str, Any]:
        for name in self._resolve_indices(index):
            if doc_id in self._data.get(name, {}):
                del self._data[name][doc_id]
                return {"_index": name, "_id": doc_id, "result": "deleted"}
        return {"_index": index, "_id": doc_id, "result": "not_found"}

    def count(self, index: str, query: Optional[Dict[str, Any]] = None) -> int:
        return len(self._collect(index, query))


def _deep_merge(dst: Dict[str, Any], src: Dict[str, Any]) -> None:
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            _deep_merge(dst[k], v)
        else:
            dst[k] = v
