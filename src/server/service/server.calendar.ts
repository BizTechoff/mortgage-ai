// const { google } = require('googleapis'); // Changed to require
// import { config } from 'dotenv';
import { calendar_v3, google } from 'googleapis';
// import * as readline from 'readline';
import { CalendarEvent } from '../../shared/type/calendar.type';
import { CalendarController } from '../../shared/controller/calendar.controller';
console.log('server.calendar.ts loaded')

CalendarController.getEventsHandler = async requestId => getEvents() 

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
    console.log('result',JSON.stringify(result))
    return result;
};

export const addEvent = async (event: CalendarEvent): Promise<boolean> => {
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

// Export the function for usage in other files
// module.exports = { readCalendar };

/// For organiztion
// const getClientByServiceAuth = async () => {
//     try {
//         // Setup credentials
//         const credentials = {
//             type: process.env['GOOGLE_TYPE'],
//             project_id: process.env['GOOGLE_PROJECT_ID'],
//             private_key_id: process.env['GOOGLE_PRIVATE_KEY_ID'],
//             private_key: process.env['GOOGLE_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
//             client_email: process.env['GOOGLE_CLIENT_EMAIL'],
//             client_id: process.env['GOOGLE_CLIENT_ID'],
//             auth_uri: process.env['GOOGLE_AUTH_URI'],
//             token_uri: process.env['GOOGLE_TOKEN_URI'],
//             auth_provider_x509_cert_url: process.env['GOOGLE_AUTH_PROVIDER_CERT_URL'],
//             client_x509_cert_url: process.env['GOOGLE_CLIENT_CERT_URL'],
//             universe_domain: process.env['GOOGLE_UNIVERSE_DOMAIN'],
//         };

//         const options = {
//             email: credentials.client_email,
//             key: credentials.private_key,
//             scopes: ['https://www.googleapis.com/auth/calendar'], // Calendar API scope
//         }

//         // Initialize the JWT client
//         const auth = new google.auth.JWT(options);

//         // Initialize Calendar API client
//         const calendar = google.calendar({ version: 'v3', auth });
//         return calendar
//     } catch (error) {
//         console.error('Error reading calendar:', error);
//     }
//     return undefined!
// }



// config()
// const SCOPES = ['https://www.googleapis.com/auth/calendar']; // Calendar API scope

/// Used once to get the token.d
// export const getRefreshToken = async () => {
//     try {
//         // Load credentials from environment variables
//         const credentials = {
//             client_id: process.env['GOOGLE_CLIENT_ID'],
//             client_secret: process.env['GOOGLE_CLIENT_SECRET'],
//             redirect_uri: process.env['GOOGLE_REDIRECT_URI'], // Update to your redirect URI
//         };

//         if (!credentials.client_id || !credentials.client_secret || !credentials.redirect_uri) {
//             throw new Error('Missing OAuth credentials in environment variables.');
//         }

//         // Initialize OAuth2 client
//         const oAuth2Client = new google.auth.OAuth2(
//             credentials.client_id,
//             credentials.client_secret,
//             credentials.redirect_uri
//         );

//         // Generate the authorization URL
//         const authUrl = oAuth2Client.generateAuthUrl({
//             access_type: 'offline',
//             scope: SCOPES,
//             prompt: 'consent' // Force the consent screen to show again
//         });

//         console.log('Authorize this app by visiting this URL:', authUrl);

//         // Wait for the authorization code from the user
//         const code = await getAuthorizationCode();
//         // console.log('code', code)
//         const { tokens } = await oAuth2Client.getToken(code);
//         oAuth2Client.setCredentials(tokens);

//         console.log('Tokens acquired:', tokens);

//         // Initialize Calendar API client
//         const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
//         return calendar;
//     } catch (error) {
//         console.error('Error setting up OAuth client:', error);
//         return undefined!;
//     }
// };

// Function to get the authorization code from the user
// const getAuthorizationCode = (): Promise<string> => {
//     const rl = readline.createInterface({
//         input: process.stdin,
//         output: process.stdout,
//     });

//     return new Promise((resolve) => {
//         rl.question('Enter the code from the authorization URL here: ', (code) => {
//             rl.close();
//             resolve(code.trim());
//         });
//     });
// };

