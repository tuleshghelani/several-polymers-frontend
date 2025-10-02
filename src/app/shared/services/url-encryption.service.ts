import { Injectable } from '@angular/core';
import { EncryptionService } from './encryption.service';

@Injectable({
  providedIn: 'root'
})
export class UrlEncryptionService {

  constructor(private encryptionService: EncryptionService) {}

  /**
   * Encrypts an ID for use in URL parameters
   * @param id The ID to encrypt
   * @returns Encrypted string safe for URL use
   */
  encryptId(id: number | string): string {
    try {
      const encrypted = this.encryptionService.encrypt(id.toString());
      // Make URL safe by replacing characters that might cause issues
      return encodeURIComponent(encrypted);
    } catch (error) {
      console.error('Error encrypting ID for URL:', error);
      return '';
    }
  }

  /**
   * Decrypts an ID from URL parameters
   * @param encryptedId The encrypted ID from URL
   * @returns Decrypted ID as number, or null if decryption fails
   */
  decryptId(encryptedId: string): number | null {
    try {
      if (!encryptedId) {
        return null;
      }
      
      // Decode URL encoding first
      const decodedEncrypted = decodeURIComponent(encryptedId);
      const decrypted = this.encryptionService.decrypt(decodedEncrypted);
      
      if (decrypted === null || decrypted === undefined) {
        return null;
      }
      
      const id = parseInt(decrypted.toString(), 10);
      return isNaN(id) ? null : id;
    } catch (error) {
      console.error('Error decrypting ID from URL:', error);
      return null;
    }
  }

  /**
   * Encrypts multiple parameters for URL use
   * @param params Object with key-value pairs to encrypt
   * @returns Object with encrypted values
   */
  encryptParams(params: Record<string, any>): Record<string, string> {
    const encryptedParams: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        try {
          const encrypted = this.encryptionService.encrypt(value);
          encryptedParams[key] = encodeURIComponent(encrypted);
        } catch (error) {
          console.error(`Error encrypting parameter ${key}:`, error);
          encryptedParams[key] = '';
        }
      }
    }
    
    return encryptedParams;
  }

  /**
   * Decrypts multiple parameters from URL
   * @param encryptedParams Object with encrypted key-value pairs
   * @returns Object with decrypted values
   */
  decryptParams(encryptedParams: Record<string, string>): Record<string, any> {
    const decryptedParams: Record<string, any> = {};
    
    for (const [key, encryptedValue] of Object.entries(encryptedParams)) {
      if (encryptedValue) {
        try {
          const decodedEncrypted = decodeURIComponent(encryptedValue);
          const decrypted = this.encryptionService.decrypt(decodedEncrypted);
          decryptedParams[key] = decrypted;
        } catch (error) {
          console.error(`Error decrypting parameter ${key}:`, error);
          decryptedParams[key] = null;
        }
      }
    }
    
    return decryptedParams;
  }
}
