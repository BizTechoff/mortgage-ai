import { Injectable } from "@angular/core";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { RequestController } from "../../shared/controller/request.controller";
import { MortgageRequest } from "../../shared/entity/request.entity";
import { AssignOperatorRequest } from "../../shared/type/request.type";

@Injectable({
    providedIn: 'root'
})
export class CalendarService {

    static getAppointments(mobile: string): Observable<MortgageRequest[]> {
        return from([] as MortgageRequest[]).pipe(
            map(response => [response] as MortgageRequest[]
            ),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }

    static assignOperator(req: AssignOperatorRequest): Observable<MortgageRequest> {
        return from(RequestController.assignOperator(req)).pipe(
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
