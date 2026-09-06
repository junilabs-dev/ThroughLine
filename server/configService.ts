import dotenv from 'dotenv';
dotenv.config();

export interface CredentialStatus {
  geminiConfigured: boolean;
  geminiKeyLength: number;
  geminiMaskedKey: string;
  firebaseProject: string;
  nodeEnv: string;
}

/**
 * Centralized Configuration Service
 * Provides dynamic, non-hardcoded access to runtime credentials and environment variables.
 * Automatically evaluates runtime process.env so newly injected secrets are picked up immediately.
 */
class ConfigService {
  /**
   * Retrieves the current Gemini API Key from environment configuration.
   * Strips whitespace and quotes if present.
   */
  public getGeminiApiKey(): string {
    const raw = process.env.GEMINI_API_KEY || '';
    return raw.trim().replace(/^["']|["']$/g, '');
  }

  /**
   * Validates whether a usable Gemini API Key is loaded.
   */
  public isGeminiConfigured(): boolean {
    const key = this.getGeminiApiKey();
    return Boolean(key && key.length >= 8);
  }

  /**
   * Retrieves non-sensitive credential telemetry for diagnostics.
   */
  public getCredentialStatus(): CredentialStatus {
    const key = this.getGeminiApiKey();
    const masked =
      key.length > 8
        ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
        : key.length > 0
        ? 'SET (short)'
        : 'NOT_CONFIGURED';

    return {
      geminiConfigured: this.isGeminiConfigured(),
      geminiKeyLength: key.length,
      geminiMaskedKey: masked,
      firebaseProject: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-mindspace-ca433b64-5c25-46ce-9f82-e5962089abd9',
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }

  public getPort(): number {
    return 3000;
  }
}

export const configService = new ConfigService();
