import { MortgageRequestStage } from "../entity/request-stage.entity";
import { MortgageRequest } from "../entity/request.entity";
import { User } from "../entity/user.entity";
import { RequestStatus } from "../enum/request-status.enum";

export interface GetRequestsResponse {
    success: boolean,
    data: MortgageRequest[],
    timestamp: number,
    error: { code: number, message: string },
}

export interface CreateRequestResponse {
    success: boolean,
    data: MortgageRequest,
    timestamp: number,
    error: { code: number, message: string },
}


export interface GetRequestsByMobileRequest {
    mobile: string;
}

export interface GetRequestsByMobileResponse {
    success: boolean,
    error?: { code: string, message: string },
    data: { customer: User, requests: MortgageRequest[] },
    timestamp: number
}

export interface AssignOperatorRequest {
    /**
     * The unique identifier of the mortgage request to assign.
     */
    requestId: string;
    /**
     * The unique identifier of the operator (User) to assign to the request.
     */
    operatorId: string;
}

export interface AssignOperatorResponse {
    /**
     * Indicates whether the operation was successful.
     */
    success: boolean;
    /**
     * An optional message, typically used to provide feedback or error details.
     */
    error: { code: number, message: string },
    /**
     * The updated MortgageRequest entity after the operator has been assigned.
     */
    data: MortgageRequest;
    timestamp: number;
}


// הגדרת טיפוס עבור תגובת עדכון - כמו שהגדרתי בתשובה הקודמת, אם לא קיימת
export interface UpdateRequestResponse {
    success: boolean;
    data?: MortgageRequest;
    error?: { code: number; message: string; };
    timestamp: number;
}

// הגדרת טיפוס עבור קלט ופלט המתודה החדשה
export interface UpdateStageProgressPayload {
    requestId: string;
    currentStageEntryId?: string; // ה-ID של רשומת השלב הנוכחית בטבלת MortgageRequestStage
    // statusToChangeTo?: RequestStatus; // אופציונלי: אם פעולה זו גם משנה סטטוס ראשי (לדוגמה, ל-COMPLETED/REJECTED)
    stageNotes?: string; // הערות ספציפיות לשלב זה
    markStageAsCompleted?: boolean; // האם לסמן את השלב הנוכחי כהושלם
    // ניתן להוסיף nextStageId: string; אם בוחרים את השלב הבא באופן ידני
}

export interface UpdateStageProgressResponse {
    success: boolean;
    data?: MortgageRequest;
    error?: { code: number; message: string; };
    timestamp: number;
    newStageStarted?: MortgageRequestStage; // מידע על השלב החדש שהתחיל
}

