/**
 * SecureStorage - Origin-bound cryptographic key storage
 * 
 * This utility provides secure storage for API keys using:
 * - Non-extractable AES-GCM CryptoKey stored in IndexedDB
 * - Auto-lock mechanism after 15 minutes of inactivity
 * - Origin-bound security with no user passphrase required
 */

export class SecureStorage {
  private static keyPromise: Promise<CryptoKey> | null = null;
  private static idleTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private static readonly DB_NAME = 'InfiniteChatSecure';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'cryptoKeys';
  private static readonly KEY_NAME = 'masterKey';

  /**
   * Opens IndexedDB connection
   */
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * Stores the CryptoKey in IndexedDB
   */
  private static async storeCryptoKey(key: CryptoKey): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put(key, this.KEY_NAME);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieves the CryptoKey from IndexedDB
   */
  private static async retrieveCryptoKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(this.KEY_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Generates a new non-extractable AES-GCM key
   */
  private static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Gets or creates the master CryptoKey
   */
  private static async getKey(): Promise<CryptoKey> {
    if (this.keyPromise) {
      return this.keyPromise;
    }

    this.keyPromise = (async () => {
      // Try to retrieve existing key
      let key = await this.retrieveCryptoKey();
      
      // Generate new key if none exists
      if (!key) {
        key = await this.generateKey();
        await this.storeCryptoKey(key);
      }

      // Reset idle timer
      this.resetIdleTimer();
      
      return key;
    })();

    return this.keyPromise;
  }

  /**
   * Resets the idle timer
   */
  private static resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.lock();
    }, this.IDLE_TIMEOUT);
  }

  /**
   * Locks the storage by purging the in-memory key
   */
  private static lock(): void {
    this.keyPromise = null;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Encrypts data using AES-GCM
   */
  public static async encrypt(data: string): Promise<string> {
    const key = await this.getKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypts data using AES-GCM
   */
  public static async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(ciphertext).split('').map(char => char.charCodeAt(0))
    );

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedData
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  /**
   * Encrypts and stores data in localStorage
   */
  public static async encryptAndStore(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(value);
    localStorage.setItem(key, encrypted);
    this.resetIdleTimer();
  }

  /**
   * Retrieves and decrypts data from localStorage
   */
  public static async decryptAndRetrieve(key: string): Promise<string | null> {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;

    try {
      const decrypted = await this.decrypt(encrypted);
      this.resetIdleTimer();
      return decrypted;
    } catch {
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Clears all stored data and locks the storage
   */
  public static clearAll(): void {
    // Clear localStorage
    localStorage.clear();
    
    // Clear IndexedDB
    indexedDB.deleteDatabase(this.DB_NAME);
    
    // Lock storage
    this.lock();
  }

  /**
   * Manually locks the storage
   */
  public static lockNow(): void {
    this.lock();
  }

  /**
   * Touch the storage to reset the idle timer without exposing the key
   */
  public static async touch(): Promise<void> {
    try {
      await this.getKey();
    } catch {
      // Ignore errors - storage might be locked
    }
  }

  /**
   * Checks if storage is currently locked
   */
  public static isLocked(): boolean {
    return this.keyPromise === null;
  }
}

// Auto-lock on page unload
window.addEventListener('beforeunload', () => {
  SecureStorage.lockNow();
});

// Reset idle timer on user activity
['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
  document.addEventListener(event, () => {
    if (!SecureStorage.isLocked()) {
      // Reset timer without exposing the key
      SecureStorage.touch();
    }
  }, { passive: true });
});