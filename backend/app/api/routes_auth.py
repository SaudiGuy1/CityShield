"""Authentication routes."""
from fastapi import APIRouter, HTTPException, status, Depends
from ..models.user import LoginRequest, Token, User, UserInDB
from ..core.security import verify_password, create_access_token, get_current_user
from ..db.opensearch_client import opensearch_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


def get_user_by_username(username: str) -> UserInDB:
    """Get user by username."""
    query = {
        "query": {
            "term": {"username": username}
        },
        "size": 1
    }
    results = opensearch_client.search("users", query)
    if results:
        return UserInDB(**results[0])
    return None


def authenticate_user(username: str, password: str) -> UserInDB:
    """Authenticate user with username and password."""
    user = get_user_by_username(username)
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """Login endpoint."""
    user = authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "email": user.email}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information."""
    user = get_user_by_username(current_user["username"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(
        username=user.username,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        is_active=user.is_active
    )
