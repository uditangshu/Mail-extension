import { UserPreferences, ExtensionState } from '../types';
import { APIClient } from '../services/api-client';
import { SecurityManager } from '../services/security-manager';
import { config } from '../config';

class PopupInterface {
  private state: ExtensionState;
  private apiClient: APIClient;
  private securityManager: SecurityManager;

  constructor() {
    console.log('Popup Script: Initializing...');
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
  }

  async init() {
    await this.loadState();
    this.renderUI();
    this.setupEventListeners();
  }

  private async loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response;
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  private renderUI() {
    const container = document.getElementById('popup-container');
    if (!container) return;

    container.innerHTML = `
      <div class="popup-header">
        <h2>Atom Mail Assistant</h2>
        <div class="status-indicator ${this.state.isAuthenticated ? 'authenticated' : 'unauthenticated'}">
          ${this.state.isAuthenticated ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div class="popup-content">
        <div class="settings-section">
          <h3>Settings</h3>
          <div class="setting-item">
            <label>Theme</label>
            <select id="theme-select">
              <option value="light" ${this.state.settings.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.state.settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
          
          <div class="setting-item">
            <label>Notifications</label>
            <input type="checkbox" id="notifications-toggle" ${this.state.settings.notifications ? 'checked' : ''}>
          </div>
          
          <div class="setting-item">
            <label>AI Assistant</label>
            <input type="checkbox" id="ai-toggle" ${this.state.settings.aiEnabled ? 'checked' : ''}>
          </div>
          
          <div class="setting-item">
            <label>Privacy Level</label>
            <select id="privacy-select">
              <option value="high" ${this.state.settings.privacyLevel === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${this.state.settings.privacyLevel === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${this.state.settings.privacyLevel === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
        </div>
        
        <div class="status-section">
          <h3>Status</h3>
          <div class="status-item">
            <span>Current Email:</span>
            <span>${this.state.currentEmail ? 'Processing' : 'None'}</span>
          </div>
          <div class="status-item">
            <span>Suggestions:</span>
            <span>${this.state.suggestions.length}</span>
          </div>
        </div>
      </div>
      
      <div class="popup-footer">
        <button id="save-settings">Save Settings</button>
        <button id="refresh-status">Refresh Status</button>
      </div>
    `;
  }

  private setupEventListeners() {
    const saveButton = document.getElementById('save-settings');
    const refreshButton = document.getElementById('refresh-status');

    if (saveButton) {
      saveButton.addEventListener('click', () => this.handleSaveSettings());
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.handleRefreshStatus());
    }

    // Theme change listener
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.state.settings.theme = (e.target as HTMLSelectElement).value as 'light' | 'dark';
      });
    }

    // Notifications toggle listener
    const notificationsToggle = document.getElementById('notifications-toggle') as HTMLInputElement;
    if (notificationsToggle) {
      notificationsToggle.addEventListener('change', (e) => {
        this.state.settings.notifications = (e.target as HTMLInputElement).checked;
      });
    }

    // AI toggle listener
    const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement;
    if (aiToggle) {
      aiToggle.addEventListener('change', (e) => {
        this.state.settings.aiEnabled = (e.target as HTMLInputElement).checked;
      });
    }

    // Privacy level listener
    const privacySelect = document.getElementById('privacy-select') as HTMLSelectElement;
    if (privacySelect) {
      privacySelect.addEventListener('change', (e) => {
        this.state.settings.privacyLevel = (e.target as HTMLSelectElement).value as 'high' | 'medium' | 'low';
      });
    }
  }

  private async handleSaveSettings() {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        data: this.state.settings
      });
      this.showNotification('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Error saving settings', 'error');
    }
  }

  private async handleRefreshStatus() {
    await this.loadState();
    this.renderUI();
    this.showNotification('Status refreshed');
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the popup interface
const popupInterface = new PopupInterface();
popupInterface.init(); 