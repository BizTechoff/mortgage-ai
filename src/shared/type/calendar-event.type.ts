// src/shared/types/calendar-event.interface.ts
export interface CalendarEventRequest {
  startTime: string;  // ISO format date string
  durationMinutes: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  requestId: string;
  summary?: string;
  description?: string;
}

export interface CalendarEventResponse {
  id: string;
  htmlLink: string;
  status: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    conferenceId: string;
    conferenceSolution: {
      name: string;
      key: {
        type: string;
      };
    };
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
      pin?: string;
    }>;
  };
}

export interface AvailableTimeSlotsRequest {
  startDate?: string;  // ISO format date string
  durationMinutes?: number;
  numberOfSlots?: number;
}

export interface AvailableTimeSlotsResponse {
  availableSlots: string[];  // Array of ISO format date strings
}

export interface CalendarEventUpdateRequest {
  eventId: string;
  updates: {
    startTime?: string;  // ISO format date string
    endTime?: string;    // ISO format date string
    summary?: string;
    description?: string;
    attendees?: Array<{
      email: string;
    }>;
    conferenceData?: {
      createRequest?: {
        requestId: string;
        conferenceSolutionKey: {
          type: string;
        };
      };
    };
  };
}

export interface CalendarEventCancelRequest {
  eventId: string;
  notifyAttendees?: boolean;
  comment?: string;
}
