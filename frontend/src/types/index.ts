export interface User {
  id: number;
  username: string;
  role: 'coordinator' | 'hod' | 'delegate';
  department?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Issue {
  id: number;
  message: string;
  severity: 'error' | 'warning';  // Removed 'info' as it's not used
  department?: string;
  status: 'open' | 'assigned' | 'resolved';
  createdAt: string;
  updatedAt: string;
  type: string;
}

export interface Department {
  code: string;
  name: string;
  validation_status?: 'valid' | 'warning' | 'error';
  issues_count?: number;
  courses_count?: number;
  groups_count?: number;
  lecturers_count?: number;
}

export interface Course {
  id: number;  // Changed from optional to required for TimetableEvent usage
  code: string;
  name: string;
  department: string;
  weekly_hours: number;
  has_lab: boolean;
  lab_weekly_hours?: number;
  lecturers: number[];
  groups: number[];
  requirements?: {
    equipment: string[];
    room_type: string;
    capacity: number;
  };
}

export interface Group {
  id: number;  // Changed from optional to required for TimetableEvent usage
  name: string;
  department: string;
  capacity: number;
  courses: number[];
}

export interface LecturerPreferences {
  preferredDays?: number[];
  preferredSlots?: number[];
  preferredRooms?: number[];
  avoidDays?: number[];
  avoidSlots?: number[];
}

export interface Lecturer {
  id: number;  // Changed from optional to required for TimetableEvent usage
  name: string;
  email?: string;
  department: string;
  courses?: number[];
  preferences?: LecturerPreferences;
  expertise?: string[];
  availability?: {
    day: number;
    slots: number[];
  }[];
}

export interface Room {
  id: number;  // Changed from optional to required for TimetableEvent usage
  name: string;
  capacity: number;
  type: 'classroom' | 'lab' | 'special';
  equipment: string[];
}

export interface DepartmentStats {
  coursesCount: number;
  groupsCount: number;
  lecturersCount: number;
  validationStatus: {
    courses: boolean;
    groups: boolean;
    lecturers: boolean;
    labs: boolean;
  };
}

export interface GlobalStats {
  roomsCount: number;
  departmentsCount: number;
  timetableStatus: 'Not Generated' | 'In Progress' | 'Generated' | 'Failed';
  resourceUtilization: {
    rooms: number;
    labs: number;
    equipment: number;
  };
  issues: Issue[];
}

export interface TimetableEvent {
  id: number;  // Changed from string to number to match component expectation
  title: string;
  start: string;
  end: string;
  courseId: number;
  lecturerId: number;
  groupId: number;
  roomId: number;
  type: 'lecture' | 'lab' | 'practical';
  department: string;
  course: Course;
  room: Room;
  group: Group;
  lecturer: Lecturer;
  day: string;  // Changed from number to string to match component expectation
}

export interface TimetableStatus {
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  message?: string;
  stats?: {
    roomUtilization: number;
    constraintsSatisfied: number;
  };
}
