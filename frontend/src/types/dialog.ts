import { Course, Group, Lecturer } from './index';

// Input types (for creation/update)
export type CourseInput = Partial<Course>;
export type GroupInput = Partial<Group>;
export type LecturerInput = Partial<Lecturer>;

// Dialog prop types
export interface DialogProps<T> {
  open: boolean;
  onClose: () => void;
  onSave: (data: T) => Promise<void>;
}

export interface CourseDialogProps extends DialogProps<CourseInput> {
  course: Course | null;
  department: string;
  lecturers: Lecturer[];
  groups: Group[];
}

export interface GroupDialogProps extends DialogProps<GroupInput> {
  group: Group | null;
  department: string;
}

export interface LecturerDialogProps extends DialogProps<LecturerInput> {
  lecturer: Lecturer | null;
  department: string;
}