from typing import List, Dict, Any
import json
from datetime import datetime, time
from sqlalchemy.orm import Session
from ..models import TimeSlot, Room, Course, Lecturer, StudentGroup
from ortools.sat.python import cp_model
import logging

logger = logging.getLogger(__name__)

class TimetableGenerator:
    def __init__(self, db: Session):
        self.db = db
        self.status_file = "timetable_status.json"
        self.time_slots = [
            (8, 0),   # 8:00 AM
            (9, 30),  # 9:30 AM
            (11, 0),  # 11:00 AM
            (12, 30), # 12:30 PM
            (14, 0),  # 2:00 PM
            (15, 30), # 3:30 PM
            (17, 0)   # 5:00 PM
        ]
        self.days = range(1, 6)  # Monday to Friday

    def _save_status(self, status: Dict[str, Any]):
        with open(self.status_file, 'w') as f:
            json.dump(status, f)

    def get_status(self) -> Dict[str, Any]:
        try:
            with open(self.status_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"status": "not_started"}

    def generate(self):
        try:
            self._save_status({"status": "running", "progress": 0})
            
            # Fetch all required data
            courses = self.db.query(Course).all()
            rooms = self.db.query(Room).all()
            lecturers = self.db.query(Lecturer).all()
            groups = self.db.query(StudentGroup).all()

            # Create the CP-SAT model
            model = cp_model.CpModel()
            
            # Create variables
            slots = {}
            for course in courses:
                for day in self.days:
                    for time_idx, _ in enumerate(self.time_slots[:-1]):  # Last slot can't start a course
                        for room in rooms:
                            slot_key = (course.id, day, time_idx, room.id)
                            slots[slot_key] = model.NewBoolVar(f'slot_{slot_key}')

            # Add constraints
            self._add_basic_constraints(model, slots, courses, rooms)
            self._add_room_constraints(model, slots, courses, rooms)
            self._add_lecturer_constraints(model, slots, courses, lecturers)
            self._add_group_constraints(model, slots, courses, groups)

            self._save_status({"status": "running", "progress": 50})

            # Solve the model
            solver = cp_model.CpSolver()
            status = solver.Solve(model)

            if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
                # Clear existing schedule
                self.db.query(TimeSlot).delete()
                
                # Create new schedule
                for slot_key, var in slots.items():
                    if solver.Value(var) == 1:
                        course_id, day, time_idx, room_id = slot_key
                        start_hour, start_minute = self.time_slots[time_idx]
                        end_hour, end_minute = self.time_slots[time_idx + 1]
                        
                        time_slot = TimeSlot(
                            course_id=course_id,
                            room_id=room_id,
                            day=day,
                            start_time=time(start_hour, start_minute),
                            end_time=time(end_hour, end_minute)
                        )
                        self.db.add(time_slot)
                
                self.db.commit()
                self._save_status({
                    "status": "completed",
                    "timestamp": datetime.now().isoformat(),
                    "stats": self._calculate_stats()
                })
            else:
                self._save_status({
                    "status": "failed",
                    "error": "No feasible solution found",
                    "timestamp": datetime.now().isoformat()
                })
        
        except Exception as e:
            logger.exception("Timetable generation failed")
            self._save_status({
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })

    def _add_basic_constraints(self, model, slots, courses, rooms):
        # Each course must be scheduled exactly once
        for course in courses:
            course_vars = []
            for day in self.days:
                for time_idx, _ in enumerate(self.time_slots[:-1]):
                    for room in rooms:
                        course_vars.append(slots[(course.id, day, time_idx, room.id)])
            model.Add(sum(course_vars) == 1)

    def _add_room_constraints(self, model, slots, courses, rooms):
        # Rooms can't be double-booked
        for day in self.days:
            for time_idx, _ in enumerate(self.time_slots[:-1]):
                for room in rooms:
                    room_vars = []
                    for course in courses:
                        room_vars.append(slots[(course.id, day, time_idx, room.id)])
                    model.Add(sum(room_vars) <= 1)

    def _add_lecturer_constraints(self, model, slots, courses, lecturers):
        # Lecturers can't be in two places at once
        for day in self.days:
            for time_idx, _ in enumerate(self.time_slots[:-1]):
                for lecturer in lecturers:
                    lecturer_vars = []
                    for course in courses:
                        if lecturer in course.lecturers:
                            for room in rooms:
                                lecturer_vars.append(slots[(course.id, day, time_idx, room.id)])
                    model.Add(sum(lecturer_vars) <= 1)

    def _add_group_constraints(self, model, slots, courses, groups):
        # Groups can't be in two places at once
        for day in self.days:
            for time_idx, _ in enumerate(self.time_slots[:-1]):
                for group in groups:
                    group_vars = []
                    for course in courses:
                        if group in course.groups:
                            for room in rooms:
                                group_vars.append(slots[(course.id, day, time_idx, room.id)])
                    model.Add(sum(group_vars) <= 1)

    def _calculate_stats(self) -> Dict[str, Any]:
        total_slots = len(self.days) * (len(self.time_slots) - 1)
        rooms = self.db.query(Room).all()
        time_slots = self.db.query(TimeSlot).all()
        
        used_slots = len(time_slots)
        total_available = total_slots * len(rooms)
        
        return {
            "roomUtilization": round((used_slots / total_available) * 100, 2),
            "totalScheduledCourses": len(set(slot.course_id for slot in time_slots)),
            "totalTimeSlots": used_slots
        }
