import { ApiResponse } from './index';

// React Query result types
export type QueryResult<T> = {
  data: T;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
};

// API response wrapper type
export type ApiQueryResponse<T> = ApiResponse<T> & {
  data: T;
};

// Collection response types
export type CollectionResponse<T> = {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};