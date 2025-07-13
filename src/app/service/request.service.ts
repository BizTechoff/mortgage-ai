import { Injectable } from "@angular/core";
import { remult } from "remult";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { RequestController } from "../../shared/controller/request.controller";
import { MortgageRequest } from "../../shared/entity/request.entity";
import { RequestStatus } from "../../shared/enum/request-status.enum";
import { AssignOperatorRequest, UpdateStageProgressPayload } from "../../shared/type/request.type";

@Injectable({
    providedIn: 'root'
})
export class RequestService {

    /**
     * Creates a new MortgageRequest or updates an existing one based on the presence of an ID.
     * Handles both draft saving and final submission based on the 'isFinalSubmission' flag.
     * @param requestData Partial data for the MortgageRequest.
     * @param isFinalSubmission True if this is the final submission, false if it's a draft save.
     * @returns The created or updated MortgageRequest.
     */
    async createOrUpdate(requestData: Partial<MortgageRequest>, isFinalSubmission: boolean = false): Promise<MortgageRequest> {
        let request: MortgageRequest = undefined!
        let requestRepo = remult.repo(MortgageRequest)

        if (requestData.id) {
            // אם קיים ID, ננסה לעדכן בקשה קיימת
            request = (await requestRepo.findId(requestData.id))!;
            if (!request) {
                throw new Error('Request not found for update.');
            }
            Object.assign(request, requestData); // עדכן את כל השדות מה-requestData
            request.updatedAt = new Date();
        } else {
            // אם אין ID, ניצור בקשה חדשה
            request = requestRepo.create(requestData);
            request.createdAt = new Date();
            request.updatedAt = new Date();
        }

        // קביעת סטטוס בהתאם לסוג השמירה (טיוטה או הגשה סופית)
        if (isFinalSubmission) {
            request.status = RequestStatus.WAITING_FOR_SELECTION; // סטטוס לבקשה שהוגשה סופית
        } else if (!request.id || request.status.id === RequestStatus.NEW.id) {
            // אם זה יצירה חדשה או עדכון של טיוטה ראשונית, שמור כ-NEW (טיוטה)
            request.status = RequestStatus.NEW;
        }
        // אם הבקשה כבר עברה סטטוסים מתקדמים יותר (לדוגמה, ASSIGNED), לא נדרוס את הסטטוס ב-false ל-isFinalSubmission.

        const savedRequest = await requestRepo.save(request);
        console.log(`Request ${isFinalSubmission ? 'submitted' : 'draft saved'}: ${savedRequest.id}`);
        return savedRequest;
    }

    static create(data: Partial<MortgageRequest>): Observable<MortgageRequest> {
        // console.log('RequestService: data.questionnaireData', data.questionnaireData)
        return from(RequestController.create(data)).pipe(
            map(response => {
                console.log(response, JSON.stringify(response))
                return response.success && response.data
                    ? response.data as MortgageRequest
                    : {} as MortgageRequest
            }
            ),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    static update(requestId: string, updatedFields: Partial<MortgageRequest>, newStatus?: RequestStatus) {
        return from(RequestController.update(requestId, updatedFields, newStatus));
    }

    static updateStatus(requestId: string, newStatus?: RequestStatus) {
        return from(RequestController.updateStatus(requestId, newStatus));
    }

    static getRequests(): Observable<MortgageRequest[]> {
        return from(RequestController.getRequests()).pipe(
            map(response => response.success && response.data
                ? response.data as MortgageRequest[]
                : [] as MortgageRequest[]
            ),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    static assignOperator(req: AssignOperatorRequest): Observable<MortgageRequest> {
                console.log('assignOperator.AssignOperatorRequest', req)
        return from(RequestController.assignOperator(req)).pipe(
            map(response => {
                console.log('assignOperator.response', response.success, response.error)
                return response.success && response.data
                    ? response.data as MortgageRequest
                    : {} as MortgageRequest
            }),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    static updateStageProgress(req: UpdateStageProgressPayload): Observable<MortgageRequest> {
        return from(RequestController.updateStageProgress(req)).pipe(
            map(response => response.success && response.data
                ? response.data as MortgageRequest
                : {} as MortgageRequest
            ),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

}
