import { ExtensionState, Email, UserPreferences } from '../types';
import { APIClient } from '../services/api-client';
import { SecurityManager } from '../services/security-manager';
import { config } from '../config';

class BackgroundService {
  private state: ExtensionState;
  private apiClient: APIClient;
  private securityManager: SecurityManager;

  constructor() {
    this.state = {
      isAuthenticated: false,
      currentEmail: null,
      suggestions: [],
      settings: {
        theme: 'light',
        notifications: true,
        aiEnabled: true,
        privacyLevel: 'high'
      }
    };

    this.apiClient = new APIClient(config.OPENAI_API_KEY);
    this.securityManager = new SecurityManager(
      config.ENCRYPTION_KEY,
      config.SALT
    );

    // Initialize immediately
    this.init().catch(console.error);
  }

  async init() {
    await this.handleAuth();
    this.setupMessageListeners();
  }

  private async handleAuth() {
    try {
      const token = await chrome.storage.local.get('authToken');
      if (token.authToken) {
        if (this.securityManager.validateToken(token.authToken)) {
          this.state.isAuthenticated = true;
        } else {
          await this.refreshToken();
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  }

  private async refreshToken() {
    try {
      await this.securityManager.refreshTokenIfNeeded();
      this.state.isAuthenticated = true;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.state.isAuthenticated = false;
    }
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'ANALYZE_EMAIL':
          this.handleEmailAnalysis(message.data);
          break;
        case 'GENERATE_RESPONSE':
          this.handleResponseGeneration(message.data);
          break;
        case 'UPDATE_PREFERENCES':
          this.handlePreferencesUpdate(message.data);
          break;
        case 'GET_STATE':
          sendResponse(this.state);
          break;
      }
    });
  }

  private async handleEmailAnalysis(email: Email) {
    try {
      const analysis = await this.apiClient.analyzeEmail(email);
      this.state.currentEmail = email;
      this.state.suggestions = this.convertAnalysisToSuggestions(analysis);
      
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_COMPLETE',
        data: analysis
      });
    } catch (error) {
      console.error('Email analysis error:', error);
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private async handleResponseGeneration(context: any) {
    try {
      const response = await this.apiClient.generateResponse(context);
      chrome.runtime.sendMessage({
        type: 'RESPONSE_GENERATED',
        data: response
      });
    } catch (error) {
      console.error('Response generation error:', error);
      chrome.runtime.sendMessage({
        type: 'RESPONSE_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private async handlePreferencesUpdate(preferences: UserPreferences) {
    try {
      const encrypted = await this.securityManager.encryptData(preferences);
      await chrome.storage.local.set({ preferences: encrypted });
      this.state.settings = { ...this.state.settings, ...preferences };
      
      chrome.runtime.sendMessage({
        type: 'PREFERENCES_UPDATED',
        data: this.state.settings
      });
    } catch (error) {
      console.error('Preferences update error:', error);
      chrome.runtime.sendMessage({
        type: 'PREFERENCES_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }

  private convertAnalysisToSuggestions(analysis: any) {
    return [
      ...analysis.keyPoints.map((point: string) => ({
        id: `key-point-${Date.now()}`,
        type: 'action',
        content: point,
        confidence: 0.8,
        context: 'email-analysis'
      })),
      ...analysis.suggestedActions.map((action: string) => ({
        id: `action-${Date.now()}`,
        type: 'action',
        content: action,
        confidence: 0.7,
        context: 'email-analysis'
      }))
    ];
  }
}

// Initialize the service worker
const backgroundService = new BackgroundService(); 