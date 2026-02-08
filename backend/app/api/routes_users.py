"""User management routes (Admin only)."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ..models.user import User, UserCreate, UserUpdate, UserInDB
from ..core.rbac import require_admin, Role, VALID_ROLES
from ..core.security import get_password_hash
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/users", tags=["users"])


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

    # Create user
    now = datetime.utcnow()
    user_doc = {
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "hashed_password": get_password_hash(user.password),
        "created_at": now.isoformat(),
        "is_active": True
    }

    opensearch_client.index_document("users", user_doc, doc_id=user.username)

    return User(
        username=user.username,
        email=user.email,
        role=user.role,
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
    return [User(**{k: v for k, v in doc.items() if k != "hashed_password"}) for doc in docs]


@router.get("/{username}", response_model=User, dependencies=[Depends(require_admin)])
async def get_user(username: str):
    """Get a user by username (Admin only)."""
    doc = opensearch_client.get_document("users", username)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**{k: v for k, v in doc.items() if k != "hashed_password"})


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

    if update_data:
        opensearch_client.update_document("users", username, update_data)

    # Get updated user
    doc = opensearch_client.get_document("users", username)
    return User(**{k: v for k, v in doc.items() if k != "hashed_password"})


@router.delete("/{username}", dependencies=[Depends(require_admin)])
async def delete_user(username: str):
    """Delete a user (Admin only)."""
    try:
        opensearch_client.delete_document("users", username)
        return {"message": "User deleted successfully"}
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
