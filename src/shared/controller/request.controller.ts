import { BackendMethod, Controller, ControllerBase, remult } from "remult";

import { MortgageRequestStage } from "../entity/request-stage.entity";
import { MortgageRequest } from "../entity/request.entity";
import { Stage } from "../entity/stage.entity";
import { User } from "../entity/user.entity";
import { RequestStatus } from "../enum/request-status.enum"; // <<< ודא ייבוא של RequestStatus
import { RequestType } from "../enum/request-type.enum"; // <<< ודא ייבוא של RequestType
import { Roles } from "../enum/roles";
import { ApiResponse } from "../type/api.type";
import { DocumentItem } from "../type/document.type";
import { AssignOperatorRequest, AssignOperatorResponse, CreateRequestResponse, GetRequestsResponse, UpdateRequestResponse, UpdateStageProgressPayload, UpdateStageProgressResponse } from "../type/request.type";


@Controller('request')
export class RequestController extends ControllerBase {

    // 1. מתודת CREATE - תשמש ליצירה ראשונית של טיוטה בלבד
    @BackendMethod({ allowed: true })
    static async updateDocument(requestId: string, docs: DocumentItem[]): Promise<ApiResponse> {
        const result = {} as ApiResponse
        if (!requestId) {
            result.error!.code = `404`
            result.error!.message = `Missing requestId`
            return result
        }
        const request = await remult.repo(MortgageRequest).findId(requestId)
        if (!request) {
            result.error!.code = `404`
            result.error!.message = `Found NO request for requestId: ${requestId}`
            return result
        }
        if (!request.documents) {
            request.documents = [] as DocumentItem[]
        }
        request.documents.push(...docs)
        result.data = await request.save()
        result.success = true
        return result
    }

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
        // console.log('SERVER: partialData.filled: ', data)
        // console.log(`SERVER: newStatus`, `${newStatus?.id}`)

        try {
            const existingRequest = await requestRepo.findId(requestId);
            if (!existingRequest) {
                result.error!.code = 404;
                result.error!.message = 'Request not found.';
                return result;
            }

            // עדכון השדות - השתמש ב-Object.assign כדי לעדכן את כל השדות שנשלחו ב-data
            // זה יעדכן את כל השדות ששמותיהם זהים ב-data וב-existingRequest

            // console.log(`SEND: { keyFinancials: ${JSON.stringify(data.keyFinancials)} }`)
            RequestController.assignValuesToRequest(existingRequest, data)
            existingRequest.updatedAt = new Date(); // עדכן את תאריך העדכון

            // אם נשלח סטטוס חדש, עדכן אותו. זה ישמש לשינוי סטטוס מטיוטה לסטטוס סופי.
            if (newStatus) {
                existingRequest.status = newStatus;
            }

            // console.log(existingRequest.isNew(),'existingRequest.isNew')
            const updatedRequest = await requestRepo.save(existingRequest); // שמירת העדכונים
            result.data = updatedRequest;
            result.success = true;
            // console.log('SAVED!')
        } catch (error) {
            result.error!.code = 500;
            result.error!.message = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('Error updating request:', error);
        }

        return result;
    }

    static assignValuesToRequest(request: MortgageRequest, values: Partial<MortgageRequest>) {
        // console.log(`RECEIVED: { full data from client: ${JSON.stringify(values)} }`);

        // --- 1. אתחול אובייקטים מקוננים ב-request אם אינם קיימים ---
        // (שימוש ב-?? {} מבטיח שאם האובייקט הוא null/undefined, הוא יאותחל כאובייקט ריק)
        request.personalDetails = request.personalDetails ?? {};
        request.demographicDetails = request.demographicDetails ?? {};
        request.keyFinancials = request.keyFinancials ?? { currentBank: '', monthlyIncome: 0, partnerIncome: 0 }; // ודא שאתחול זה מתבצע נכון אם השדות הללו חובה בישות
        request.employmentAndOtherFinancials = request.employmentAndOtherFinancials ?? {};
        request.propertyData = request.propertyData ?? {};
        request.loanData = request.loanData ?? {};
        request.refinanceDetails = request.refinanceDetails ?? {};
        request.otherLoansDetails = request.otherLoansDetails ?? {};
        request.goalsAndDifficulties = request.goalsAndDifficulties ?? {};

        // --- 2. מיפוי ועדכון השדות מה-`values` (השטוחים מהטופס) לאובייקטים המקוננים הנכונים ---

        // פרטים אישיים
        Object.assign(request.personalDetails, {
            fullName: (values as any).fullName, // העברה מפורשת של השדות השטוחים מה-values
            mobile: (values as any).mobile,
            email: (values as any).email,
            // idNumber: (values as any).idNumber,
            address: (values as any).address,
        });
        //console.log(`After personalDetails: ${JSON.stringify(request.personalDetails)}`);

        // מצב משפחתי ודמוגרפי
        Object.assign(request.demographicDetails, {
            maritalStatus: (values as any).maritalStatus,
            childrenDetails: (values as any).childrenDetails,
            husbandAge: (values as any).husbandAge,
            wifeAge: (values as any).wifeAge,
        });
        //console.log(`After demographicDetails: ${JSON.stringify(request.demographicDetails)}`);

        // פרטים פיננסיים מרכזיים (keyFinancials)
        // הערה: יש לוודא ששמות השדות ב-values תואמים לשמות השדות ב-keyFinancials בישות.
        // אם monthlyIncome ו-partnerIncome מגיעים שטוחים מ-values, הם יוצבו כאן.
        Object.assign(request.keyFinancials, {
            monthlyIncome: (values as any).monthlyIncome,
            partnerIncome: (values as any).partnerIncome,
            currentBank: (values as any).currentBank,
            // ... הוסף כאן שדות נוספים השייכים ל-keyFinancials מהאובייקט השטוח values
        });
        //console.log(`After keyFinancials: ${JSON.stringify(request.keyFinancials)}`);

        // תעסוקה ופיננסים נוספים (employmentAndOtherFinancials)
        Object.assign(request.employmentAndOtherFinancials, {
            employmentType: (values as any).employmentType,
            wifeEmploymentType: (values as any).wifeEmploymentType,
            paymentReturns: (values as any).paymentReturns,
            healthIssues: (values as any).healthIssues,
            hasLongTermLoans: (values as any).hasLongTermLoans,
            // ... הוסף כאן שדות נוספים השייכים ל-employmentAndOtherFinancials
        });
        //console.log(`After employmentAndOtherFinancials: ${JSON.stringify(request.employmentAndOtherFinancials)}`);

        // נתוני נכס (propertyData)
        Object.assign(request.propertyData, {
            propertyCity: (values as any).propertyCity,
            propertyValue: (values as any).propertyValue,
            numberOfRooms: (values as any).numberOfRooms,
            hasAdditionalProperty: (values as any).hasAdditionalProperty,
            equityAmount: (values as any).equityAmount,
            // ... הוסף כאן שדות נוספים השייכים ל-propertyData
        });
        //console.log(`After propertyData: ${JSON.stringify(request.propertyData)}`);
        //  loanData?: {
        //     requestedAmount?: number; //
        //     loanPeriod?: number; //
        //     equityAmount?: number; // הון עצמי הוא חלק מפרטי ההלוואה החדשה
        //     // שדה רביעי וחמישי אם יש, או להשאיר כך
        //   };
        // נתוני הלוואה (loanData)
        Object.assign(request.loanData, {
            loanAmount: (values as any).loanAmount,
            loanTerm: (values as any).loanTerm,
            // ... הוסף כאן שדות נוספים השייכים ל-loanData
        });
        //console.log(`After loanData: ${JSON.stringify(request.loanData)}`);

        // פרטי מחזור (refinanceDetails) - אם רלוונטי
        Object.assign(request.refinanceDetails, {
            refinanceReason: (values as any).refinanceReason,
            remainingMortgageBalance: (values as any).remainingMortgageBalance,
            currentMonthlyMortgagePayment: (values as any).currentMonthlyMortgagePayment,
            hasOtherLoans: (values as any).hasOtherLoans,
            // ... הוסף כאן שדות נוספים השייכים ל-refinanceDetails
        });
        //console.log(`After refinanceDetails: ${JSON.stringify(request.refinanceDetails)}`);

        // פרטי הלוואות אחרות (otherLoansDetails) - אם רלוונטי
        Object.assign(request.otherLoansDetails, {
            otherLoansAmount: (values as any).otherLoansAmount,
            otherLoansMonthlyPayment: (values as any).otherLoansMonthlyPayment,
            // ... הוסף כאן שדות נוספים השייכים ל-otherLoansDetails
        });
        //console.log(`After otherLoansDetails: ${JSON.stringify(request.otherLoansDetails)}`);

        // מטרות וקשיים (goalsAndDifficulties)
        Object.assign(request.goalsAndDifficulties, {
            desiredOutcome: (values as any).desiredOutcome,
            mainDifficulties: (values as any).mainDifficulties,
            paymentDifficultyRating: (values as any).paymentDifficultyRating,
            optimalSituation: (values as any).optimalSituation,
        });
        //console.log(`After goalsAndDifficulties: ${JSON.stringify(request.goalsAndDifficulties)}`);


        // --- 3. עדכון שדות ברמה העליונה בישות (שאינם חלק מאובייקטים מקוננים) ---
        // אלה שדות כמו requestType, customerId, status וכו'.
        // הם יכולים להישלח ב-values ברמה העליונה ולהיות מעודכנים ישירות.
        if (values.requestType !== undefined) {
            request.requestType = values.requestType;
        }
        if (values.customerId !== undefined) {
            request.customerId = values.customerId;
        }
        if (values.status !== undefined) {
            request.status = values.status;
        }
        // ... כל שדות ברמה העליונה שאתה רוצה לעדכן מה-values


        // --- 4. טיפול בשדות מיוחדים (כמו מערכים, או אובייקטים שמגיעים באופן מלא) ---
        // שים לב: documents ו-appointmentDetails הם שדות מיוחדים.
        // documents הוא מערך של אובייקטים. אם values.documents מכיל מערך חדש, הוא יחליף את הקיים.
        // אם אתה רוצה למזג מערכים, זה דורש לוגיקה מורכבת יותר.
        if (values.documents !== undefined) {
            request.documents = values.documents; // יחליף את המערך הקיים
        }
        //console.log(`After documents: ${JSON.stringify(request.documents)}`);

        // appointmentDetails הוא אובייקט. אם values.appointmentDetails הוא אובייקט מלא, הוא יכול להחליף.
        // אם זה רק עדכון חלקי, נמזג אותו כמו שדות אחרים.
        if (values.appointmentDetails !== undefined) {
            request.appointmentDetails = request.appointmentDetails ?? { date: undefined!, time: "" };
            Object.assign(request.appointmentDetails, values.appointmentDetails);
        }
        //console.log(`After appointmentDetails: ${JSON.stringify(request.appointmentDetails)}`);


        // --- 5. טיפול בסטטוס חדש (newStatus) אם נשלח במפורש ---
        // פרמטר newStatus מגיע בנפרד במתודת ה-update, לא כחלק מה-data
        // אז הוא יטופל מחוץ ל-assignValuesToRequest או יועבר כפרמטר נוסף
        // ויעדכן את request.status.
    }

    // static assignValuesToRequest(request: MortgageRequest, values: Partial<MortgageRequest>) {
    //     console.log(`RECEIVED: { keyFinancials: ${JSON.stringify(values)} }`)


    //     request.personalDetails = request.personalDetails ?? {}; // Ensure it's an object
    //     request.demographicDetails = request.demographicDetails ?? {};
    //     request.keyFinancials = {currentBank:'', monthlyIncome: 0,partnerIncome:0};
    //     request.employmentAndOtherFinancials = request.employmentAndOtherFinancials ?? {};
    //     request.propertyData = request.propertyData ?? {};
    //     request.loanData = request.loanData ?? {};
    //     request.refinanceDetails = request.refinanceDetails ?? {};
    //     request.otherLoansDetails = request.otherLoansDetails ?? {};
    //     request.goalsAndDifficulties = request.goalsAndDifficulties ?? {};
    //     request.documents = request.documents! ?? {};
    //     request.appointmentDetails = request.appointmentDetails! ?? {};


    //     // console.log(`Before: { personalDetails: ${JSON.stringify(request.personalDetails)} }`)
    //     Object.assign(request.personalDetails, values.personalDetails);
    //     console.log(`After: { personalDetails: ${JSON.stringify(request.personalDetails)} }`)

    //     // console.log(`Before: { demographicDetails: ${JSON.stringify(request.demographicDetails)} }`)
    //     Object.assign(request.demographicDetails!, values.demographicDetails);
    //     console.log(`After: { demographicDetails: ${JSON.stringify(request.demographicDetails)} }`)

    //     console.log(1,request.keyFinancials,JSON.stringify(request.keyFinancials))
    //     console.log(2,values,JSON.stringify(values))
    //     Object.assign(request.keyFinancials, values);
    //     console.log(`After: { keyFinancials: ${JSON.stringify(request.keyFinancials)} }`)

    //     Object.assign(request.employmentAndOtherFinancials!, values.employmentAndOtherFinancials);
    //     console.log(`After: { employmentAndOtherFinancials: ${JSON.stringify(request.employmentAndOtherFinancials)} }`)

    //     Object.assign(request.propertyData!, values.propertyData);
    //     console.log(`After: { propertyData: ${JSON.stringify(request.propertyData)} }`)

    //     Object.assign(request.loanData!, values.loanData);
    //     console.log(`After: { loanData: ${JSON.stringify(request.loanData)} }`)

    //     Object.assign(request.refinanceDetails!, values.refinanceDetails);
    //     console.log(`After: { refinanceDetails: ${JSON.stringify(request.refinanceDetails)} }`)

    //     Object.assign(request.otherLoansDetails!, values.otherLoansDetails);
    //     console.log(`After: { otherLoansDetails: ${JSON.stringify(request.otherLoansDetails)} }`)

    //     Object.assign(request.goalsAndDifficulties!, values.goalsAndDifficulties);
    //     console.log(`After: { goalsAndDifficulties: ${JSON.stringify(request.goalsAndDifficulties)} }`)

    //     Object.assign(request.documents!, values.documents);
    //     console.log(`After: { documents: ${JSON.stringify(request.documents)} }`)

    //     Object.assign(request.appointmentDetails!, values.appointmentDetails);
    //     console.log(`After: { appointmentDetails: ${JSON.stringify(request.appointmentDetails)} }`)
    // }

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
            result.data.push(...await repo.find({ include: { customer: true }, orderBy: { requestNumber: 'desc' } }))
        }
        else if (ui.roles?.includes(Roles.operator)) {
            result.data.push(...await repo.find({ where: { assignedOperatorId: ui.id }, include: { customer: true }, orderBy: { requestNumber: 'desc' } }))
        }
        else if (ui.roles?.includes(Roles.customer)) {
            result.data.push(...await repo.find({ where: { customerId: ui.id }, include: { customer: true }, orderBy: { requestNumber: 'desc' } }))
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

            // console.log("savedRequest.id:", savedRequest.id);
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
                    // console.log(`Notes for stage ${currentRequestStage.stage?.desc}: ${payload.stageNotes}`);
                }

                // סיום השלב הנוכחי אם נתבקש
                if (payload.markStageAsCompleted) {
                    currentRequestStage.done = new Date();
                    await requestStageRepo.save(currentRequestStage);
                    // console.log(`Stage '${currentRequestStage.stage?.desc}' for request ${request.id} marked as completed.`);

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
                        // console.log(`New stage '${nextStage.desc}' started for request ${request.id}.`);
                    } else {
                        // console.log(`No next stage defined for request ${request.id} after stage '${currentRequestStage.stage?.desc}'.`);
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