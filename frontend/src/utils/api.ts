import { ApiResponse } from '../types';
import { convertSnakeToCamel } from './caseConversion';

export function transformResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  return convertSnakeToCamel(response.data);
}

export function transformArrayResponse<T>(response: ApiResponse<T[]>): T[] {
  if (!response.success) {
    throw new Error(response.message || 'API request failed');
  }
  return convertSnakeToCamel(response.data || []);
}