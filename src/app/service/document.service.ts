import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, from, map, Observable, of, switchMap, throwError } from "rxjs";
import { DocumentController } from "../../shared/controller/document.controller";
import { RequestController } from "../../shared/controller/request.controller";
import { ApiResponse } from "../../shared/type/api.type";
import { DocumentItem, GetDocumentsRequestResponse, UploadFilesResponse } from "../../shared/type/document.type";
import { Document } from "../../shared/entity/document.entity";

@Injectable({
    providedIn: 'root'
})
export class DocumentService {

    constructor(private http: HttpClient,) { }

    uploadDocuments(requestId: string, files: FileList, bucket: string): Observable<ApiResponse> {
        return from(DocumentController.uploadFiles(files, bucket)).pipe(
            // Use switchMap to flatten the inner observable returned from the conditional logic
            switchMap((response: UploadFilesResponse) => {
                if (response.failedUploads && response.failedUploads.length > 0) {
                    console.warn('Some documents failed to upload:', response.failedUploads);
                    // If there are failures, immediately return an ApiResponse indicating failure
                    return of({ // Use 'of' to create an observable from a static value
                        success: false,
                        error: {
                            code: '500', message: 'Some documents failed to upload. Details: ' + JSON.stringify(response.failedUploads)
                        }
                    } as ApiResponse);
                } else {
                    // If uploads were successful, proceed to update the document in RequestController
                    // RequestController.updateDocument should return an Observable<ApiResponse>
                    return RequestController.updateDocument(requestId, response.successfulUploads);
                }
            }),
            // This catchError now handles errors from both DocumentController.uploadFiles
            // AND RequestController.updateDocument
            catchError(error => {
                console.error('Error during document upload or update:', error);
                // Return an ApiResponse indicating failure for the observable stream
                // Or re-throw a more specific error for the subscriber to handle
                return of({
                    success: false,
                    error: {
                        code: '500', message: 'An error occurred during document upload or update: ' + (error.message || 'Unknown error')
                    }
                } as ApiResponse);
            })
        );
    }
   
    // Change the return type from Observable<Document[]> to Observable<ApiResponse>
    getDocumentsByRequestId(requestId: string): Observable<DocumentItem[]> {
        return from(DocumentController.getDocumentsByRequestId(requestId)).pipe(
            map((response: GetDocumentsRequestResponse) => {
                if (response.success) {
                    // במקרה של הצלחה, נחזיר ישירות את הנתונים (מערך המסמכים)
                    return response.data || [] as DocumentItem[]; // וודא שזה תמיד מערך, גם אם ריק
                } else {
                    // במקרה של כישלון שהשרת דיווח עליו (response.success === false),
                    // נזרוק שגיאה עם ההודעה מהשרת.
                    // זה יעביר את השליטה לבלוק ה-catchError של ה-subscribe.
                    throw new Error(response.error?.message || 'Failed to fetch documents from server.');
                }
            }),
            catchError(error => {
                // בלוק זה מטפל בשגיאות מה-Promise (כמו שגיאות רשת)
                // וגם בשגיאות שנזרקו מתוך בלוק ה-map (כמו הכישלון שהשרת דיווח עליו).
                console.error('Error in getDocumentsByRequestId:', error);

                // נחזיר Observable של שגיאה כדי שה-subscriber יטפל בה בבלוק ה-error.
                // אפשרות 1: לזרוק שגיאה חדשה וספציפית יותר
                return throwError(() => new Error('Failed to load documents: ' + (error.message || 'Unknown error')));

                // אפשרות 2: להחזיר Observable ריק (אם אתה רוצה שהזרם פשוט יסתיים בלי שגיאה)
                // return of([]); // לא מומלץ כי זה מסתיר את הכישלון האמיתי
            })
        );
    }

}

