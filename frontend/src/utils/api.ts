import { ApiResponse } from '../types';

export function transformResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  return response.data;
}

export function transformArrayResponse<T>(response: ApiResponse<T[]>): T[] {
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  return response.data || [];
}