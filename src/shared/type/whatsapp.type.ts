// src/shared/types/whatsapp-webhook.interface.ts
export interface WhatsAppWebhookPayload {
  // Webhook data structure based on Green API format
  typeWebhook: string;
  instanceData: {
    idInstance: string;
    wid: string;
    typeInstance: string;
  };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    chatName: string;
    sender: string;
    senderName: string;
    senderContactName: string;
  };
  messageData: {
    typeMessage: string;
    textMessageData?: {
      textMessage: string;
    };
    fileMessageData?: {
      downloadUrl: string;
      fileName: string;
      caption?: string;
    };
    locationMessageData?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    extendedTextMessageData?: {
      text: string;
      stanzaId: string;
      participant?: string;
    };
    quotedMessage: {
      stanzaId: string;
      participant: string;
      typeMessage: string;
      textMessage: string;
    }
  };
}

export interface WhatsAppSendMessageRequest {
  mobile: string;
  message: string;
}

export interface WhatsAppSendFileRequest {
  mobile: string;
  fileUrl: string;
  fileName: string;
  caption?: string;
}

export interface WhatsAppSendButtonsRequest {
  mobile: string;
  message: string;
  buttons: Array<{
    id: string;
    text: string;
  }>;
}

export interface WhatsAppSendTemplateRequest {
  mobile: string;
  templateName: string;
  language: string;
  headerParams?: string[];
  bodyParams?: string[];
}

export interface WhatsAppResponse {
  idMessage: string;
  status: string;
  message?: string;
}


export interface WhatsAppResponse1 {
  success: boolean;
  message: string;
}

export interface WhatsAppPlatformLinkRequest {
  mobile: string;
  clientId: string;
  requestId: string;
}

export interface WhatsAppPlatformLinkResponse {
  url: string;
  success: boolean;
  message?: string;
}


export interface WhatsAppMessageReceivedInfo {
    isFromBot: boolean;
    fromMobile: string;//unique
    fromName: string;
    chatId: string;
    text: string;
    success: boolean,
    error: string,
    received: Date
}
