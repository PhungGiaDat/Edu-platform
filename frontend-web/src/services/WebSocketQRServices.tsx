/**
 * WebSocket service for QR verification with the backend
 * Handles real-time frame verification against expected flashcards
 */

export type VerifyResult = {
  qr_id: string;
  valid: boolean;
  confidence?: number;
  reason?: string;
};

export type VerifyMessage = {
  qr_id: string;
  frame_format: 'image/jpeg' | 'image/png' | 'image/webp';
  frame_base64: string;
};

/**
 * WebSocket client for QR verification
 */
export class VerifySocket {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private baseUrl: string;
  private onMessage: (result: VerifyResult) => void;
  private onError?: (error: Event) => void;
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor(
    url: string,
    onMessage: (result: VerifyResult) => void,
    onError?: (error: Event) => void,
    onConnect?: () => void,
    onDisconnect?: () => void
  ) {
    this.baseUrl = url;
    this.onMessage = onMessage;
    this.onError = onError;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.baseUrl.replace(/\/ws\/verify$/, '') + '/ws/verify';
        console.log('🔗 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected for QR verification');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const result = JSON.parse(event.data) as VerifyResult;
            this.onMessage(result);
          } catch (error) {
            console.warn('Failed to parse verification result:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.onError?.(error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          this.isConnecting = false;
          this.onDisconnect?.();
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Send frame for verification
   * @param qrId - Expected QR code ID
   * @param blob - Image blob to verify
   * @param format - Image format (default: 'image/jpeg')
   */
  sendFrame(
    qrId: string, 
    blob: Blob, 
    format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send frame');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const payload = {
          qr_id: qrId,
          frame_format: 'image/jpeg',
          frame_base64: base64Data
        };

        this.ws!.send(JSON.stringify(payload));
        console.log(`📤 Frame sent for verification: ${qrId}`);
      } catch (error) {
        console.error('❌ Failed to send frame:', error);
      }
    };

    reader.readAsDataURL(blob);
  }

  /**
   * Send frame as base64 string directly
   * @param qrId - Expected QR code ID
   * @param base64Data - Base64 encoded image data (without data URL prefix)
   * @param format - Image format
   */
  sendFrameBase64(
    qrId: string,
    base64Data: string,
    format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send frame');
      return;
    }

    const message: VerifyMessage = {
      qr_id: qrId,
      frame_format: format,
      frame_base64: base64Data
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again if under max attempts
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}

/**
 * Hook-like function to create and manage verification socket
 * @param url - WebSocket URL
 * @param onMessage - Message handler
 * @param onError - Error handler
 * @returns VerifySocket instance
 */
export function createVerifySocket(
  url: string,
  onMessage: (result: VerifyResult) => void,
  onError?: (error: Event) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): VerifySocket {
  return new VerifySocket(url, onMessage, onError, onConnect, onDisconnect);
}

/**
 * Utility to convert data URL to base64 data only
 * @param dataUrl - Data URL string
 * @returns Base64 data without prefix
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return commaIndex > -1 ? dataUrl.substring(commaIndex + 1) : dataUrl;
}