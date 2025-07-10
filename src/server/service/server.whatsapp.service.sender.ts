// src/server/services/whatsapp.service.ts
import { remult } from 'remult';
import { WhatsAppConversation } from '../../shared/entity/conversation.entity';
import { WhatsAppPlatformLinkRequest, WhatsAppPlatformLinkResponse, WhatsAppResponse, WhatsAppSendMessageRequest } from '../../shared/type/whatsapp.type';

export class ServerWhatsAppServiceSender {

  // private static clientUrl = process.env['CLIENT_URL'] as string || '';
  // private static apiUrl = 'https://api.green-api.com';
  // private static instanceId = process.env['GREEN_API_INSTANCE_ID'] as string || '';
  // private static apiToken = process.env['GREEN_API_TOKEN'] as string || '';


  /**
   * יוצר קישור פלטפורמה מלא עם Magic Token ו-returnUrl.
   * מתודה זו אינה ניגשת לאובייקט ה-Request המקורי ישירות,
   * ומסתמכת על platformUrl שמוגדר כמשתנה מחלקה (ממשתנה סביבה).
   * @param reqData הנתונים הנדרשים ליצירת הקישור (mobile, clientId, requestId).
   * @returns אובייקט המכיל את ה-URL המלא, סטטוס הצלחה והודעה.
   */
  // Note: If this is intended to be an exposed API endpoint using Remult's @backendMethod,
  // it would typically look like: @backendMethod({ allowed: true })
  // For simplicity, keeping it as a regular class method as per the latest context.
  static async sendPlatformLink(reqData: WhatsAppPlatformLinkRequest): Promise<WhatsAppPlatformLinkResponse> {
    const result: WhatsAppPlatformLinkResponse = { url: '', success: false, message: '' };

    try {
      // 1. חילוץ הנתונים מהבקשה
      // השם שונה מ-'req' ל-'reqData' כדי להדגיש שזה לא אובייקט ה-Request של Express.
      const { mobile, clientId, requestId } = reqData;

      // 2. בניית נתיב ה-returnUrl הספציפי בתוך האפליקציה
      const specificClientRequestPath = `/client/${clientId}/request/${requestId}`;

      // 3. יצירת "Magic Token" (טוקן התחברות חד פעמי)
      // *** חשוב: החלף זאת בלוגיקת יצירת טוקן אבטחתי אמיתית בצד השרת! ***
      // השתמש ב-mobile וב-clientId כדי לקשר את הטוקן למשתמש הרלוונטי.
      const magicToken = `SECURE_MAGIC_TOKEN_FOR_${mobile}_${clientId}_${Date.now()}`;

      // 4. בניית הלינק המלא באמצעות אובייקט URL
      // השימוש ב-this.platformUrl המוגדר כמשתנה מחלקה.
      const clientUrl = process.env['CLIENT_URL'] as string || '';
      const fullLoginLink = new URL('/login', clientUrl);
      fullLoginLink.searchParams.set('token', magicToken);
      fullLoginLink.searchParams.set('returnUrl', specificClientRequestPath);

      const finalLinkToSend = fullLoginLink.toString();

      // 5. הגדרת התגובה במקרה של הצלחה
      result.url = finalLinkToSend;
      result.success = true;
      result.message = 'קישור הפלטפורמה נוצר בהצלחה.';

    } catch (error: any) {
      // 6. טיפול בשגיאות
      console.error('Error generating platform link:', error);
      result.success = false;
      result.message = `שגיאה ביצירת קישור לפלטפורמה: ${error.message || 'שגיאה לא ידועה'}`;
      result.url = '';
    }

    // 7. החזרת התגובה
    return result;
  }

  /**
   * Send a WhatsApp message to a specified mobile number
   * @param data Object containing mobile number and message
   * @returns Response from the API
   */
  static async sendMessage(data: WhatsAppSendMessageRequest): Promise<WhatsAppResponse> {
    const result = {} as WhatsAppResponse
    const apiUrl = 'https://api.green-api.com';
    const instanceId = process.env['GREEN_API_INSTANCE_ID'] as string || '';
    const apiToken = process.env['GREEN_API_TOKEN'] as string || '';

    try {
      // Format mobile number (remove + if present, ensure country code)
      const formattedMobile = this.formatMobileNumber(data.mobile);
      console.log(`Sending message to: ${formattedMobile}`);
      //https://baa2-2a00-a040-191-c74c-98b1-7de8-6d25-5668.ngrok-free.app/api/wapp/received?key=bto-mortgage-wapp-api-key
      // Prepare request payload
      const payload = {
        chatId: `${formattedMobile}@c.us`,
        message: data.message
      };
      console.log(`payload: ${JSON.stringify(payload)}`);
      console.log(`url: ${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`);

      // Make API request
      const response = await fetch(
        `${apiUrl}/waInstance${instanceId}/sendMessage/${apiToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        console.log(`ERROR: ${response.status} ${response.statusText}`);
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
      }

      result.idMessage = await response.json();
      result.status = 'sent'
    } catch (error) {
      result.message = `Error sending WhatsApp message: ${error}`
      console.error(result.message);
    }
    return result
  }

  /**
   * Send a WhatsApp message with deduplication logic.
   * Updates conversation state after sending.
   * @param conversation The current WhatsAppConversation entity.
   * @param message The message text to send.
   * @returns WhatsAppResponse The response from the API.
   */
  static async sendWhatsAppMessageWithDeduplication(
    conversation: WhatsAppConversation,
    message: string
  ): Promise<WhatsAppResponse> {
    const conversationRepo = remult.repo(WhatsAppConversation);

    // Prevent duplicate outgoing messages (within 5 seconds)
    // and prevent sending the exact same message again immediately
    if (conversation.lastSentMessageText === message &&
      (new Date().getTime() - conversation.lastSentMessageTime.getTime()) < 5000) {
      console.warn(`Duplicate outgoing message detected for ${conversation.chatId}, ignoring.`);
      return { idMessage: 'duplicate-outgoing', status: 'ignored', message: 'Duplicate outgoing message' };
    }

    const response = await this.sendMessage({
      mobile: conversation.fromMobile,
      message: message
    });

    if (response.status === 'sent') {
      // Update conversation state only if the message was actually sent
      conversation.lastSentMessageText = message;
      conversation.lastSentMessageTime = new Date();
      conversation.updatedAt = new Date();
      // שמירה של השינויים באובייקט השיחה
      await conversationRepo.save(conversation).catch(err => console.error('Error saving conversation after send:', err));
    }

    return response;
  }

  /**
   * Send a verification code via WhatsApp
   * @param mobile Mobile number to send verification code to
   * @returns Verification code
   */
  static async sendVerificationCode(mobile: string): Promise<string> {
    try {
      // Generate a random 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Send the verification code via WhatsApp
      await this.sendMessage({
        mobile,
        message: `Your verification code is: ${code}`
      });

      return code;
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw error;
    }
  }

  // /**
  //  * Send a file (document, image, etc.) via WhatsApp
  //  * @param data Object containing mobile number, file URL and caption
  //  * @returns Response from the API
  //  */
  // static async sendFile(data: WhatsAppSendFileRequest): Promise<WhatsAppResponse> {
  //   try {
  //     const formattedMobile = this.formatMobileNumber(data.mobile);

  //     const payload = {
  //       chatId: `${formattedMobile}@c.us`,
  //       urlFile: data.fileUrl,
  //       fileName: data.fileName,
  //       caption: data.caption || ''
  //     };

  //     const response = await fetch(
  //       `${this.apiUrl}/waInstance${this.instanceId}/sendFileByUrl/${this.apiToken}`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify(payload)
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
  //     }

  //     return await response.json();
  //   } catch (error) {
  //     console.error('Error sending WhatsApp file:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Send an interactive buttons message via WhatsApp
  //  * @param data Object containing mobile number, message and buttons
  //  * @returns Response from the API
  //  */
  // static async sendButtons(data: WhatsAppSendButtonsRequest): Promise<WhatsAppResponse> {
  //   try {
  //     const formattedMobile = this.formatMobileNumber(data.mobile);

  //     const payload = {
  //       chatId: `${formattedMobile}@c.us`,
  //       message: data.message,
  //       buttons: data.buttons.map(button => ({
  //         buttonId: button.id,
  //         buttonText: {
  //           displayText: button.text
  //         },
  //         type: 0
  //       }))
  //     };

  //     const response = await fetch(
  //       `${this.apiUrl}/waInstance${this.instanceId}/sendButtons/${this.apiToken}`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify(payload)
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
  //     }

  //     return await response.json();
  //   } catch (error) {
  //     console.error('Error sending WhatsApp buttons:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Send a template message (for initial contact with users who haven't opted in)
  //  * @param data Object containing mobile number and template details
  //  * @returns Response from the API
  //  */
  // static async sendTemplate(data: WhatsAppSendTemplateRequest): Promise<WhatsAppResponse> {
  //   try {
  //     const formattedMobile = this.formatMobileNumber(data.mobile);

  //     const components = [];

  //     // Add header parameters if provided
  //     if (data.headerParams && data.headerParams.length > 0) {
  //       components.push({
  //         type: 'header',
  //         parameters: data.headerParams.map(param => ({ type: 'text', text: param }))
  //       });
  //     }

  //     // Add body parameters if provided
  //     if (data.bodyParams && data.bodyParams.length > 0) {
  //       components.push({
  //         type: 'body',
  //         parameters: data.bodyParams.map(param => ({ type: 'text', text: param }))
  //       });
  //     }

  //     const payload = {
  //       chatId: `${formattedMobile}@c.us`,
  //       template: {
  //         name: data.templateName,
  //         language: {
  //           code: data.language || 'he'
  //         },
  //         components
  //       }
  //     };

  //     const response = await fetch(
  //       `${this.apiUrl}/waInstance${this.instanceId}/sendTemplate/${this.apiToken}`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify(payload)
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
  //     }

  //     return await response.json();
  //   } catch (error) {
  //     console.error('Error sending WhatsApp template:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Check if a mobile number exists on WhatsApp
  //  * @param mobile Mobile number to check
  //  * @returns Whether the number exists on WhatsApp
  //  */
  // static async checkNumberExists(mobile: string): Promise<boolean> {
  //   try {
  //     const formattedMobile = this.formatMobileNumber(mobile);

  //     const response = await fetch(
  //       `${this.apiUrl}/waInstance${this.instanceId}/checkWhatsapp/${this.apiToken}`,
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json'
  //         },
  //         body: JSON.stringify({
  //           phoneNumber: formattedMobile
  //         })
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error(`WhatsApp API error: ${response.status} ${response.statusText}`);
  //     }

  //     const data = await response.json();
  //     return data.exists === true;
  //   } catch (error) {
  //     console.error('Error checking if number exists on WhatsApp:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Send a notification about a status change
  //  * @param mobile Mobile number to send notification to
  //  * @param requestId Mortgage request ID
  //  * @param status New status
  //  * @param additionalInfo Additional information
  //  * @returns Response from the API
  //  */
  // static async sendStatusNotification(
  //   mobile: string,
  //   requestId: string,
  //   status: string,
  //   additionalInfo?: string
  // ): Promise<WhatsAppResponse> {
  //   const message = `הודעת עדכון סטטוס עבור בקשה #${requestId}:\n` +
  //     `סטטוס חדש: ${status}\n` +
  //     (additionalInfo ? `מידע נוסף: ${additionalInfo}` : '');

  //   return await this.sendMessage({
  //     mobile,
  //     message
  //   });
  // }

  // /**
  //  * Send an appointment reminder
  //  * @param mobile Mobile number to send reminder to
  //  * @param requestId Mortgage request ID
  //  * @param appointmentDate Appointment date
  //  * @param location Location of the appointment
  //  * @returns Response from the API
  //  */
  // static async sendAppointmentReminder(
  //   mobile: string,
  //   requestId: string,
  //   appointmentDate: Date,
  //   location?: string
  // ): Promise<WhatsAppResponse> {
  //   // Format the date to a readable string in Hebrew
  //   const dateOptions: Intl.DateTimeFormatOptions = {
  //     weekday: 'long',
  //     year: 'numeric',
  //     month: 'long',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   };

  //   const formattedDate = appointmentDate.toLocaleDateString('he-IL', dateOptions);

  //   const message = `תזכורת: פגישה בנושא בקשת משכנתה #${requestId}\n` +
  //     `תאריך: ${formattedDate}\n` +
  //     (location ? `מיקום: ${location}\n` : '') +
  //     'אנא אשרו את הגעתכם או צרו קשר במידה ותרצו לשנות את מועד הפגישה.';

  //   return await this.sendMessage({
  //     mobile,
  //     message
  //   });
  // }

  // /**
  //  * Send a document request notification
  //  * @param mobile Mobile number to send notification to
  //  * @param requestId Mortgage request ID
  //  * @param documentTypes Array of required document types
  //  * @returns Response from the API
  //  */
  // static async sendDocumentRequest(
  //   mobile: string,
  //   requestId: string,
  //   documentTypes: string[]
  // ): Promise<WhatsAppResponse> {
  //   let documentsText = '';

  //   for (let i = 0; i < documentTypes.length; i++) {
  //     documentsText += `${i + 1}. ${documentTypes[i]}\n`;
  //   }

  //   const message = `בקשה למסמכים עבור בקשת משכנתה #${requestId}:\n\n` +
  //     `נדרשים המסמכים הבאים:\n${documentsText}\n` +
  //     'אנא העלו את המסמכים בהקדם לקידום טיפול בבקשה.';

  //   return await this.sendMessage({
  //     mobile,
  //     message
  //   });
  // }

  /**
   * Format mobile number to WhatsApp API requirements
   * @param mobile Mobile number to format
   * @returns Formatted mobile number
   */
  private static formatMobileNumber(mobile: string): string {
    // Remove any non-digit characters
    let formattedNumber = mobile.replace(/\D/g, '');

    // Remove leading + if present
    if (formattedNumber.startsWith('+')) {
      formattedNumber = formattedNumber.substring(1);
    }

    // Ensure country code (default to Israel 972)
    if (formattedNumber.startsWith('0')) {
      formattedNumber = '972' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('972')) {
      // If doesn't start with country code, add it
      formattedNumber = '972' + formattedNumber;
    }

    return formattedNumber;
  }

}
