import OpenAI from 'openai';
import { Email, Analysis, Response, EmailContext } from '../types';

export class APIClient {
  private openai: any;
  private readonly API_KEY: string;

  constructor(apiKey: string) {
    this.API_KEY = apiKey;
    this.openai = {
      chat: {
        completions: {
          create: async (params: any) => {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.API_KEY}`
              },
              body: JSON.stringify(params)
            });
            
            if (!response.ok) {
              throw new Error(`OpenAI API error: ${response.statusText}`);
            }
            
            return response.json();
          }
        }
      }
    };
  }

  async analyzeEmail(email: Email): Promise<Analysis> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an email analysis assistant. Analyze the email content and provide insights."
          },
          {
            role: "user",
            content: `Analyze this email:\nSubject: ${email.subject}\nContent: ${email.content}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = completion.choices[0].message.content || '';
      return {
        sentiment: this.extractSentiment(content),
        keyPoints: this.extractKeyPoints(content),
        suggestedActions: this.extractActions(content)
      };
    } catch (error) {
      console.error('Error analyzing email:', error);
      throw error;
    }
  }

  async generateResponse(context: EmailContext): Promise<Response> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an email response assistant. Generate appropriate responses based on the context."
          },
          {
            role: "user",
            content: `Generate a response for:\nContext: ${context.summary}\nTone: ${context.tone}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = completion.choices[0].message.content || '';
      return {
        content,
        tone: context.tone,
        suggestedEdits: []
      };
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  private extractSentiment(content: string): string {
    // Simple sentiment extraction logic
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('positive') || lowerContent.includes('good') || lowerContent.includes('great')) {
      return 'positive';
    } else if (lowerContent.includes('negative') || lowerContent.includes('bad') || lowerContent.includes('poor')) {
      return 'negative';
    }
    return 'neutral';
  }

  private extractKeyPoints(content: string): string[] {
    // Split content by newlines and filter out empty lines
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().includes('key point'))
      .map(point => point.replace(/^[-•*]\s*/, '')); // Remove bullet points
  }

  private extractActions(content: string): string[] {
    // Split content by newlines and filter for action items
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => 
        line.toLowerCase().includes('action') || 
        line.toLowerCase().includes('recommend') ||
        line.toLowerCase().includes('suggest')
      )
      .map(action => action.replace(/^[-•*]\s*/, '')); // Remove bullet points
  }
} 