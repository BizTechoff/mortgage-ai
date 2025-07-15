import { Injectable } from "@angular/core";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { CalendarController } from "../../shared/controller/calendar.controller";
import { RequestController } from "../../shared/controller/request.controller";
import { MortgageRequest } from "../../shared/entity/request.entity";
import { CalendarEvent } from "../../shared/type/calendar.type";
import { AssignOperatorRequest } from "../../shared/type/request.type";

@Injectable({
    providedIn: 'root'
})
export class CalendarService {

    getEvents(requestId: string): Observable<CalendarEvent[]> {
        return from(CalendarController.getEvents(requestId)).pipe(
            // map(response => response),
            catchError(error => {
                return throwError(() => error);
            })
        )
    }
    
}
