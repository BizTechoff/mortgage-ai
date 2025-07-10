// src/app/service/operator.service.ts (or wherever you place client services)

import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs'; // Import 'from' for converting Promise to Observable
import { OperatorController } from '../../shared/controller/operator.controller';
import { MortgageRequest } from '../../shared/entity/request.entity';
import { RequestStatus } from '../../shared/enum/request-status.enum';
import { UserController } from '../../shared/controller/user.controller';
import { User } from '../../shared/entity/user.entity';

// Extend MortgageRequest to include currentStageDetails for client consumption
declare module '../../shared/entity/request.entity' {
    interface MortgageRequest {
        currentStageDetails?: import('../../shared/entity/request-stage.entity').MortgageRequestStage | null;
    }
}

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor() { }

    /**
     * Updates the status of a MortgageRequest and advances/completes its stage on the server.
     * @param requestId The ID of the request to update.
     * @param newStatus The new RequestStatus to set for the request.
     * @param currentStageId The ID of the current MortgageRequestStage being completed (optional).
     * @returns An Observable of the updated MortgageRequest.
     */
    getOperators(): Observable<User[]> {
        // Call the static BackendMethod from the controller
        return from(UserController.getOperators());
    }

}
