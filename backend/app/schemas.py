from typing import List, Optional, Dict, Any
from datetime import time, datetime
from pydantic import BaseModel, Field, ConfigDict

# Pydantic v2: use model_config = ConfigDict(from_attributes=True) for ORM objects

# -----------------
# Rooms
# -----------------
class RoomBase(BaseModel):
    name: str
    capacity: int
    building: Optional[str] = None
    furniture_type: Optional[str] = None
    equipment: Optional[List[str]] = None
    availability: Optional[Dict[str, List[List[str]]]] = None

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# -----------------
# Departments
# -----------------
class Department(BaseModel):
    code: str
    name: str
    validation_status: str = "valid"  # "valid" | "warning" | "error"
    issues_count: int = 0
    courses_count: int = 0

    model_config = ConfigDict(from_attributes=True)

# -----------------
# Courses
# -----------------
class CourseBase(BaseModel):
    code: str
    name: str
    # Lecture configuration
    weekly_hours: int
    session_minutes: int = 60
    requirements: Optional[Dict[str, Any]] = None
    # Mark course as project/capstone; projects are not scheduled into rooms (handled separately)
    is_project: bool = False
    # Lab configuration
    has_lab: bool = False
    lab_weekly_sessions: int = 0
    lab_session_minutes: int = 180
    lab_requirements: Optional[Dict[str, Any]] = None

class CourseCreate(CourseBase):
    group_ids: List[int] = []
    lecturer_ids: List[int] = []
    # Departments that share this course (e.g. ["AEN","CEE"]) for multi-dept shared courses
    shared_departments: List[str] = []
    # Years (2,3,4,5) to which the shared departments apply. If 2 is included, GEN second-year groups are attached.
    shared_years: List[int] = []
    # For 4–5 year specialization within departments (e.g., EEE minors), restrict to these tracks (e.g., ["ET","MP"]).
    target_tracks: List[str] = []
    # Primary department under which this course is created (optional). If provided and group_ids
    # is empty, groups from this department will be attached automatically.
    department: Optional[str] = None

class Course(CourseBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# -----------------
# Student Groups
# -----------------
class StudentGroupBase(BaseModel):
    name: str
    size: int
    year: Optional[int] = None
    department: Optional[str] = None
    lecture_group: Optional[str] = None
    subgroup: Optional[str] = None
    track: Optional[str] = None

class StudentGroupCreate(StudentGroupBase):
    pass

class StudentGroup(StudentGroupBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# -----------------
# Lecturers
# -----------------
from pydantic import EmailStr

class LecturerBase(BaseModel):
    name: str
    department: Optional[str] = None
    max_daily_load: Optional[int] = None
    availability: Optional[Dict[str, List[List[str]]]] = None
    email: Optional[EmailStr] = None  # Optional email field with validation

class LecturerCreate(LecturerBase):
    pass

class Lecturer(LecturerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# -----------------
# Lecturer Email Update
# -----------------
class UpdateLecturerEmail(BaseModel):
    email: EmailStr

# -----------------
# Departments
# -----------------
class Department(BaseModel):
    code: str
    name: str
    validation_status: str = 'valid'
    issues_count: int = 0
    courses_count: int = 0

# -----------------
# Versions
# -----------------
class VersionBase(BaseModel):
    name: str

class Version(VersionBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# -----------------
# Timetable Events
# -----------------
class TimetableEventBase(BaseModel):
    course_id: int
    room_id: int
    group_id: int
    lecturer_id: int
    day: str
    start: time
    end: time
    version_id: int

class TimetableEventCreate(TimetableEventBase):
    pass

class TimetableEvent(TimetableEventBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# -----------------
# DTOs
# -----------------
class GenerateRequest(BaseModel):
    version_name: str = Field(default="auto")

class MoveEventRequest(BaseModel):
    day: str
    start: time
    end: time
    room_id: int
