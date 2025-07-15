import { DocumentType } from '../enum/document-type.enum';

export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface ApiUrlResponse extends ApiResponse {
  url: string;
}

// הגדרת סוג לפרטי מסמך
export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type?: DocumentType; // Assuming DocumentType exists (e.g., as an enum or string literal type)
}


// הגדרת טיפוס עבור תגובת עדכון - כמו שהגדרתי בתשובה הקודמת, אם לא קיימת
export interface GetDocumentsRequestResponse {
    success: boolean;
    data?: DocumentItem[];
    error?: { code: number; message: string; };
    timestamp: number;
}

/**
 * Interface for the response received from DocumentController.uploadFiles.
 * It details both successfully uploaded documents and any failures.
 */
export interface UploadFilesResponse {
  // Array of successfully uploaded document items with their final details (ID, name, etc.)
  successfulUploads: DocumentItem[];

  // Array of files that failed to upload, along with their associated error.
  failedUploads: { file: File; error: any }[]; // Keeping the more specific error structure
}

// Make sure DocumentType is defined somewhere, e.g.:
// export enum DocumentType {
//   PDF = 'pdf',
//   Image = 'image',
//   Video = 'video',
//   Other = 'other',
// }
