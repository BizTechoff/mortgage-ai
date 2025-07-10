// src/shared/types/api-response.interface.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;  // Timestamp in milliseconds
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filter?: Record<string, any>;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
  timestamp: number;  // Timestamp in milliseconds
  path?: string;
  method?: string;
}

export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  GONE = 'GONE'
}

export interface ApiErrorMap {
  [ApiErrorCode.UNAUTHORIZED]: {
    statusCode: 401;
    defaultMessage: 'Authentication required';
  };
  [ApiErrorCode.FORBIDDEN]: {
    statusCode: 403;
    defaultMessage: 'You do not have permission to perform this action';
  };
  [ApiErrorCode.NOT_FOUND]: {
    statusCode: 404;
    defaultMessage: 'Resource not found';
  };
  [ApiErrorCode.BAD_REQUEST]: {
    statusCode: 400;
    defaultMessage: 'Invalid request';
  };
  [ApiErrorCode.VALIDATION_ERROR]: {
    statusCode: 400;
    defaultMessage: 'Validation error';
  };
  [ApiErrorCode.INTERNAL_SERVER_ERROR]: {
    statusCode: 500;
    defaultMessage: 'An internal server error occurred';
  };
  [ApiErrorCode.SERVICE_UNAVAILABLE]: {
    statusCode: 503;
    defaultMessage: 'Service temporarily unavailable';
  };
  [ApiErrorCode.CONFLICT]: {
    statusCode: 409;
    defaultMessage: 'Conflict with the current state of the resource';
  };
  [ApiErrorCode.TOO_MANY_REQUESTS]: {
    statusCode: 429;
    defaultMessage: 'Too many requests';
  };
  [ApiErrorCode.GONE]: {
    statusCode: 410;
    defaultMessage: 'Resource is no longer available';
  };
}