export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total: number;
}
