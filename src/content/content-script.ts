import { Email, Suggestion, Analysis } from '../types';
import { APIClient } from '../services/api-client';
import { SecurityManager } from '../services/security-manager';
import { config } from '../config';

class ContentScript {
  private apiClient: APIClient;
  private securityManager: SecurityManager;
  private observer: MutationObserver | null = null;

  constructor() {
    console.log('Content Script: Initializing...');
    this.apiClient = new APIClient(config.OPENAI_API_KEY);
    this.securityManager = new SecurityManager(
      config.ENCRYPTION_KEY,
      config.SALT
    );
  }

  async init() {
    console.log('Content Script: Starting initialization...');
    this.injectUI();
    this.observeEmailChanges();
    this.setupMessageListeners();
    console.log('Content Script: Initialization complete');
  }

  private injectUI() {
    console.log('Content Script: Injecting UI...');
    const assistantButton = document.createElement('button');
    assistantButton.id = 'atom-mail-assistant';
    assistantButton.className = 'atom-mail-assistant-button';
    assistantButton.innerHTML = 'AI Assistant';
    assistantButton.onclick = () => this.showAIAssistant();
    
    document.body.appendChild(assistantButton);
    console.log('Content Script: UI injected successfully');
  }

  private observeEmailChanges() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (this.isEmailComposition(mutation)) {
          this.handleEmailComposition();
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private isEmailComposition(mutation: MutationRecord): boolean {
    // For development, always return true when textarea changes
    const target = mutation.target as HTMLElement;
    return target.tagName === 'TEXTAREA' || target.id === 'content';
  }

  private async handleEmailComposition() {
    const emailContent = this.extractEmailContent();
    if (emailContent) {
      const analysis = await this.apiClient.analyzeEmail(emailContent);
      this.updateSuggestions(analysis);
    }
  }

  private extractEmailContent(): Email | null {
    const toField = document.getElementById('to') as HTMLInputElement;
    const subjectField = document.getElementById('subject') as HTMLInputElement;
    const contentField = document.getElementById('content') as HTMLTextAreaElement;

    if (contentField && contentField.value) {
      console.log('Content Script: Extracted email content');
      return {
        to: toField?.value || '',
        subject: subjectField?.value || '',
        content: contentField.value,
        sender: 'user@example.com', // For development
        recipients: [toField?.value || ''],
        timestamp: new Date().toISOString()
      };
    }
    return null;
  }

  private showAIAssistant() {
    const panel = document.createElement('div');
    panel.id = 'atom-mail-assistant-panel';
    panel.className = 'atom-mail-assistant-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h3>AI Assistant</h3>
        <button class="close-button">×</button>
      </div>
      <div class="panel-content">
        <div class="suggestions-container"></div>
      </div>
    `;

    document.body.appendChild(panel);
    this.setupPanelListeners(panel);
  }

  private updateSuggestions(analysis: Analysis) {
    const container = document.querySelector('.suggestions-container');
    if (container) {
      const suggestions = [
        { id: 'sentiment', content: `Sentiment: ${analysis.sentiment}` },
        { id: 'keyPoints', content: `Key Points: ${analysis.keyPoints.join(', ')}` },
        { id: 'actions', content: `Suggested Actions: ${analysis.suggestedActions.join(', ')}` }
      ];
      container.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item">
          <p>${suggestion.content}</p>
          <button onclick="applySuggestion('${suggestion.id}')">Apply</button>
        </div>
      `).join('');
    }
  }

  private setupPanelListeners(panel: HTMLElement) {
    const closeButton = panel.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        panel.remove();
      });
    }
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ANALYZE_EMAIL') {
        this.handleEmailAnalysis(message.data);
      }
    });
  }

  private async handleEmailAnalysis(email: Email) {
    try {
      const analysis = await this.apiClient.analyzeEmail(email);
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_COMPLETE',
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing email:', error);
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }
}

// Initialize the content script
const contentScript = new ContentScript();
contentScript.init(); 