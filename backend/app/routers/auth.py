from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import models
from ..deps import get_current_user, require_role
from ..security import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "coordinator"
    department: Optional[str] = None


class UserPublic(BaseModel):
    id: int
    username: str
    role: str
    department: Optional[str]
    is_active: bool


class AuthResponse(BaseModel):
    access_token: str
    user: UserPublic


@router.post("/login", response_model=AuthResponse)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(models.User).filter(models.User.username == form_data.username, models.User.is_active == True).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})

    return AuthResponse(
        access_token=access_token,
        user=UserPublic(id=user.id, username=user.username, role=user.role, department=user.department, is_active=user.is_active)
    )


@router.get("/me", response_model=UserPublic)
def me(user: models.User = Depends(get_current_user)):
    return UserPublic(id=user.id, username=user.username, role=user.role, department=user.department, is_active=user.is_active)


@router.post("/bootstrap", response_model=UserPublic)
def bootstrap(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_count = db.query(models.User).count()
    if existing_count > 0:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bootstrap can only be used for initial user creation.")
    
    username = user_in.username.strip()
    if not username or not user_in.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    role = user_in.role.strip().lower()
    if role not in ("coordinator", "hod", "delegate"):
        raise HTTPException(status_code=400, detail="Invalid role")
    
    dep = (user_in.department or None)
    if role != "coordinator" and not dep:
        raise HTTPException(status_code=400, detail="Department required for non-coordinator roles")
    
    pwd_hash = get_password_hash(user_in.password)
    u = models.User(username=username, password_hash=pwd_hash, role=role, department=(dep.upper() if dep else None), is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserPublic(id=u.id, username=u.username, role=u.role, department=u.department, is_active=u.is_active)


@router.post("/users", response_model=UserPublic)
def create_user(user_in: UserCreate, db: Session = Depends(get_db), current: models.User = Depends(get_current_user)):
    require_role(current, "coordinator")
    username = user_in.username.strip()
    if not username or not user_in.password:
        raise HTTPException(status_code=400, detail="Username and password required")
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    role = user_in.role.strip().lower()
    if role not in ("coordinator", "hod", "delegate"):
        raise HTTPException(status_code=400, detail="Invalid role")
        
    dep = (user_in.department or None)
    if role != "coordinator" and not dep:
        raise HTTPException(status_code=400, detail="Department required for non-coordinator roles")
        
    pwd_hash = get_password_hash(user_in.password)
    u = models.User(username=username, password_hash=pwd_hash, role=role, department=(dep.upper() if dep else None), is_active=True)
    db.add(u)
    db.commit()
    db.refresh(u)
    return UserPublic(id=u.id, username=u.username, role=u.role, department=u.department, is_active=u.is_active)
