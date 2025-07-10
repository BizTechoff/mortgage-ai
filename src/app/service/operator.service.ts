// src/app/service/operator.service.ts (or wherever you place client services)

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs'; // Import 'from' for converting Promise to Observable
import { OperatorController } from '../../shared/controller/operator.controller';
import { MortgageRequest } from '../../shared/entity/request.entity';
import { RequestStatus } from '../../shared/enum/request-status.enum';

// Extend MortgageRequest to include currentStageDetails for client consumption
declare module '../../shared/entity/request.entity' {
    interface MortgageRequest {
        currentStageDetails?: import('../../shared/entity/request-stage.entity').MortgageRequestStage | null;
    }
}

@Injectable({
    providedIn: 'root'
})
export class OperatorService {

    constructor() { }

    /**
     * Updates the status of a MortgageRequest and advances/completes its stage on the server.
     * @param requestId The ID of the request to update.
     * @param newStatus The new RequestStatus to set for the request.
     * @param currentStageId The ID of the current MortgageRequestStage being completed (optional).
     * @returns An Observable of the updated MortgageRequest.
     */
    updateRequestStatusAndStage(requestId: string, newStatus: RequestStatus, currentStageId?: string): Observable<MortgageRequest> {
        // Call the static BackendMethod from the controller
        return from(OperatorController.updateRequestStatusAndStage(requestId, newStatus, currentStageId));
    }

    /**
     * Retrieves a list of requests with their current stages from the server.
     * @returns An Observable of an array of MortgageRequests.
     */
    getRequestsWithStages(): Observable<MortgageRequest[]> {
        // Call the static BackendMethod from the controller
        return from(OperatorController.getRequestsWithStages());
    }

    /**
     * Assigns an operator to a specific request on the server.
     * @param requestId The ID of the request to assign.
     * @param operatorId The ID of the operator to assign.
     * @returns An Observable of the updated MortgageRequest.
     */
    assignRequestToOperator(requestId: string, operatorId: string): Observable<MortgageRequest> {
        return from(OperatorController.forwardRequestToOperator(requestId, operatorId));
    }

    // You might add other client-side methods here to facilitate UI interactions
}
