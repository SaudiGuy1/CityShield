# OpenSearch image tuned for a single Railway service.
#
# Differences from the local docker-compose node:
#   - Heap reduced to 512m so it fits small Railway plans (override with
#     OPENSEARCH_JAVA_OPTS if your plan has more memory).
#   - memory_lock disabled (Railway containers cannot mlock).
#   - mmap disabled so OpenSearch does not require vm.max_map_count=262144,
#     which cannot be set on Railway's shared kernel.
#   - network.host=:: so the node is reachable over Railway's IPv6 private
#     network (backend connects via opensearch.railway.internal:9200).
#   - Security plugin disabled. This node must NOT be given a public domain —
#     it is protected by living only on the private network. See RAILWAY_DEPLOYMENT.md.
FROM opensearchproject/opensearch:2.11.1

ENV discovery.type=single-node \
    bootstrap.memory_lock=false \
    node.store.allow_mmap=false \
    network.host=:: \
    DISABLE_SECURITY_PLUGIN=true \
    DISABLE_INSTALL_DEMO_CONFIG=true \
    OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m

EXPOSE 9200
