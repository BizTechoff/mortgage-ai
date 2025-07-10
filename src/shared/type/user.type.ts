// src/shared/type/auth.interface.ts or similar
import { User } from '../entity/user.entity'; // Ensure User entity is imported

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
}

export interface LoginRequest {
    mobile: string;//unique
    password?: string; // Assuming password might be optional if using SMS verification later
    code?: string; // For SMS verification
}

export interface LoginResponse extends ApiResponse<{ token: string; user: User }> {
    // success, error, timestamp from ApiResponse
}

export interface AuthResponse extends ApiResponse<{ token: string; user: User }> {
    // success, error, timestamp from ApiResponse
}

export interface VerifyPhoneResponse extends ApiResponse<{ message: string }> {
    // success, error, timestamp from ApiResponse
}

export interface VerifyCodeResponse extends AuthResponse {
    // This is essentially an AuthResponse, so extending it is fine.
}

export interface UpdatePasswordRequest {
    oldPassword?: string; // Optional if admin is resetting, required for user change
    newPassword: string;
}

export interface UserStatisticsResponse {
    totalRequests: number;
    activeRequests: number;
    completedRequests: number;
    avgProcessingTime: number;
    successRate: number;
}

export interface OperatorWorkloadResponse {
    totalAssigned: number;
    inProgress: number;
    completed: number;
    overdue: number;
    avgDaysPerRequest: number;
}

export interface IsOptedOutResponse extends ApiResponse<{ optedOut: boolean }> {
    // success, error, timestamp from ApiResponse
}

// UserRole enum is used directly by the client, ensure it's also imported/defined.
// Assuming your User entity has boolean flags like `admin`, `manager`, `operator`, `customer`.
