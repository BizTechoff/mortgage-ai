// src/shared/controllers/operator.controller.ts

import { BackendMethod, Controller, ControllerBase, remult } from 'remult';
import { MortgageRequestStage } from '../entity/request-stage.entity';
import { MortgageRequest } from '../entity/request.entity';
import { Stage } from '../entity/stage.entity';
import { User } from '../entity/user.entity'; // Assuming User entity is accessible
import { RequestStatus } from '../enum/request-status.enum';

@Controller('operator') // Define the API path for this controller
export class OperatorController extends ControllerBase {

    /**
     * Updates the status of a MortgageRequest and advances/completes its stage.
     * This method will also create the next stage entry if applicable.
     * @param requestId The ID of the request to update.
     * @param newStatus The new RequestStatus to set for the request.
     * @param currentStageId The ID of the current MortgageRequestStage being completed.
     * @returns The updated MortgageRequest.
     */
    @BackendMethod({ allowed: true /* TODO: Add specific roles like Roles.operator, Roles.manager, Roles.admin */ })
    static async updateRequestStatusAndStage(
        requestId: string,
        newStatus: RequestStatus,
        currentStageId?: string // Optional: if completing a specific stage entry
    ): Promise<MortgageRequest> {
        const requestRepo = remult.repo(MortgageRequest);
        const stageRepo = remult.repo(Stage);
        const requestStageRepo = remult.repo(MortgageRequestStage);

        const request = await requestRepo.findId(requestId);
        if (!request) {
            throw new Error('Request not found.');
        }

        // 1. Update the request status
        request.status = newStatus;
        await requestRepo.save(request);

        // 2. Handle the MortgageRequestStage progression
        // let currentRequestStage: MortgageRequestStage | null = null;

        // if (currentStageId) {
        //     currentRequestStage = await requestStageRepo.findId(currentStageId) ?? undefined!;;
        //     if (!currentRequestStage || currentRequestStage.request.id !== requestId) {
        //         // Should not happen if UI provides correct ID, but good to check
        //         console.warn(`Current stage ID ${currentStageId} not found or does not match request ${requestId}.`);
        //         currentRequestStage = null; // Re-evaluate or find the latest active one
        //     }
        // }

        // // If no specific currentStageId was provided or found, find the latest active one for this request
        // if (!currentRequestStage || currentRequestStage.done) { // Also check if it's already marked as done
        //     currentRequestStage = await requestStageRepo.findFirst(
        //         { request: request, done: undefined! }, // Find an active (not done) stage for this request
        //         { orderBy: { started: 'desc' } }
        //     ) ?? undefined!;
        // }

        // // Mark the current stage as done
        // if (currentRequestStage && !currentRequestStage.done) {
        //     currentRequestStage.done = new Date(); // Mark current stage as completed
        //     await requestStageRepo.save(currentRequestStage);
        //     console.log(`Stage ${currentRequestStage.stage.desc} for request ${request.id} marked as done.`);
        // }

        // // 3. Create the next stage entry (if not a final status)
        // if (!RequestStatus.isCompletedStatus(newStatus)) { // Assuming isCompletedStatus correctly identifies final states
        //     const currentServiceType = request.requestType; // Get the service type of the request
        //     const nextStageOrder = (currentRequestStage ? currentRequestStage.stage.seq + 1 : 0); // Next sequence number

        //     // Find the next stage in the workflow for this service type
        //     const nextStage = await stageRepo.findFirst(
        //         { requestType: currentServiceType, seq: nextStageOrder },
        //         { orderBy: { seq: 'asc' } } // Ensure we get the correct next one
        //     );

        //     if (nextStage) {
        //         const newRequestStage = requestStageRepo.create({
        //             request: request,
        //             stage: nextStage,
        //             started: new Date(),
        //             untill: new Date(new Date().setDate(new Date().getDate() + nextStage.days)) // Calculate untill date
        //         });
        //         await requestStageRepo.save(newRequestStage);
        //         console.log(`Request ${request.id} moved to next stage: ${nextStage.desc}`);
        //     } else {
        //         console.log(`No next stage found for service type ${currentServiceType.caption} after sequence ${nextStageOrder}.`);
        //         // This might indicate the end of a non-final workflow branch
        //     }
        // } else {
        //     console.log(`Request ${request.id} reached a final status: ${newStatus.caption}. No further stages.`);
        // }

        return request; // Return the updated request
    }

    /**
     * Retrieves a list of requests and their current stages.
     * Can filter by assigned operator or return all for admin/manager.
     * @returns An array of MortgageRequests, with relevant stage information.
     */
    @BackendMethod({ allowed: true /* TODO: Add specific roles like Roles.operator, Roles.manager, Roles.admin, Roles.customer */ })
    static async getRequestsWithStages(): Promise<MortgageRequest[]> {
        const requestRepo = remult.repo(MortgageRequest);
        const requestStageRepo = remult.repo(MortgageRequestStage);

        let filter: any = {};
        // TODO: Implement actual role-based filtering
        // Example: If remult.isAllowed(Roles.operator), filter by assignedOperatorId
        // if (remult.isAllowed(Roles.operator) && !remult.isAllowed(Roles.admin) && remult.user?.id) {
        //     filter.assignedOperatorId = remult.user.id;
        // }

        const requests = await requestRepo.find({
            where: filter,
            include: { customer: true, assignedOperator: true }, // Include related entities
            orderBy: { createdAt: 'desc' }
        });

        // For each request, fetch its latest active stage
        for (const request of requests) {
            const currentStage = await requestStageRepo.findFirst(
                { request: request, done: undefined! }, // Find active stage
                { orderBy: { started: 'desc' }, include: { stage: true } } // Include Stage definition
            );
            // Attach the currentStage object directly to the request for easier client consumption
            (request as any).currentStageDetails = currentStage;
        }

        return requests;
    }

    /**
     * Assigns an operator to a specific request.
     * @param requestId The ID of the request to assign.
     * @param operatorId The ID of the operator to assign.
     * @returns The updated MortgageRequest.
     */
    @BackendMethod({ allowed: true /* TODO: Add specific roles like Roles.manager, Roles.admin */ })
    static async forwardRequestToOperator(requestId: string, operatorId: string): Promise<MortgageRequest> {
        const requestRepo = remult.repo(MortgageRequest);
        const userRepo = remult.repo(User); // To verify operator exists

        const request = await requestRepo.findId(requestId);
        if (!request) {
            throw new Error('Request not found.');
        }
        if (request.assignedOperatorId) {
            if (request.assignedOperatorId === operatorId) {
                throw new Error('Assigned user is already the current operator.');
            }
        }

        const operator = await userRepo.findId(operatorId);
        if (!operator || !operator.operator) { // Assuming User has an 'operator' boolean field
            throw new Error('Assigned user is not a valid operator.');
        }

        request.assignedOperatorId = operatorId;
        // Optionally update status to indicate it's assigned
        if (request.status.id === RequestStatus.NEW.id || request.status.id === RequestStatus.WAITING_FOR_SELECTION.id) {
            request.status = RequestStatus.ASSIGNED; // Set status to ASSIGNED
        }

        return await requestRepo.save(request);
    }

    // You might add other methods here, e.g., for reporting stage metrics
}
