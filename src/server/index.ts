import './service/server.calendar'
import { getEvents } from './service/server.calendar';

import compression from 'compression';
import session from 'cookie-session';
import * as dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import sslRedirect from 'heroku-ssl-redirect';
import path from 'path';
import { fixPhoneInput } from '../app/common/fields/PhoneField';
import { WhatsAppMessageReceivedInfo, WhatsAppWebhookPayload } from '../shared/type/whatsapp.type';
import { api } from './api';
// import { getEvents } from './service/server.calendar';
import { ServerWhatsAppServiceReceived } from './service/server.whatsapp.service.receiver';
import { CalendarController } from '../shared/controller/calendar.controller';
// import { getEvents } from './service/server.calendar'
// import { GoogleCalendarService } from './service/googleCalendarService'
// import '../server/service/server.gmail.calendar'
// require('../server/service/server.whatsapp.service.sender')
// require('../server/service/server.calendar')
// import geteve from '../server/service/server.calendar'

dotenv.config()
getEvents()
// const events = await getEvents()
// console.log('events',JSON.stringify(events))
// CalendarController.getEventsHandler = async requestId => getEvents() 

// הוסף את המטפל הזה בתחילת הקובץ
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // אופציונלי: קרוס את התהליך לאחר דיווח השגיאה
  // process.exit(1);
});

// SqlDatabase.LogToConsole = true
async function startup() {
  const app = express()
  app.use(sslRedirect())
  app.use(
    '/api',
    session({
      secret:
        process.env['NODE_ENV'] === 'production'
          ? process.env['JWT_SECRET']
          : process.env['JWT_SECRET'],
      maxAge: parseInt(process.env['JWT_EXPIRATION_DAYS'] ?? '7') * 24 * 60 * 60 * 1000
    })
  )
  app.use(compression())
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(express.json());

  app.use(api)
  app.use('/api/wapp/received', api.withRemult, async (req, res) => {
    console.log(`whatsapp.route: { called: '/received', at: ${new Date().toLocaleTimeString()} }`);

    // **שלב 1: אימות מהיר ושליחת תגובה מיידית במקרה של שגיאה קריטית.**
    try {
      const key = req.query['key'] as string;
      if (!key || key !== process.env['SERVER_API_KEY']) {
        console.error('whatsapp.route: API Key is MISSING OR MISMATCHED');
        // שגיאת אבטחה -> ענה מיד ב-403 Forbidden
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid API Key' });
      }

      const payload: WhatsAppWebhookPayload = req.body;
      if (!payload || !payload.senderData || !payload.messageData || !payload.instanceData) {
        console.warn('whatsapp.route: Invalid payload structure received.');
        // מבנה מטען לא תקין -> ענה מיד ב-400 Bad Request
        return res.status(400).json({ success: false, message: 'Bad Request: Invalid payload structure' });
      }

      // **שלב 2: אישור מיידי לצד ג' - זו התגובה ה-HTTP היחידה שנשלחת**
      // הקוד ימשיך לרוץ **אחרי** השורה הזו, אך תגובת ה-HTTP כבר נשלחה.
      res.status(200).json({ success: true, message: 'Message received and acknowledged' });
      console.log('whatsapp.route: Acknowledgment sent to third party.');

      const mobile = fixPhoneInput(payload.senderData?.sender?.split('@')[0]) || ''
      const bot = fixPhoneInput(payload.instanceData?.wid?.split('@')[0]) || ''

      // **שלב 3: עיבוד הודעת הוואטסאפ באופן אסינכרוני (ברקע)**
      // כל השגיאות מנקודה זו ואילך לא יגרמו לתגובת HTTP נוספת,
      // אלא יטופלו באמצעות logging או מנגנוני התראה פנימיים.
      const info: WhatsAppMessageReceivedInfo = {
        isFromBot: false,
        fromMobile: mobile,
        fromName: payload.senderData?.senderContactName || payload.senderData?.senderName || '',
        chatId: payload.senderData?.chatId || '',
        text: payload.messageData?.textMessageData?.textMessage || payload.messageData?.extendedTextMessageData?.text || '',
        success: true, // זה מתייחס לכך שההודעה התקבלה בהצלחה מהפלטפורמה
        received: new Date(payload.timestamp * 1000),
        error: ''
      };
      // חישוב מדויק של isFromBot: האם ההודעה נשלחה מהבוט עצמו (לעיתים הבוטים שולחים הודעות לוג)
      info.isFromBot = bot === mobile;

      if (info.isFromBot) {
        console.log(`whatsapp.route.send.by.bot.himself: { message: ${info.text}, bot: ${bot} }`);
      }
      else {
        console.log(`whatsapp.route: Starting background processing for chatId: ${info.chatId}`);
        const processingResponse = await ServerWhatsAppServiceReceived.onMessageReceived(info);

        // **שלב 4: טיפול בתוצאות העיבוד הפנימי (לוגינג / התראות בלבד)**
        if (!processingResponse.status || processingResponse.status === 'error') {
          console.error('whatsapp.route.onMessageReceived.error: Failed to process message internally:', {
            message: processingResponse.message,
            chatId: info.chatId,
            text: info.text
          });
          // כאן המקום להפעיל מערכת התראות פנימית (לדוגמה, Slack, Sentry, אימייל)
          // notifyInternalTeam('WhatsApp message processing failed', processingResponse.message);
        } else {
          console.log('whatsapp.route: Message successfully processed internally.', {
            idMessage: processingResponse.idMessage,
            status: processingResponse.status,
            chatId: info.chatId
          });
        }
      }
    } catch (error: any) {
      // **שלב 5: טיפול בשגיאות בלתי צפויות**
      // אם שגיאה מתרחשת לפני שליחת האישור הראשון (res.headersSent יהיה false),
      // נשלח שגיאת 500 לצד ג'.
      // אם השגיאה מתרחשת *אחרי* שליחת האישור (res.headersSent יהיה true),
      // לא נוכל לשלוח תגובת HTTP נוספת, אלא רק ללוגג ולהתריע פנימית.
      if (!res.headersSent) {
        console.error(`whatsapp.route: Uncaught error before acknowledgment sent: ${error.message || error}`, error);
        res.status(500).json({ success: false, message: `Internal Server Error: ${error.message || 'Unknown error'}` });
      } else {
        console.error(`whatsapp.route: Uncaught error during background processing: ${error.message || error}`, error);
        // כאן המקום להפעיל מערכת התראות פנימית עבור שגיאות רקע
        // notifyInternalTeam('Critical WhatsApp webhook error during background processing', error);
      }
    }

    // Explicitly return nothing at the end to satisfy TypeScript.
    // The HTTP response has already been sent by this point if all went well.
    return;
  });

  app.use('/api/calendar/events', api.withRemult, async (req, res) => {

    console.log('getEvents..')
    // getEvents()
    //   .then((events) => console.log('event list', events))
    //   .catch((error) => console.error(error))
    console.log('getEvents finished')

  })


  let dist = path.resolve('dist/mortgage-ai/browser')
  if (!fs.existsSync(dist)) {
    dist = path.resolve('../mortgage-ai/browser')
  }
  app.use(express.static(dist))
  app.use('/*', async (req, res) => {
    if (req.headers.accept?.includes('json')) {
      console.log(req)
      res.status(404).json('missing route: ' + req.originalUrl)
      return
    }
    try {
      res.sendFile(dist + '/index.html')
    } catch (err) {
      res.sendStatus(500)
    }
  })
  let port = process.env['PORT'] || 3002
  app.listen(port)
}
startup()
