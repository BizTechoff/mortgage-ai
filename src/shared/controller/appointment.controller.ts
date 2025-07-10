import { BackendMethod, Controller, ControllerBase, remult } from "remult";

import { MortgageRequest } from "../entity/request.entity";
import { User } from "../entity/user.entity";
import { Roles } from "../enum/roles";
import { AssignOperatorRequest, AssignOperatorResponse, CreateRequestResponse, GetRequestsResponse } from "../type/request.type"; // Ensure this import is correct
import { Observable, from, map, catchError, throwError } from "rxjs";
import { Appointment } from "../entity/appointment.entity";
import { RequestController } from "./request.controller";


@Controller('appointment')
export class AppointmentController extends ControllerBase {

    @BackendMethod({ allowed: true })
    
    // --- ADD THIS MISSING METHOD ---
    static async getAppointmentsByRequestId(requestId: string): Promise<Appointment[]> {
        return await remult.repo(Appointment).find({
            where: {requestId: requestId}
        })
    }
    // Build questionnaireData from form fields
    // const questionnaireData = {
    //     currentQuestionIndex: 0,
    //     answers: [
    //         // Step 1: Personal Information
    //         { questionId: 'fullName', questionText: 'שם מלא', answerText: data.questionnaireData.fullName || '', answerType: 'text' as const },
    //         { questionId: 'mobile', questionText: 'נייד', answerText: data.mobile || '', answerType: 'text' as const },
    //         { questionId: 'idNumber', questionText: 'תעודת זהות', answerText: data.idNumber || '', answerType: 'text' as const },
    //         { questionId: 'address', questionText: 'כתובת', answerText: data.address || '', answerType: 'text' as const },

    //         // Step 2: Financial Information
    //         { questionId: 'monthlyIncome', questionText: 'הכנסה חודשית', answerText: data.monthlyIncome || 0, answerType: 'number' as const },
    //         { questionId: 'partnerIncome', questionText: 'הכנסת בן/בת זוג', answerText: data.partnerIncome || 0, answerType: 'number' as const },
    //         { questionId: 'employmentType', questionText: 'סוג העסקה', answerText: data.employmentType || '', answerType: 'select' as const },
    //         { questionId: 'currentBank', questionText: 'בנק נוכחי', answerText: data.currentBank || '', answerType: 'select' as const },

    //         // Step 3: Property Details
    //         { questionId: 'propertyValue', questionText: 'שווי נכס', answerText: data.propertyValue || 0, answerType: 'number' as const },
    //         { questionId: 'loanAmount', questionText: 'סכום הלוואה', answerText: data.loanAmount || 0, answerType: 'number' as const },
    //         { questionId: 'loanTerm', questionText: 'תקופת הלוואה', answerText: data.loanTerm || '', answerType: 'select' as const },
    //         { questionId: 'refinanceReason', questionText: 'סיבת מחזור', answerText: data.refinanceReason || '', answerType: 'select' as const }
    //     ]
    // };
    // // Create new mortgage request
    // const mortgageRequest = repo(MortgageRequest).create({
    //     customer: customer,
    //     customerId: customer.id,
    //     requestType: data.requestType as RequestType,
    //     status: RequestStatus.NEW,
    //     questionnaireData: {
    //         currentQuestionIndex: 0,
    //         answers: [
    //             { questionId: 'fullName', questionText: 'שם מלא', answerText: data.fullName || '', answerType: 'text' },
    //             { questionId: 'mobile', questionText: 'נייד', answerText: data.mobile || '', answerType: 'text' },
    //             { questionId: 'idNumber', questionText: 'תעודת זהות', answerText: data.idNumber || '', answerType: 'text' },
    //             { questionId: 'monthlyIncome', questionText: 'הכנסה חודשית', answerText: data.monthlyIncome || 0, answerType: 'number' },
    //             { questionId: 'partnerIncome', questionText: 'הכנסת בן/בת זוג', answerText: data.partnerIncome || 0, answerType: 'number' },
    //             { questionId: 'employmentType', questionText: 'סוג העסקה', answerText: data.employmentType || '', answerType: 'select' }
    //         ]
    //     }, propertyData: {
    //         address: data.address,
    //         propertyValue: data.propertyValue
    //     }, loanData: {
    //         requestedAmount: data.loanAmount,
    //         loanPeriod: data.loanTerm,
    //         loanType: data.refinanceReason
    //     },
    //     createdAt: new Date(),
    //     updatedAt: new Date()
    // });

    // result.data = await repo(MortgageRequest).save(mortgageRequest);

    // @BackendMethod({ allowed: true })
    // static async getRequests(): Promise<GetRequestsResponse> {
    //     const result: GetRequestsResponse = { success: false, data: [] as MortgageRequest[], error: { code: 0, message: '' }, timestamp: Date.now() }
    //     const ui = remult.user
    //     if (!ui) return result
    //     const repo = remult.repo(MortgageRequest)
    //     if (ui.roles?.includes(Roles.admin) || ui.roles?.includes(Roles.manager)) {
    //         result.data.push(...await repo.find())
    //     }
    //     else if (ui.roles?.includes(Roles.operator)) {
    //         result.data.push(...await repo.find({ where: { assignedOperatorId: ui.id } }))
    //     }
    //     else if (ui.roles?.includes(Roles.customer)) {
    //         result.data.push(...await repo.find({ where: { customerId: ui.id } }))
    //     }
    //     return result
    // }


    // @BackendMethod({ allowed: true })
    // static async assignOperator(req: AssignOperatorRequest): Promise<AssignOperatorResponse> {
    //     const result: AssignOperatorResponse = {
    //         success: false,
    //         timestamp: Date.now(),
    //         data: {} as MortgageRequest,
    //         error: { code: 0, message: '' }
    //     };

    //     try {
    //         const requestId = req.requestId;
    //         const operatorId = req.operatorId;

    //         if (!requestId || !operatorId) { // בדיקה נוספת של קלט חובה
    //             result.error = { code: 400, message: 'Request ID and Operator ID are required.' };
    //             return result;
    //         }

    //         const request = await remult.repo(MortgageRequest).findId(requestId); //
    //         if (!request) {
    //             result.error = { code: 404, message: `Found NO request for requestId: '${requestId}'` };
    //             return result;
    //         }

    //         const operator = await remult.repo(User).findId(operatorId); //
    //         if (!operator) {
    //             result.error = { code: 404, message: `Found NO operator for operatorId: '${operatorId}'` };
    //             return result;
    //         }

    //         // עדכון אובייקט הבקשה
    //         request.assignedOperatorId = operator.id; //
    //         request.updatedAt = new Date(); //

    //         // שמירת השינויים במסד הנתונים
    //         const savedRequest = await request.save(); //

    //         // בניית תגובת הצלחה
    //         result.success = true;
    //         result.data = savedRequest;

    //     } catch (rawError: any) {
    //         console.error("Error assigning operator (BackendMethod):", rawError);

    //         const errorMessage = rawError instanceof Error ? rawError.message : String(rawError);
    //         result.error = { code: 500, message: errorMessage || 'An unknown error occurred while assigning the operator.' };
    //     }

    //     return result;
    // }

}