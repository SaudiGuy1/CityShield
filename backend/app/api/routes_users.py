"""User management routes (Admin only)."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ..models.user import User, UserCreate, UserUpdate, ManagerAssignment
from ..core.rbac import require_admin, require_manager_or_admin, Role, VALID_ROLES
from ..core.security import get_current_user, get_password_hash
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/users", tags=["users"])


def _strip_password(doc: dict) -> dict:
    """Remove the hashed password before returning a user document."""
    return {k: v for k, v in doc.items() if k != "hashed_password"}


def _resolve_manager_username(candidate: str | None) -> str | None:
    """Validate that `candidate` exists and has a role allowed to manage others."""
    if candidate is None:
        return None
    candidate = candidate.strip()
    if not candidate:
        return None
    manager_doc = opensearch_client.get_document("users", candidate)
    if not manager_doc:
        raise HTTPException(status_code=400, detail=f"Manager '{candidate}' does not exist")
    if not manager_doc.get("is_active", True):
        raise HTTPException(status_code=400, detail=f"Manager '{candidate}' is inactive")
    if manager_doc.get("role") not in (Role.MANAGER, Role.ADMINISTRATOR):
        raise HTTPException(
            status_code=400,
            detail=f"User '{candidate}' is not a Manager or Administrator and cannot be assigned as a manager",
        )
    return candidate


@router.post("", response_model=User, dependencies=[Depends(require_admin)])
async def create_user(user: UserCreate):
    """Create a new user (Admin only)."""
    # Validate role
    if user.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")

    # Check if user already exists
    query = {
        "query": {"term": {"username": user.username}},
        "size": 1
    }
    existing = opensearch_client.search("users", query)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    manager_username = _resolve_manager_username(user.manager_username)
    if manager_username == user.username:
        raise HTTPException(status_code=400, detail="A user cannot be their own manager")

    # Create user
    now = datetime.utcnow()
    user_doc = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "manager_username": manager_username,
        "hashed_password": get_password_hash(user.password),
        "created_at": now.isoformat(),
        "is_active": True
    }

    opensearch_client.index_document("users", user_doc, doc_id=user.username)

    return User(
        username=user.username,
        email=user.email,
        role=user.role,
        manager_username=manager_username,
        created_at=now,
        is_active=True
    )


@router.get("", response_model=List[User], dependencies=[Depends(require_admin)])
async def list_users():
    """List all users (Admin only)."""
    query = {
        "query": {"match_all": {}},
        "size": 1000,
        "sort": [{"created_at": {"order": "desc"}}]
    }
    docs = opensearch_client.search("users", query)
    return [User(**_strip_password(doc)) for doc in docs]


@router.get("/me/team", response_model=List[User])
async def list_my_team(current_user: dict = Depends(require_manager_or_admin)):
    """List users who report to the current manager (or every user, if admin)."""
    username = current_user.get("username")
    role = current_user.get("role")
    if role == Role.ADMINISTRATOR:
        query: dict = {"query": {"match_all": {}}, "size": 1000}
    else:
        query = {
            "query": {"term": {"manager_username": username}},
            "size": 1000,
            "sort": [{"created_at": {"order": "desc"}}],
        }
    docs = opensearch_client.search("users", query)
    return [User(**_strip_password(doc)) for doc in docs]


@router.get("/{username}", response_model=User, dependencies=[Depends(require_admin)])
async def get_user(username: str):
    """Get a user by username (Admin only)."""
    doc = opensearch_client.get_document("users", username)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**_strip_password(doc))


@router.put("/{username}", response_model=User, dependencies=[Depends(require_admin)])
async def update_user(username: str, updates: UserUpdate):
    """Update a user (Admin only)."""
    # Check if user exists
    existing = opensearch_client.get_document("users", username)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    # Prepare updates
    update_data = {}
    if updates.email is not None:
        update_data["email"] = updates.email
    if updates.role is not None:
        if updates.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")
        update_data["role"] = updates.role
    if updates.password is not None:
        update_data["hashed_password"] = get_password_hash(updates.password)
    if updates.is_active is not None:
        update_data["is_active"] = updates.is_active
    if updates.manager_username is not None:
        resolved = _resolve_manager_username(updates.manager_username)
        if resolved == username:
            raise HTTPException(status_code=400, detail="A user cannot be their own manager")
        update_data["manager_username"] = resolved

    if update_data:
        opensearch_client.update_document("users", username, update_data)

    # Get updated user
    doc = opensearch_client.get_document("users", username)
    return User(**_strip_password(doc))


@router.put("/{username}/manager", response_model=User, dependencies=[Depends(require_admin)])
async def set_user_manager(username: str, assignment: ManagerAssignment):
    """Assign or clear a user's manager (Admin only).

    Pass `manager_username: null` to clear the assignment.
    """
    existing = opensearch_client.get_document("users", username)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    resolved = _resolve_manager_username(assignment.manager_username)
    if resolved == username:
        raise HTTPException(status_code=400, detail="A user cannot be their own manager")

    opensearch_client.update_document("users", username, {"manager_username": resolved})
    doc = opensearch_client.get_document("users", username)
    return User(**_strip_password(doc))


@router.get("/me/manager-profile", response_model=User)
async def my_profile(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's full profile, including manager_username."""
    username = current_user.get("username")
    if not username:
        raise HTTPException(status_code=401, detail="Authenticated user has no username")
    doc = opensearch_client.get_document("users", username)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**_strip_password(doc))


@router.delete("/{username}", dependencies=[Depends(require_admin)])
async def delete_user(username: str):
    """Delete a user (Admin only)."""
    try:
        opensearch_client.delete_document("users", username)
        return {"message": "User deleted successfully"}
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
