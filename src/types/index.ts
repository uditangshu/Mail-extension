export interface Email {
  to: string;
  subject: string;
  content: string;
  sender: string;
  recipients: string[];
  timestamp: string;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface Analysis {
  sentiment: string;
  keyPoints: string[];
  suggestedActions: string[];
}

export interface Response {
  content: string;
  tone: string;
  suggestedEdits: string[];
}

export interface EmailContext {
  summary: string;
  tone: string;
  previousEmails?: Email[];
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  aiEnabled: boolean;
  privacyLevel: 'high' | 'medium' | 'low';
}

export interface Suggestion {
  id: string;
  type: 'response' | 'action' | 'improvement';
  content: string;
  confidence: number;
  context: string;
}

export interface ExtensionState {
  isAuthenticated: boolean;
  currentEmail: Email | null;
  suggestions: Suggestion[];
  settings: UserPreferences;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
} 