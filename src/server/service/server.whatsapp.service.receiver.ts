// src/server/services/whatsapp.service.receiver.ts

import { remult } from 'remult';
import { terms } from '../../shared/config/terms';
import { WhatsAppConversation } from '../../shared/entity/conversation.entity';
import { MortgageRequest } from '../../shared/entity/request.entity';
import { User } from '../../shared/entity/user.entity'; // ודא שישות User קיימת
import { RequestStatus } from '../../shared/enum/request-status.enum';
import { RequestType } from '../../shared/enum/request-type.enum';
import { WhatsAppMessageReceivedInfo, WhatsAppResponse } from '../../shared/type/whatsapp.type';
import { ServerWhatsAppServiceSender } from './server.whatsapp.service.sender';

interface ValidationResult<T> {
  isValid: boolean;
  parsedData?: T;
  errorMessage?: string;
}

export class ServerWhatsAppServiceReceived {

  private static platformUrl = process.env['CLIENT_URL'];
  private static sender = new ServerWhatsAppServiceSender();

  /**
   * Main method to handle incoming WhatsApp messages from the webhook.
   * Manages conversation state, identifies/creates users, and directs to platform.
   * @param messageInfo Object containing details of the received message.
   * @returns WhatsAppResponse The response to send back via WhatsApp API.
   */
  static async onMessageReceived(messageInfo: WhatsAppMessageReceivedInfo): Promise<WhatsAppResponse> {
    const conversationRepo = remult.repo(WhatsAppConversation);
    const mortgageRequestRepo = remult.repo(MortgageRequest);

    let conversation: WhatsAppConversation | undefined | null;
    let response: WhatsAppResponse = { idMessage: '', status: '', message: '' };

    try {
      console.log('Received WhatsApp message:', messageInfo);

      if (!messageInfo.chatId) {
        console.warn('Received message without chatId, ignoring:', messageInfo);
        return { idMessage: 'no-chat-id', status: 'error', message: 'No chatId provided' };
      }

      // 1. זיהוי/יצירת לקוח:
      const user = await ServerWhatsAppServiceReceived.ensureUserExists(
        messageInfo.fromMobile,
        messageInfo.fromName || messageInfo.fromMobile
      );

      // 2. ניהול שיחה וסטטוס:
      conversation = await conversationRepo.findFirst(
        { chatId: messageInfo.chatId },
        { orderBy: { createdAt: 'desc' } });

      // מניעת כפילויות הודעות נכנסות (within 5 seconds)
      if (conversation &&
        conversation.lastReceivedMessageText === messageInfo.text &&
        (new Date().getTime() - conversation.lastReceivedMessageTime.getTime()) < 5000) {
        console.warn(`Duplicate incoming message detected for ${messageInfo.chatId}, ignoring.`);
        return { idMessage: 'duplicate-incoming', status: 'ignored', message: 'Duplicate incoming message' };
      }

      // עדכון או יצירת מצב שיחה
      if (!conversation) {
        conversation = conversationRepo.create({
          chatId: messageInfo.chatId,
          fromMobile: messageInfo.fromMobile,
          fromName: messageInfo.fromName || messageInfo.fromMobile,
          currentStep: 'initial_greeting',
          createdAt: new Date(),
          lastReceivedMessageTime: new Date(),
          lastSentMessageTime: new Date(),
          context: {}
        });
        console.log(`New conversation created for ${conversation.id}`);
      }

      // עדכון מידע על ההודעה האחרונה שהתקבלה
      conversation.lastReceivedMessageText = messageInfo.text;
      conversation.lastReceivedMessageTime = new Date();
      conversation.updatedAt = new Date();

      const lowerCaseText = messageInfo.text.toLowerCase().trim();

      // --- לוגיקת שיחה ראשית מבוססת על currentStep ---
      switch (conversation.currentStep) {
        case 'initial_greeting':
        case 'unrecognized_input':
          if (ServerWhatsAppServiceReceived.isInitialGreeting(lowerCaseText)) { // (התחלה/בקשה)
            const ongoingRequest = await ServerWhatsAppServiceReceived.getOngoingMortgageRequest(user);
            if (ongoingRequest) {
              const link = ServerWhatsAppServiceReceived.getRelevantRequestLink(user, ongoingRequest);
              response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                conversation,
                terms.existingRequestFound(ongoingRequest.id, ongoingRequest.status.caption, link, user.name || user.mobile)
              );
              // <--- שינוי: אין צורך לשנות סטטוס ל-awaiting_documents/refinance_documents
              // הבוט פשוט יאשר את הלינק ויחזור למצב המתנה כללי
              conversation.currentStep = 'initial_greeting'; // חזור למצב התחלתי או המתן לתגובה נוספת
            } else {
              response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                conversation,
                `${terms.greeting(user.name || user.mobile)}\n${terms.mainMenu}`
              );
              conversation.currentStep = 'awaiting_service_option';
            }
          } else {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.unrecognizedInput
            );
            conversation.currentStep = 'unrecognized_input';
          }
          break;

        case 'awaiting_service_option':
          const optionValidation = ServerWhatsAppServiceReceived.validateServiceOption(lowerCaseText);
          if (optionValidation.isValid && optionValidation.parsedData !== undefined) {
            switch (optionValidation.parsedData) {
              case 1: // בקשה חדשה למשכנתה
                conversation.selectedRequestType = RequestType.new;
                const newMortgageLink = ServerWhatsAppServiceReceived.getNewRequestFormLink(user, RequestType.new);
                response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                  conversation,
                  terms.newMortgageRequestPrompt(newMortgageLink)
                );
                // <--- שינוי: אין צורך לשנות סטטוס ל-awaiting_documents_upload
                conversation.currentStep = 'initial_greeting'; // חזור למצב התחלתי
                break;
              case 2: // מחזור משכנתה
                conversation.selectedRequestType = RequestType.renew;
                const refinanceLink = ServerWhatsAppServiceReceived.getNewRequestFormLink(user, RequestType.renew);
                response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                  conversation,
                  terms.refinanceRequestPrompt(refinanceLink)
                );
                // <--- שינוי: אין צורך לשנות סטטוס ל-awaiting_refinance_documents
                conversation.currentStep = 'initial_greeting'; // חזור למצב התחלתי
                break;
              case 3: // בדיקת סטטוס בקשה קיימת
                response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                  conversation,
                  terms.statusCheckPrompt
                );
                conversation.currentStep = 'awaiting_id_for_status_check';
                break;
              case 4: // יצירת קשר עם נציג
                response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                  conversation,
                  terms.contactAgentPrompt
                );
                conversation.currentStep = 'awaiting_operator_contact';
                break;
            }
          } else {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              optionValidation.errorMessage || terms.invalidOption
            );
            conversation.currentStep = 'awaiting_service_option';
          }
          break;

        case 'awaiting_new_mortgage_details': // שלבים אלו כבר לא אמורים לטפל בקלט ישיר
        case 'awaiting_refinance_details':     // שלבים אלו כבר לא אמורים לטפל בקלט ישיר
          // <--- שינוי: קטעי קוד אלו עדיין רלוונטיים אם הלקוח מגיב בשלב זה,
          // אך הם לא אמורים להיות ה-currentStep שהבוט מעביר אליו לאחר שליחת לינק
          const currentRequestType = conversation.selectedRequestType;
          if (currentRequestType === RequestType.new || currentRequestType === RequestType.renew) {
            const retryLink = ServerWhatsAppServiceReceived.getNewRequestFormLink(user, currentRequestType);
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.directInputError(retryLink)
            );
          } else {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.unhandledStateFallback
            );
          }
          conversation.currentStep = 'initial_greeting';
          break;

        case 'awaiting_id_for_status_check':
          const statusIdValidation = ServerWhatsAppServiceReceived.validateIdForStatusCheck(messageInfo.text);
          if (statusIdValidation.isValid && statusIdValidation.parsedData) {
            const idToSearch = statusIdValidation.parsedData;
            conversation.context.idForStatusCheck = idToSearch;

            let targetUserId: string | undefined;
            const potentialUser = await remult.repo(User).findFirst({
              $or: [
                { id: idToSearch },
                { mobile: idToSearch }
              ]
            });

            if (potentialUser) {
              targetUserId = potentialUser.id;
            } else {
              targetUserId = idToSearch;
            }

            const existingRequest = await mortgageRequestRepo.findFirst({
              $or: [
                { id: idToSearch },
                { customerId: targetUserId }
              ]
            });

            if (existingRequest) {
              const platformLink = `${ServerWhatsAppServiceReceived.platformUrl}/status-check?requestId=${existingRequest.id}`;
              response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                conversation,
                `סטטוס בקשתך #${existingRequest.id} (${RequestType.getAllTypes().find(rt => rt.id === existingRequest.requestType.id)?.caption}):\n*${existingRequest.status.caption}*.\nלפרטים נוספים: ${platformLink}`
              );
            } else {
              response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
                conversation,
                terms.requestNotFound
              );
              conversation.currentStep = 'awaiting_id_for_status_check';
            }
            conversation.currentStep = 'initial_greeting';
          } else {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              statusIdValidation.errorMessage || terms.invalidIdFormat
            );
            conversation.currentStep = 'awaiting_id_for_status_check';
          }
          break;

        // <--- הסר את case 'awaiting_documents_upload' ו- 'awaiting_refinance_documents'
        // הם כבר לא משמשים כ-currentStep שהבוט מעביר אליו
        // אם המשתמש יגיב כשהוא בשלב מילוי טופס בפלטפורמה, הוא יחזור ל-initial_greeting
        // ומכיוון שיש לו בקשה פעילה, הבוט יציג לו שוב את הלינק לבקשה הקיימת.
        // זהו מנגנון "חזרה חכמה" לתהליך.

        case 'awaiting_operator_contact':
          response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
            conversation,
            terms.agentContactPending
          );
          if (lowerCaseText.includes('התחל מחדש') || lowerCaseText.includes('תפריט')) {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.backToMainMenu
            );
            conversation.currentStep = 'initial_greeting';
          }
          break;

        case 'error_state':
          if (lowerCaseText.includes('התחל מחדש') || lowerCaseText.includes('שלום')) {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.backToMainMenu
            );
            conversation.currentStep = 'initial_greeting';
            conversation.context = {};
          } else {
            response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
              conversation,
              terms.errorHandler
            );
          }
          break;

        default:
          console.log(`Unhandled state '${conversation.currentStep}' for ${conversation.fromMobile}. Sending generic fallback.`);
          response = await ServerWhatsAppServiceSender.sendWhatsAppMessageWithDeduplication(
            conversation,
            terms.unhandledStateFallback
          );
          conversation.currentStep = 'unrecognized_input';
          break;
      }

      await conversationRepo.save(conversation);
      console.log(`Conversation state for ${conversation.chatId} updated to: ${conversation.currentStep}`);
      console.log('response.status', response.status);

    } catch (error) {
      console.error('Error processing received WhatsApp message:', error);
      response = { idMessage: '', status: 'error', message: 'Error processing received WhatsApp message: ' + (error as Error).message };
      if (conversation) {
        conversation.currentStep = 'error_state';
        conversation.context.lastError = (error as Error).message;
        await conversationRepo.save(conversation).catch(saveErr => console.error('Error saving conversation error state:', saveErr));
      }
    }
    return response;
  }

  // --- PRIVATE STATIC HELPER METHODS ---

  // ... (שאר המתודות ensureUserExists, getRelevantRequestLink, getNewRequestFormLink, getOngoingMortgageRequest, validate functions, etc.) ...

  // **הערה חשובה:**
  // המתודה getClientLink אינה בשימוש בלוגיקה הראשית של onMessageReceived.
  // אם אין לה שימוש אחר בפרויקט, ניתן להסיר אותה.
  // אם משתמשים בה, ודא שהיא תקינה ולא מנסה לקרוא למתודות לא קיימות ב-sender.
  // static getClientLink = async (mobile = '', clientId = '', requestId = '') => {
  //   // דוגמה לתיקון אם המתודה נחוצה לייצור לינק בלבד:
  //   const url = `${ServerWhatsAppServiceReceived.platformUrl}/client?mobile=${mobile}&clientId=${clientId}&requestId=${requestId}`;
  //   console.log('Platform link generated:', url);
  //   return { success: true, url: url, message: 'Link generated' }; // החזר אובייקט תגובה
  // };


  private static async ensureUserExists(mobile: string, name: string): Promise<User> {
    const userRepo = remult.repo(User);
    let user = await userRepo.findFirst({ mobile });

    if (!user) {
      user = userRepo.create({ mobile, name, customer: true });
      await userRepo.save(user);
      console.log(`New user created: ${user.name} (${user.mobile})`);
    } else {
      if (!user.name || user.name === user.mobile) {
        user.name = name;
        await userRepo.save(user);
        console.log(`Updated user name to: ${user.name} for ${user.mobile}`);
      }
      console.log(`Existing user found: ${user.name} (${user.mobile})`);
    }
    return user;
  }

  private static getRelevantRequestLink(user: User, ongoingRequest: MortgageRequest): string {
    const needsToCompleteForm = [
      RequestStatus.NEW,
      RequestStatus.WAITING_FOR_SELECTION,
      RequestStatus.QUESTIONNAIRE_IN_PROGRESS,
      RequestStatus.WAITING_FOR_DOCUMENTS,
      RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS,
      RequestStatus.WAITING_FOR_CLIENT_RESPONSE
    ];

    if (needsToCompleteForm.includes(ongoingRequest.status)) {
      let stageParam = 'new-request';
      if (ongoingRequest.status.id === RequestStatus.WAITING_FOR_DOCUMENTS.id || ongoingRequest.status.id === RequestStatus.WAITING_FOR_ADDITIONAL_DOCUMENTS.id) {
        stageParam = 'upload-documents';
      }
      return `${ServerWhatsAppServiceReceived.platformUrl}/client?stage=${stageParam}&requestId=${ongoingRequest.id}&mobile=${user.mobile}`;
    } else {
      return `${ServerWhatsAppServiceReceived.platformUrl}/request/${ongoingRequest.id}`;
    }
  }

  private static getNewRequestFormLink(user: User, requestType: RequestType): string {
    return `${ServerWhatsAppServiceReceived.platformUrl}/client?type=${requestType.id}&mobile=${user.mobile}`;
  }

  private static async getOngoingMortgageRequest(user: User): Promise<MortgageRequest | null> {
    const mortgageRequestRepo = remult.repo(MortgageRequest);
    const ongoingRequest = await mortgageRequestRepo.findFirst({
      customerId: user.id,
      status: { $nin: [RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELED] }
    }, {
      orderBy: { createdAt: "desc" }
    });
    if (ongoingRequest && !RequestStatus.isCompletedStatus(ongoingRequest.status)) {
      return ongoingRequest;
    }
    return null;
  }

  private static isInitialGreeting(text: string): boolean {
    return text.includes('שלום') ||
      text.includes('היי') ||
      text.includes('מעוניין') ||
      text.includes('אני רוצה') ||
      text.includes('התעניינות') ||
      text.includes('משכנתא') ||
      text.includes('משכנתה') ||
      text.includes('התחל מחדש');
  }

  private static validateServiceOption(text: string): ValidationResult<number> {
    const num = parseInt(text);
    if (!isNaN(num) && num >= 1 && num <= 4) {
      return { isValid: true, parsedData: num };
    }
    return { isValid: false, errorMessage: terms.invalidOption };
  }

  private static validateNewMortgageDetails(text: string): ValidationResult<{ clientName: string, requestedAmount: number }> {
    const parts = text.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const clientName = parts[0];
      const requestedAmount = Number(parts[1]);

      if (clientName && !isNaN(requestedAmount) && requestedAmount > 0) {
        return { isValid: true, parsedData: { clientName, requestedAmount } };
      }
    }
    return { isValid: false, errorMessage: terms.invalidNewMortgageFormat };
  }

  private static validateRefinanceDetails(text: string): ValidationResult<{ loanType: string, outstandingAmount: number }> {
    const parts = text.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      const loanType = parts[0];
      const outstandingAmount = Number(parts[1]);

      if (loanType && !isNaN(outstandingAmount) && outstandingAmount > 0) {
        return { isValid: true, parsedData: { loanType, outstandingAmount } };
      }
    }
    return { isValid: false, errorMessage: terms.invalidRefinanceFormat };
  }

  private static validateIdForStatusCheck(text: string): ValidationResult<string> {
    const trimmedText = text.trim();
    if (trimmedText.length > 0) {
      return { isValid: true, parsedData: trimmedText };
    }
    return { isValid: false, errorMessage: terms.invalidIdFormat };
  }
}
