from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from .. import models
from ..deps import get_current_user, require_role

router = APIRouter(prefix="/issues", tags=["issues"])


def issue_to_dict(i: models.Issue) -> dict:
    return {
        "id": i.id,
        "scope": i.scope,
        "issue_type": i.issue_type,
        "severity": i.severity,
        "status": i.status,
        "message": i.message,
        "department": i.department,
        "course_id": i.course_id,
        "group_id": i.group_id,
        "lecturer_id": i.lecturer_id,
        "room_id": i.room_id,
        "version_id": i.version_id,
        "assigned_to_user_id": i.assigned_to_user_id,
        "created_by_user_id": i.created_by_user_id,
        "updated_by_user_id": i.updated_by_user_id,
        "created_at": i.created_at,
        "updated_at": i.updated_at,
    }


@router.get("")
def list_issues(
    status: Optional[str] = None,
    scope: Optional[str] = None,
    severity: Optional[str] = None,
    department: Optional[str] = None,
    course_id: Optional[int] = None,
    group_id: Optional[int] = None,
    lecturer_id: Optional[int] = None,
    room_id: Optional[int] = None,
    version_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    q = db.query(models.Issue)
    if status:
        q = q.filter(models.Issue.status == status)
    if scope:
        q = q.filter(models.Issue.scope == scope)
    if severity:
        q = q.filter(models.Issue.severity == severity)
    if department:
        q = q.filter(models.Issue.department == department.upper())
    if course_id:
        q = q.filter(models.Issue.course_id == course_id)
    if group_id:
        q = q.filter(models.Issue.group_id == group_id)
    if lecturer_id:
        q = q.filter(models.Issue.lecturer_id == lecturer_id)
    if room_id:
        q = q.filter(models.Issue.room_id == room_id)
    if version_id:
        q = q.filter(models.Issue.version_id == version_id)

    # Non-coordinators are scoped to their department
    if user.role != "coordinator":
        dep = (user.department or "").upper()
        if not dep:
            raise HTTPException(status_code=403, detail="Department-scoped user has no department set")
        q = q.filter(models.Issue.department == dep)

    items = q.order_by(models.Issue.created_at.desc()).all()
    return [issue_to_dict(i) for i in items]


class StatusUpdate(BaseModel):
    status: str  # open | assigned | resolved


@router.post("/{issue_id}/status")
def update_issue_status(
    issue_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(user, "coordinator")
    iss = db.query(models.Issue).get(issue_id)
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")
    new_status = payload.status.strip().lower()
    if new_status not in ("open", "assigned", "resolved"):
        raise HTTPException(status_code=400, detail="Invalid status")
    iss.status = new_status
    iss.updated_by_user_id = user.id
    iss.updated_at = datetime.utcnow()
    db.add(iss)
    db.commit()
    db.refresh(iss)
    return issue_to_dict(iss)


class AssignUpdate(BaseModel):
    user_id: int


@router.post("/{issue_id}/assign")
def assign_issue(
    issue_id: int,
    payload: AssignUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(user, "coordinator")
    iss = db.query(models.Issue).get(issue_id)
    if not iss:
        raise HTTPException(status_code=404, detail="Issue not found")
    assignee = db.query(models.User).get(payload.user_id)
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee user not found")
    iss.assigned_to_user_id = assignee.id
    iss.status = "assigned"
    iss.updated_by_user_id = user.id
    iss.updated_at = datetime.utcnow()
    db.add(iss)
    db.commit()
    db.refresh(iss)
    return issue_to_dict(iss)
