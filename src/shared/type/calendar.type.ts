
export interface CalendarEvent {
    eid: string; // The unique event ID
    summary: string; // The title of the event
    location: string; // The location of the event
    description: string; // A description of the event
    start: {
        dateTime: string; // The start date and time in ISO 8601 format
        timeZone: string; // The time zone for the start time
    };
    end: {
        dateTime: string; // The end date and time in ISO 8601 format
        timeZone: string; // The time zone for the end time
    };
    attendees?: Array<{
        email: string; // Email address of the attendee
    }>;
    reminders: {
        useDefault: boolean; // Whether to use the default reminders
        overrides?: Array<{
            method: 'email' | 'popup'; // The reminder method
            minutes: number; // The number of minutes before the event
        }>;
    };
}

export interface CalendarEventResponse {
    success: boolean; // Indicates if the request was successful
    error?: string; // Error message if the request failed
    events?: CalendarEvent[]; // The event data if the request was successful
}

export interface CalendarEventRequest {
    fromDate: Date; // Indicates if the request was successful
    toDate: Date; // Error message if the request failed
}
