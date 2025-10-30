import axios from 'axios';
import type { ApiResponse, Course, Department, Group, Issue, Lecturer, Room } from '../types';

const API_URL = '/api';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Accept'] = 'application/json';

// API Service object
export const apiService = {
  // Department Endpoints
  departments: {
    getAll: () => axios.get<ApiResponse<Department[]>>('/departments'),
    getStats: (code: string) => axios.get<ApiResponse<any>>(`/departments/${code}/stats`),
    validate: (code: string) => axios.post<ApiResponse<any>>(`/departments/${code}/validate`),
  },

  // Course Endpoints
  courses: {
    getAll: (department?: string) => axios.get<ApiResponse<Course[]>>('/entities/courses', { params: { department } }),
    getOne: (id: number) => axios.get<ApiResponse<Course>>(`/entities/courses/${id}`),
    create: (data: Partial<Course>) => axios.post<ApiResponse<Course>>('/entities/courses', data),
    update: (id: number, data: Partial<Course>) => axios.put<ApiResponse<Course>>(`/entities/courses/${id}`, data),
    delete: (id: number) => axios.delete<ApiResponse<void>>(`/entities/courses/${id}`),
  },

  // Group Endpoints
  groups: {
    getAll: (department?: string) => axios.get<ApiResponse<Group[]>>('/entities/groups', { params: { department } }),
    getOne: (id: number) => axios.get<ApiResponse<Group>>(`/entities/groups/${id}`),
    create: (data: Partial<Group>) => axios.post<ApiResponse<Group>>('/entities/groups', data),
    update: (id: number, data: Partial<Group>) => axios.put<ApiResponse<Group>>(`/entities/groups/${id}`, data),
    delete: (id: number) => axios.delete<ApiResponse<void>>(`/entities/groups/${id}`),
  },

  // Lecturer Endpoints
  lecturers: {
    getAll: (department?: string) => axios.get<ApiResponse<Lecturer[]>>('/entities/lecturers', { params: { department } }),
    getOne: (id: number) => axios.get<ApiResponse<Lecturer>>(`/entities/lecturers/${id}`),
    create: (data: Partial<Lecturer>) => axios.post<ApiResponse<Lecturer>>('/entities/lecturers', data),
    update: (id: number, data: Partial<Lecturer>) => axios.put<ApiResponse<Lecturer>>(`/entities/lecturers/${id}`, data),
    delete: (id: number) => axios.delete<ApiResponse<void>>(`/entities/lecturers/${id}`),
  },

  // Room Endpoints
  rooms: {
    getAll: () => axios.get<ApiResponse<Room[]>>('/entities/rooms'),
    getOne: (id: number) => axios.get<ApiResponse<Room>>(`/entities/rooms/${id}`),
    create: (data: Partial<Room>) => axios.post<ApiResponse<Room>>('/entities/rooms', data),
    update: (id: number, data: Partial<Room>) => axios.put<ApiResponse<Room>>(`/entities/rooms/${id}`, data),
    delete: (id: number) => axios.delete<ApiResponse<void>>(`/entities/rooms/${id}`),
  },

  // Issue Endpoints
  issues: {
    getAll: (params?: { department?: string; status?: string; severity?: string }) => 
      axios.get<ApiResponse<Issue[]>>('/issues', { params }),
    getOne: (id: number) => axios.get<ApiResponse<Issue>>(`/issues/${id}`),
    assign: (id: number, userId: number) => axios.post<ApiResponse<Issue>>(`/issues/${id}/assign`, { user_id: userId }),
    updateStatus: (id: number, status: string) => axios.post<ApiResponse<Issue>>(`/issues/${id}/status`, { status }),
  },

  // Timetable Endpoints
  timetable: {
    generate: () => axios.post<ApiResponse<any>>('/timetable/generate'),
    getStatus: () => axios.get<ApiResponse<any>>('/timetable/status'),
    getCurrent: () => axios.get<ApiResponse<any>>('/timetable/current'),
    getDepartment: (department: string) => axios.get<ApiResponse<any>>(`/timetable/department/${department}`),
  },

  // Global Stats Endpoints
  stats: {
    global: () => axios.get<ApiResponse<any>>('/stats/global'),
    department: (code: string) => axios.get<ApiResponse<any>>(`/stats/department/${code}`),
  },
};
