import { Injectable } from "@angular/core";
import { catchError, from, map, Observable, of, throwError } from "rxjs";
import { CalendarController } from "../../shared/controller/calendar.controller";
import { RequestController } from "../../shared/controller/request.controller";
import { MortgageRequest } from "../../shared/entity/request.entity";
import { CalendarEvent } from "../../shared/type/calendar.type";
import { AssignOperatorRequest } from "../../shared/type/request.type";
import { SnpvController } from "../../shared/controller/snpv.controller";
import { snpvCustomer } from "../../shared/type/snpv.type";

@Injectable({
    providedIn: 'root'
})
export class SnpvService {

    getCustomers(): Observable<snpvCustomer[]> {
        return of([] as snpvCustomer[])
        // return from(SnpvController.getCustomers()).pipe(
        //     // map(response => response),
        //     catchError(error => {
        //         return throwError(() => error);
        //     })
        // )
    }
    
}
