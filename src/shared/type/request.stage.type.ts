// src/shared/type/stage.type.ts  (קובץ חדש או קיים להגדרות סוגים)

import { Stage } from '../entity/stage.entity';
import { MortgageRequestStage } from '../entity/request-stage.entity';
import { User } from '../entity/user.entity'; // אם צריך עבור GetRequestsByMobileResponse
import { MortgageRequest } from '../entity/request.entity';

// ממשק בסיסי לתגובה מאוחדת
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    timestamp: number;
}

// דוגמאות לממשקים ספציפיים אם הם לא קיימים אצלך
// אם יש לך כבר GetRequestsByMobileResponse, השתמש בהם.
export interface GetRequestsByMobileResponse {
    success: boolean;
    data: {
        customer?: User;
        requests: MortgageRequest[];
    };
    error?: {
        code: string;
        message: string;
    };
    timestamp: number;
}

export interface StageStatisticsResponse {
    totalStages: number;
    completedStages: number;
    pendingStages: number;
    overdueStages: number;
    avgDaysPerStage: number;
    totalDaysElapsed: number;
    estimatedCompletionDate: Date | null;
}

export interface StageDurationStatisticsResponse {
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    completedCount: number;
}

export interface StageHistoryItem {
    stage: Stage;
    MortgageRequestStage: MortgageRequestStage; // Note: Original service had MortgageRequestStage, check if it's supposed to be actual entity
    duration: number;
    status: 'completed' | 'in-progress' | 'pending' | 'overdue';
}

export interface BottleneckAnalysisItem {
    stage: Stage;
    avgDuration: number;
    completedCount: number;
    impact: 'high' | 'medium' | 'low';
}