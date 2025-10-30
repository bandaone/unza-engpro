import axios from 'axios';
import type { Course, Group, Lecturer, Room, Department, ApiResponse, DepartmentStats, GlobalStats, Issue, TimetableStatus, TimetableEvent } from '../types';

export const api = axios.create({
  baseURL: '', // The /api prefix is already added by the backend
});

async function unwrap<T>(p: Promise<import('axios').AxiosResponse<ApiResponse<T>>>) {
  const res = await p;
  // prefer res.data.data if present, else res.data
  // @ts-ignore
  return (res.data && (res.data as any).data !== undefined) ? (res.data as any).data : res.data;
}

export const apiService = {
  courses: {
    getAll: async () => await unwrap(api.get<ApiResponse<Course[]>>('/courses')),
    create: async (data: Partial<Course>) => await unwrap(api.post<ApiResponse<Course>>('/courses', data)),
    update: async (id: number, data: Partial<Course>) => await unwrap(api.put<ApiResponse<Course>>(`/courses/${id}`, data)),
    delete: async (id: number) => await unwrap(api.delete<ApiResponse<void>>(`/courses/${id}`)),
  },
  groups: {
    getAll: async () => await unwrap(api.get<ApiResponse<Group[]>>('/groups')),
    create: async (data: Partial<Group>) => await unwrap(api.post<ApiResponse<Group>>('/groups', data)),
    update: async (id: number, data: Partial<Group>) => await unwrap(api.put<ApiResponse<Group>>(`/groups/${id}`, data)),
    delete: async (id: number) => await unwrap(api.delete<ApiResponse<void>>(`/groups/${id}`)),
  },
  lecturers: {
    getAll: async () => await unwrap(api.get<ApiResponse<Lecturer[]>>('/lecturers')),
    create: async (data: Partial<Lecturer>) => await unwrap(api.post<ApiResponse<Lecturer>>('/lecturers', data)),
    update: async (id: number, data: Partial<Lecturer>) => await unwrap(api.put<ApiResponse<Lecturer>>(`/lecturers/${id}`, data)),
    delete: async (id: number) => await unwrap(api.delete<ApiResponse<void>>(`/lecturers/${id}`)),
  },
  rooms: {
    getAll: async () => await unwrap(api.get<ApiResponse<Room[]>>('/rooms')),
    create: async (data: Partial<Room>) => await unwrap(api.post<ApiResponse<Room>>('/rooms', data)),
    update: async (id: number, data: Partial<Room>) => await unwrap(api.put<ApiResponse<Room>>(`/rooms/${id}`, data)),
    delete: async (id: number) => await unwrap(api.delete<ApiResponse<void>>(`/rooms/${id}`)),
  },
  departments: {
    getAll: async () => await unwrap(api.get<ApiResponse<Department[]>>('/departments')),
    getStats: async (code: string) => await unwrap(api.get<ApiResponse<DepartmentStats>>(`/departments/${code}/stats`)),
    validate: async (code: string) => await unwrap(api.get<ApiResponse<Issue[]>>(`/departments/${code}/validate`)),
  },
  stats: {
    getGlobal: async () => await unwrap(api.get<ApiResponse<GlobalStats>>('/stats/global')),
    getGlobalIssues: async () => await unwrap(api.get<ApiResponse<Issue[]>>('/stats/issues')),
  },
  timetable: {
    getGlobal: async () => await unwrap(api.get<ApiResponse<{ events: TimetableEvent[] }>>('/timetable/global')),
    getDepartment: async (department: string) => await unwrap(api.get<ApiResponse<{ events: TimetableEvent[] }>>(`/timetable/department/${department}`)),
    generate: async () => await unwrap(api.post<ApiResponse<void>>('/timetable/generate')),
    getProgress: async () => await unwrap(api.get<ApiResponse<{ progress: number }>>('/timetable/progress')),
    getStatus: async () => await unwrap(api.get<ApiResponse<TimetableStatus>>('/timetable/status')),
    getValidation: async () => await unwrap(api.get<ApiResponse<Issue[]>>('/timetable/validation')),
  },
};