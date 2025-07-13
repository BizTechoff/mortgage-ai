import { BackendMethod, Controller, ControllerBase, remult } from "remult";

import { MortgageRequestStage } from "../entity/request-stage.entity";
import { MortgageRequest } from "../entity/request.entity";
import { Stage } from "../entity/stage.entity";
import { User } from "../entity/user.entity";
import { RequestStatus } from "../enum/request-status.enum"; // <<< ודא ייבוא של RequestStatus
import { RequestType } from "../enum/request-type.enum"; // <<< ודא ייבוא של RequestType
import { Roles } from "../enum/roles";
import { AssignOperatorRequest, AssignOperatorResponse, CreateRequestResponse, GetRequestsResponse, UpdateRequestResponse, UpdateStageProgressPayload, UpdateStageProgressResponse } from "../type/request.type";


@Controller('request')
export class RequestController extends ControllerBase {

    // 1. מתודת CREATE - תשמש ליצירה ראשונית של טיוטה בלבד
    @BackendMethod({ allowed: true })
    static async create(data: Partial<MortgageRequest>): Promise<CreateRequestResponse> {
        const result: CreateRequestResponse = { success: false, data: {} as MortgageRequest, error: { code: 0, message: '' }, timestamp: Date.now() };
        const requestRepo = remult.repo(MortgageRequest);
        const requestStageRepo = remult.repo(MortgageRequestStage);
        const stageRepo = remult.repo(Stage);

        // data.requestNumber = Math.floor(Math.random() * 100000)
        data.createdAt = new Date();
        data.updatedAt = new Date(); // הוסף גם updatedAt
        // הגדר סטטוס התחלתי לטיוטה
        // לדוגמה, 'שאלון בתהליך'
        data.status = data.status || RequestStatus.QUESTIONNAIRE_IN_PROGRESS;

        try {
            const newRequest = await requestRepo.insert(data);
            result.data = newRequest;
            result.success = true;

            // --- יצירת השלב הראשון של הבקשה ---
            // console.log('requestTypeToUse.id BEFORE')
            // ודא ש-newRequest.requestType הוא אובייקט RequestType אם הוא לא נשלח ככזה
            const requestTypeToUse = RequestType.fromString(newRequest.requestType.id || newRequest.requestType as any);
            console.log('requestTypeToUse.id', requestTypeToUse.id)
            const firstStage = await stageRepo.findFirst(
                { requestType: requestTypeToUse, seq: 1 },
                { orderBy: { seq: "asc" } }
            );

            if (firstStage) {
                const newRequestStage = requestStageRepo.create({
                    request: newRequest,
                    stage: firstStage,
                    started: new Date(),
                    untill: new Date(new Date().setDate(new Date().getDate() + firstStage.days))
                });
                await requestStageRepo.save(newRequestStage);
                console.log(`Initial stage '${firstStage.desc}' created for new request ${newRequest.id}`);
            } else {
                console.warn(`No initial stage found for request type ${requestTypeToUse.caption}.`);
            }
            // --- סוף יצירת שלב ---

        } catch (error) {
            result.error.code = 500;
            result.error.message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('Error creating request:', error);
        }

        return result;
    }

    // 2. מתודת UPDATE - תשמש לעדכון טיוטה קיימת ולשינוי סטטוס סופי
    // היא מחליפה את updateRequestDetails הקודמת, ועם שם קצר יותר.
    @BackendMethod({ allowed: true }) // הרשאות מתאימות, אולי Roles.customer.id גם כן
    static async update(
        requestId: string,
        data: Partial<MortgageRequest>, // נתוני הטופס המעודכנים (חלקיים)
        newStatus?: RequestStatus // פרמטר אופציונלי לשינוי סטטוס סופי
    ): Promise<UpdateRequestResponse> {
        const result: UpdateRequestResponse = { success: false, error: { code: 0, message: '' }, timestamp: Date.now() };
        const requestRepo = remult.repo(MortgageRequest);
        console.log('SERVER: partialData.filled: ', data)
        console.log(`SERVER: newStatus`, `${newStatus?.id}`)

        try {
            const existingRequest = await requestRepo.findId(requestId);
            if (!existingRequest) {
                result.error!.code = 404;
                result.error!.message = 'Request not found.';
                return result;
            }

            // עדכון השדות - השתמש ב-Object.assign כדי לעדכן את כל השדות שנשלחו ב-data
            // זה יעדכן את כל השדות ששמותיהם זהים ב-data וב-existingRequest
            Object.assign(existingRequest, data);
            existingRequest.updatedAt = new Date(); // עדכן את תאריך העדכון

            // אם נשלח סטטוס חדש, עדכן אותו. זה ישמש לשינוי סטטוס מטיוטה לסטטוס סופי.
            if (newStatus) {
                existingRequest.status = newStatus;
            }

            // console.log(existingRequest.isNew(),'existingRequest.isNew')
            const updatedRequest = await requestRepo.save(existingRequest); // שמירת העדכונים
            result.data = updatedRequest;
            result.success = true;
            console.log('SAVED!')
        } catch (error) {
            result.error!.code = 500;
            result.error!.message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('Error updating request:', error);
        }

        return result;
    }

    // 2. מתודת UPDATE - תשמש לעדכון טיוטה קיימת ולשינוי סטטוס סופי
    // היא מחליפה את updateRequestDetails הקודמת, ועם שם קצר יותר.
    @BackendMethod({ allowed: true }) // הרשאות מתאימות, אולי Roles.customer.id גם כן
    static async updateStatus(
        requestId: string,
        newStatus?: RequestStatus // פרמטר אופציונלי לשינוי סטטוס סופי
    ): Promise<UpdateRequestResponse> {
        const result: UpdateRequestResponse = { success: false, error: { code: 0, message: '' }, timestamp: Date.now() };
        const requestRepo = remult.repo(MortgageRequest);

        try {
            const existingRequest = await requestRepo.findId(requestId);
            if (!existingRequest) {
                result.error!.code = 404;
                result.error!.message = 'Request not found.';
                return result;
            }

            // אם נשלח סטטוס חדש, עדכן אותו. זה ישמש לשינוי סטטוס מטיוטה לסטטוס סופי.
            if (newStatus) {
                existingRequest.status = newStatus;
                existingRequest.updatedAt = new Date(); // עדכן את תאריך העדכון
            }

            // console.log(existingRequest.isNew(),'existingRequest.isNew')
            result.data = await requestRepo.save(existingRequest); // שמירת העדכונים
            result.success = true;

        } catch (error) {
            result.error!.code = 500;
            result.error!.message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('Error updating request:', error);
        }

        return result;
    }


    @BackendMethod({ allowed: true })
    static async getRequests(): Promise<GetRequestsResponse> {
        const result: GetRequestsResponse = { success: false, data: [] as MortgageRequest[], error: { code: 0, message: '' }, timestamp: Date.now() }
        const ui = remult.user
        if (!ui) return result
        const repo = remult.repo(MortgageRequest)
        if (ui.roles?.includes(Roles.admin) || ui.roles?.includes(Roles.manager)) {
            result.data.push(...await repo.find({ include: { customer: true } }))
        }
        else if (ui.roles?.includes(Roles.operator)) {
            result.data.push(...await repo.find({ where: { assignedOperatorId: ui.id }, include: { customer: true } }))
        }
        else if (ui.roles?.includes(Roles.customer)) {
            result.data.push(...await repo.find({ where: { customerId: ui.id }, include: { customer: true } }))
        }
        result.success = true
        return result
    }


    @BackendMethod({ allowed: true })
    static async assignOperator(req: AssignOperatorRequest): Promise<AssignOperatorResponse> {
        const result: AssignOperatorResponse = {
            success: false,
            timestamp: Date.now(),
            data: {} as MortgageRequest,
            error: { code: 0, message: '' }
        };

        try {
            const requestId = req.requestId;
            const operatorId = req.operatorId;

            if (!requestId || !operatorId) {
                result.error = { code: 400, message: 'Request ID and Operator ID are required.' };
                return result;
            }

            const request = await remult.repo(MortgageRequest).findId(requestId);
            if (!request) {
                result.error = { code: 404, message: `Found NO request for requestId: '${requestId}'` };
                return result;
            }

            const operator = await remult.repo(User).findId(operatorId);
            if (!operator) {
                result.error = { code: 404, message: `Found NO operator for operatorId: '${operatorId}'` };
                return result;
            }

            request.assignedOperatorId = operator.id;
            request.updatedAt = new Date();
            if (RequestStatus.isBeloveAssignedStatus(request.status)) {
                request.status = RequestStatus.ASSIGNED
            }

            const savedRequest = await request.save();

            console.log("savedRequest.id:", savedRequest.id);
            result.success = true;
            result.data = savedRequest;

        } catch (rawError: any) {
            console.error("Error assigning operator (BackendMethod):", rawError);

            const errorMessage = rawError instanceof Error ? rawError.message : String(rawError);
            result.error = { code: 500, message: errorMessage || 'An unknown error occurred while assigning the operator.' };
        }

        return result;
    }
    // --- חדש: מתודה לקידום שלבים והוספת הערות של מתפעלת ---
    @BackendMethod({ allowed: [Roles.operator, Roles.admin, Roles.manager] }) // רק למורשים
    static async updateStageProgress(payload: UpdateStageProgressPayload): Promise<UpdateStageProgressResponse> {
        const result: UpdateStageProgressResponse = { success: false, timestamp: Date.now() };
        const requestRepo = remult.repo(MortgageRequest);
        const requestStageRepo = remult.repo(MortgageRequestStage);
        const stageRepo = remult.repo(Stage);

        try {
            const request = await requestRepo.findId(payload.requestId);
            if (!request) {
                result.error = { code: 404, message: 'Request not found.' };
                return result;
            }

            // 1. איתור ועדכון רשומת השלב הנוכחית
            let currentRequestStage: MortgageRequestStage | null | undefined = null;
            if (payload.currentStageEntryId) {
                currentRequestStage = await requestStageRepo.findId(payload.currentStageEntryId);
            } else {
                // מצא את השלב הפעיל האחרון (לא גמור) של הבקשה
                currentRequestStage = await requestStageRepo.findFirst(
                    { request: request, done: undefined! },
                    { orderBy: { started: 'desc' }, include: { stage: true } }
                );
            }

            if (currentRequestStage) {
                // הוספת הערות לשלב
                if (payload.stageNotes) {
                    // יש להוסיף שדה 'notes' או 'log' ל-MortgageRequestStage entity
                    // לדוגמה: currentRequestStage.notes = payload.stageNotes;
                    currentRequestStage.notes = payload.stageNotes;
                    console.log(`Notes for stage ${currentRequestStage.stage?.desc}: ${payload.stageNotes}`);
                }

                // סיום השלב הנוכחי אם נתבקש
                if (payload.markStageAsCompleted) {
                    currentRequestStage.done = new Date();
                    await requestStageRepo.save(currentRequestStage);
                    console.log(`Stage '${currentRequestStage.stage?.desc}' for request ${request.id} marked as completed.`);

                    // 2. פתיחת השלב הבא (באופן אוטומטי לפי סדר seq)
                    const nextStage = await stageRepo.findFirst(
                        { requestType: request.requestType, seq: currentRequestStage.stage!.seq + 1 },
                        { orderBy: { seq: "asc" } }
                    );

                    if (nextStage) {
                        const newStageEntry = requestStageRepo.create({
                            request: request,
                            stage: nextStage,
                            started: new Date(),
                            untill: new Date(new Date().setDate(new Date().getDate() + nextStage.days))
                        });
                        result.newStageStarted = await requestStageRepo.save(newStageEntry);
                        console.log(`New stage '${nextStage.desc}' started for request ${request.id}.`);
                    } else {
                        console.log(`No next stage defined for request ${request.id} after stage '${currentRequestStage.stage?.desc}'.`);
                        request.status = RequestStatus.WAITING_FOR_APPROVAL
                        request.updatedAt = new Date(); // עדכן תאריך עדכון אחרון
                        await requestRepo.save(request)
                        // אולי כאן הסטטוס הראשי צריך לעבור ל-COMPLETED או WAITING_FOR_APPROVAL
                    }
                }
            } else {
                console.warn(`No active stage found for request ${request.id} to update progress.`);
            }

            // 3. עדכון סטטוס הבקשה הראשי (אופציונלי, רק אם הפעולה הזו נועדה גם לשנות סטטוס כללי)
            // if (payload.statusToChangeTo) {
            //     request.status = payload.statusToChangeTo;
            //     console.log(`Request ${request.id} status changed to ${payload.statusToChangeTo.caption}.`);
            // }
            // request.updatedAt = new Date(); // עדכן תאריך עדכון אחרון
            // const updatedRequest = await requestRepo.save(request); // שמור שינויים בבקשה הראשית

            result.success = true;
            result.data = request;

        } catch (error) {
            result.error = { code: 500, message: error instanceof Error ? error.message : String(error) };
            console.error('Error updating stage progress:', error);
        }
        return result;
    }

}