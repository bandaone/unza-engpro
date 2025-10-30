from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import logging

from .. import crud, schemas
from ..database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/stats/global")
def get_global_stats(db: Session = Depends(get_db)):
    try:
        departments = crud.get_departments(db)
        courses = crud.get_courses(db)
        groups = crud.get_groups(db)
        lecturers = crud.get_lecturers(db)
        
        return {
            "departments_count": len(departments),
            "courses_count": len(courses),
            "groups_count": len(groups),
            "lecturers_count": len(lecturers)
        }
    except Exception as e:
        logger.error(f"Error in get_global_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/issues")
def get_global_issues(db: Session = Depends(get_db)):
    try:
        return {
            "issues": [],  # TODO: Implement global issues tracking
            "warnings_count": 0,
            "errors_count": 0
        }
    except Exception as e:
        logger.error(f"Error in get_global_issues: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/departments", response_model=List[schemas.Department])
async def list_departments(db: Session = Depends(get_db)):
    try:
        departments = crud.get_departments(db)
        result = []
        for dep in departments:
            result.append(schemas.Department(
                code=dep,
                name=dep,
                validation_status="valid",
                issues_count=0,
                courses_count=len(crud.get_courses(db, department=dep))
            ))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/departments/{code}/stats", response_model=Dict[str, int])
def get_department_stats(code: str, db: Session = Depends(get_db)):
    department = crud.get_department(db, code)
    if not department:
        return {
            "courses_count": 0,
            "groups_count": 0,
            "lecturers_count": 0,
            "issues_count": 0
        }
    return {
        "courses_count": len(crud.get_courses(db, department=code)),
        "groups_count": len(crud.get_groups(db, department=code)),
        "lecturers_count": len(crud.get_lecturers(db, department=code)),
        "issues_count": 0  # TODO: Implement issues tracking
    }

@router.get("/departments/{code}/validate", response_model=Dict[str, Any])
def validate_department(code: str, db: Session = Depends(get_db)):
    department = crud.get_department(db, code)
    if not department:
        return {
            "status": "error",
            "issues": ["Department not found"]
        }
    # For now, return a basic validation result
    return {
        "status": "valid",
        "issues": []
    }
