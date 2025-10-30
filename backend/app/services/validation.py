from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from . import models
from .schemas import CourseCreate, GroupCreate, LecturerCreate

class ValidationService:
    def __init__(self, db: Session):
        self.db = db

    def validate_course(self, course: CourseCreate, department: str) -> List[Dict[str, Any]]:
        issues = []
        
        # Basic validation
        if course.weekly_hours <= 0:
            issues.append({
                "type": "invalid_hours",
                "severity": "error",
                "message": f"Course {course.code} has invalid weekly hours"
            })

        if course.has_lab and (not course.lab_weekly_hours or course.lab_weekly_hours <= 0):
            issues.append({
                "type": "invalid_lab_hours",
                "severity": "error",
                "message": f"Course {course.code} has lab but invalid lab hours"
            })

        # Check lecturer assignments
        if not course.lecturers:
            issues.append({
                "type": "missing_lecturer",
                "severity": "error",
                "message": f"Course {course.code} has no assigned lecturers"
            })
        else:
            # Verify lecturer availability and department
            for lecturer_id in course.lecturers:
                lecturer = self.db.query(models.Lecturer).filter(models.Lecturer.id == lecturer_id).first()
                if not lecturer:
                    issues.append({
                        "type": "invalid_lecturer",
                        "severity": "error",
                        "message": f"Course {course.code} references non-existent lecturer"
                    })
                elif lecturer.department != department:
                    issues.append({
                        "type": "department_mismatch",
                        "severity": "warning",
                        "message": f"Lecturer {lecturer.name} is from different department"
                    })

        # Check group assignments
        if not course.groups:
            issues.append({
                "type": "missing_groups",
                "severity": "error",
                "message": f"Course {course.code} has no assigned groups"
            })
        else:
            total_students = 0
            for group_id in course.groups:
                group = self.db.query(models.StudentGroup).filter(models.StudentGroup.id == group_id).first()
                if group:
                    total_students += group.size

            # Check if any suitable rooms exist for this class size
            suitable_rooms = self.db.query(models.Room).filter(
                models.Room.capacity >= total_students
            ).first()
            
            if not suitable_rooms:
                issues.append({
                    "type": "no_suitable_room",
                    "severity": "warning",
                    "message": f"No rooms available for total class size of {total_students}"
                })

        return issues

    def validate_department(self, department: str) -> List[Dict[str, Any]]:
        issues = []
        
        # Get all department courses
        courses = self.db.query(models.Course).filter(models.Course.department == department).all()
        
        # Track lecturer hours
        lecturer_hours = {}
        for course in courses:
            for lecturer in course.lecturers:
                if lecturer.id not in lecturer_hours:
                    lecturer_hours[lecturer.id] = 0
                lecturer_hours[lecturer.id] += course.weekly_hours
                if course.has_lab:
                    lecturer_hours[lecturer.id] += course.lab_weekly_hours or 0

        # Check lecturer overloading
        max_weekly_hours = 18  # Configure as needed
        for lecturer_id, hours in lecturer_hours.items():
            if hours > max_weekly_hours:
                lecturer = self.db.query(models.Lecturer).get(lecturer_id)
                issues.append({
                    "type": "lecturer_overload",
                    "severity": "warning",
                    "message": f"Lecturer {lecturer.name} has {hours} weekly hours (max: {max_weekly_hours})"
                })

        # Track group hours
        group_hours = {}
        for course in courses:
            for group in course.groups:
                if group.id not in group_hours:
                    group_hours[group.id] = 0
                group_hours[group.id] += course.weekly_hours
                if course.has_lab:
                    group_hours[group.id] += course.lab_weekly_hours or 0

        # Check group overloading
        max_group_hours = 30  # Configure as needed
        for group_id, hours in group_hours.items():
            if hours > max_group_hours:
                group = self.db.query(models.StudentGroup).get(group_id)
                issues.append({
                    "type": "group_overload",
                    "severity": "warning",
                    "message": f"Group {group.name} has {hours} weekly hours (max: {max_group_hours})"
                })

        return issues

    def validate_global(self) -> List[Dict[str, Any]]:
        issues = []

        # Check room availability
        all_courses = self.db.query(models.Course).all()
        room_capacity = {
            room.id: room.capacity 
            for room in self.db.query(models.Room).all()
        }

        total_weekly_hours = sum(
            course.weekly_hours + (course.lab_weekly_hours or 0)
            for course in all_courses
        )

        total_room_hours = len(room_capacity) * 40  # 40 hours per week per room
        if total_weekly_hours > total_room_hours:
            issues.append({
                "type": "insufficient_rooms",
                "severity": "error",
                "message": f"Total course hours ({total_weekly_hours}) exceed available room hours ({total_room_hours})"
            })

        # Check for lab equipment requirements
        lab_courses = self.db.query(models.Course).filter(models.Course.has_lab == True).all()
        lab_rooms = self.db.query(models.Room).filter(models.Room.type == 'lab').all()
        
        if not lab_rooms and lab_courses:
            issues.append({
                "type": "no_labs",
                "severity": "error",
                "message": "Courses require labs but no lab rooms are available"
            })

        return issues
