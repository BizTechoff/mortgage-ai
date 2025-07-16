import { calendar_v3, google } from 'googleapis';
import { timeFormat } from '../../app/common/dateFunc';
import { CalendarController } from '../../shared/controller/calendar.controller';
import { AppointmentDetails } from '../../shared/type/appointment.type';
import { CalendarEvent } from '../../shared/type/calendar.type';
console.log('server.calendar.ts loaded')

CalendarController.getEventsHandler = async requestId => getEvents()
CalendarController.getNext7FreeAppointmentHandler = async start => getNext7FreeAppointmentHandler(start)
CalendarController.addAppointmentHandler = async event => addEvent(event)

// --- קבועים להגדרת כללי החיפוש ---
const SLOT_DURATION_MINUTES = 90;
const SLOTS_TO_FIND = 7;
const WORK_DAY_START_HOUR = 10;
const WORK_DAY_END_HOUR = 18;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 14;
const SEARCH_RANGE_DAYS = 60; // טווח חיפוש קדימה למניעת לולאה אינסופית

export const getClientByOAuth = async () => {
    try {
        // Load credentials from environment variables
        const credentials = {
            client_id: process.env['GOOGLE_CLIENT_ID'],
            client_secret: process.env['GOOGLE_CLIENT_SECRET'],
            redirect_uri: 'http://localhost', // Update to your redirect URI
        };

        if (!credentials.client_id || !credentials.client_secret || !credentials.redirect_uri) {
            throw new Error('Missing OAuth credentials in environment variables.');
        }

        const refreshToken = process.env['GOOGLE_REFRESH_TOKEN'];
        if (!refreshToken) {
            throw new Error('Missing refresh token in environment variables.');
        }
        // console.log('refresh token: ' + refreshToken)

        // Initialize OAuth2 client
        const oAuth2Client = new google.auth.OAuth2(
            credentials.client_id,
            credentials.client_secret,
            credentials.redirect_uri
        );

        oAuth2Client.setCredentials({
            refresh_token: refreshToken,
        });

        // // Test if the token is valid and refresh it if necessary
        await oAuth2Client.getAccessToken();

        // // Initialize Calendar API client
        const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
        return calendar;
    } catch (error) {
        console.error('Error setting up OAuth client:', error);
        return undefined!;
    }
};


export const getEvents = async (maxResults = 10): Promise<CalendarEvent[]> => {
    console.log('SERVER :: getEvents has called!')
    const result: CalendarEvent[] = [] as CalendarEvent[];
    const client = await getClientByOAuth()
    if (client) {
        try {
            // Fetch the calendar events
            const response = await client.events.list({
                calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'], // Primary calendar
                timeMin: new Date().toISOString(), // Start from now
                maxResults: maxResults, // Limit results
                singleEvents: true, // Expand recurring events
                orderBy: 'startTime', // Order by start time
            });

            // Process the events
            const events = response.data.items || [];
            if (events.length === 0) {
                console.log('No upcoming events found.');
            } else {
                console.log(`Found ${events.length} events.`);
                result.push(...events.map(
                    (event): CalendarEvent => googleEventToCalendarEvent(event)))
            }
        } catch (error) {
            console.error('Error reading calendar:', error);
        }
    }
    console.log('result', JSON.stringify(result))
    return result;
};

/**
 * מאחזר את 7 המועדים הפנויים הבאים לפגישה של שעה וחצי,
 * בין הימים א'-ה', בין השעות 10:00-18:00, ולא בזמן הפסקת הצהריים (12:00-14:00).
 */
export const getNext7FreeAppointmentHandler = async (start = new Date()): Promise<AppointmentDetails[]> => {
    console.log('SERVER :: Finding next 7 free slots has started!');

    const foundSlots = [] as AppointmentDetails[];
    const client = await getClientByOAuth();
    if (!client) {
        console.error("Failed to get Google API client.");
        return [];
    }

    // 1. אחזור כל האירועים הקיימים בטווח החיפוש
    const searchStartDate = new Date();
    const searchEndDate = new Date();
    searchEndDate.setDate(searchStartDate.getDate() + SEARCH_RANGE_DAYS);

    let existingEvents = [] as calendar_v3.Schema$Event[];
    try {
        const response = await client.events.list({
            calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'],
            timeMin: searchStartDate.toISOString(),
            timeMax: searchEndDate.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        existingEvents = response.data.items || [];
        console.log(`Found ${existingEvents.length} existing events in the next ${SEARCH_RANGE_DAYS} days.`);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        return [];
    }

    // 2. איטרציה על הימים והשעות כדי למצוא מועדים פנויים
    let currentDate = new Date(); // נתחיל מהיום
    currentDate.setHours(WORK_DAY_START_HOUR, 0, 0, 0); // קפיצה לשעת ההתחלה של יום העבודה

    while (foundSlots.length < SLOTS_TO_FIND && currentDate < searchEndDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        // דלג על שישי (5) ושבת (6)
        if (dayOfWeek === 5 || dayOfWeek === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_DAY_START_HOUR, 0, 0, 0);
            continue;
        }

        const potentialStart = new Date(currentDate);
        const potentialEnd = new Date(potentialStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

        // בדיקה שהמועד מסתיים לפני סוף יום העבודה
        if (potentialEnd.getHours() > WORK_DAY_END_HOUR || (potentialEnd.getHours() === WORK_DAY_END_HOUR && potentialEnd.getMinutes() > 0)) {
            // עברנו את יום העבודה, קפוץ ליום הבא
            currentDate.setDate(currentDate.getDate() + 1);
            currentDate.setHours(WORK_DAY_START_HOUR, 0, 0, 0);
            continue;
        }

        // בדיקה שהמועד לא נכנס להפסקת צהריים
        const crossesLunchBreak = potentialStart.getHours() < LUNCH_END_HOUR && potentialEnd.getHours() >= LUNCH_START_HOUR && !(potentialEnd.getHours() === LUNCH_START_HOUR && potentialEnd.getMinutes() === 0);
        if (!crossesLunchBreak) {
            // בדיקה שהמועד לא מתנגש עם אירועים קיימים
            if (!isOverlapping(potentialStart, potentialEnd, existingEvents)) {
                // נמצא מועד פנוי!
                foundSlots.push({
                    date: potentialStart,
                    time: timeFormat(potentialStart)
                })
            }
        }

        // קדם את המועד הבא לבדיקה ב-30 דקות
        currentDate.setMinutes(currentDate.getMinutes() + 30);
    }

    console.log(`Found a total of ${foundSlots.length} free slots.`);
    console.log('result', JSON.stringify(foundSlots, null, 2));
    return foundSlots;
};

/**
 * בודק אם טווח זמן מסוים מתנגש עם אירועים קיימים.
 * @param slotStart תחילת המועד הפוטנציאלי
 * @param slotEnd סוף המועד הפוטנציאלי
 * @param existingEvents מערך אירועים קיימים מהיומן
 * @returns {boolean} true אם קיימת התנגשות
 */
const isOverlapping = (slotStart: Date, slotEnd: Date, existingEvents: calendar_v3.Schema$Event[]): boolean => {
    for (const event of existingEvents) {
        const eventStart = new Date(event.start?.dateTime || '');
        const eventEnd = new Date(event.end?.dateTime || '');

        // תנאי ההתנגשות: אם תחילת האירוע היא לפני סוף המועד, וסוף האירוע הוא אחרי תחילת המועד
        if (eventStart < slotEnd && eventEnd > slotStart) {
            return true;
        }
    }
    return false;
};

export const addEvent = async (event: CalendarEvent): Promise<boolean> => {
    console.log('SERVER :: addEvent 111')
    console.log('SERVER :: addEvent :: ' + JSON.stringify(event));
    var result = false
    const client = await getClientByOAuth()
    if (client) {
        try {
            // Add the event
            const response = await client.events.insert({
                calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'], //'primary', // Adjust if targeting a specific calendar
                sendUpdates: 'all', // Ensure attendees are notified 
                requestBody: event
            });
            result = true
            console.log('Event created successfully data:', response.data);
            console.log('Event created successfully:', response.data.htmlLink);
        } catch (error) {
            console.error('Error reading calendar:', error);
        }
    }
    return result
};

export const updateEvent = async (eventId = '', event: CalendarEvent): Promise<boolean> => {
    var result = false
    const client = await getClientByOAuth()
    if (client) {
        try {
            // Add the event
            const response = await client.events.update({
                calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'], //'primary', // Adjust if targeting a specific calendar
                eventId: eventId,
                sendUpdates: 'all', // Ensure attendees are notified 
                requestBody: event,
            });
            result = true
            console.log('Event created successfully data:', response.data);
            console.log('Event created successfully:', response.data.htmlLink);
        } catch (error) {
            console.error('Error reading calendar:', error);
        }
    }
    return result
};

export const removeEvent = async (eventId = '') => {
    const result: string[] = [];
    if (!eventId || !eventId.trim().length) {
        console.error('Error deleting event: EventId is missing');
        return result
    }
    const client = await getClientByOAuth()
    if (client) {
        try {
            // Delete the event
            const response = await client.events.delete({
                calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'], //'primary', // Adjust if targeting a specific calendar
                eventId: eventId
            });

            console.log(`Event with ID ${eventId} has been deleted successfully.`);
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    }
    return result;
};

export const getEventById = async (eventId = ''): Promise<CalendarEvent> => {
    var result = {} as CalendarEvent
    if (!eventId || !eventId.trim().length) {
        console.error('Error get event by id: EventId is missing');
        return result
    }
    const client = await getClientByOAuth()
    if (client) {
        try {
            // Delete the event
            const response = await client.events.get({
                calendarId: process.env['GOOGLE_PRIMARY_CALENDAR_ID'], //'primary', // Adjust if targeting a specific calendar
                eventId: eventId,
            });

            result = googleEventToCalendarEvent(response.data)

            console.log(`Event with ID ${eventId} has been retrieved successfully.`);
        } catch (error) {
            console.error('Error retrieved event:', error);
        }
    }
    return result;
};

const googleEventToCalendarEvent = (event: calendar_v3.Schema$Event) => {
    const result = {} as CalendarEvent
    // Transform the event into a CalendarEvent object
    result.eid = event.id || '';
    result.summary = event.summary || 'No Title';
    result.location = event.location || '';
    result.description = event.description || '';
    result.start = {
        dateTime: event.start?.dateTime || event.start?.date || '',
        timeZone: event.start?.timeZone || 'UTC',
    };
    result.end = {
        dateTime: event.end?.dateTime || event.end?.date || '',
        timeZone: event.end?.timeZone || 'UTC',
    };
    result.attendees =
        event.attendees?.map((attendee) => ({
            email: attendee.email || '',
        })) || [];
    result.reminders = {
        useDefault: event.reminders?.useDefault || false,
        overrides: (event.reminders?.overrides || []).map((override) => {
            if (override.method === 'popup' || override.method === 'email') {
                return {
                    method: override.method,
                    minutes: override.minutes || 0,
                };
            }
            return null; // Exclude invalid methods
        }).filter(Boolean) as { method: 'popup' | 'email'; minutes: number }[],
    };
    return result
}

// module.exports = { this };
