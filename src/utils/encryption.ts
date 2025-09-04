/**
 * Utility per crittografia end-to-end AES-GCM
 * Supporta crittografia di file con password opzionale
 */

export interface EncryptedData {
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}

/**
 * Deriva una chiave crittografica da una password usando PBKDF2
 */
async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cripta un ArrayBuffer usando AES-GCM con password
 */
export async function encryptData(data: ArrayBuffer, password: string): Promise<EncryptedData> {
  // Genera salt e IV casuali
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Deriva la chiave dalla password
  const key = await deriveKey(password, salt.slice().buffer);
  
  // Cripta i dati
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv.slice().buffer)
    },
    key,
    data
  );

  return {
    encryptedData,
    iv,
    salt
  };
}

/**
 * Decripta un ArrayBuffer usando AES-GCM con password
 */
export async function decryptData(
  encryptedData: ArrayBuffer, 
  password: string, 
  iv: Uint8Array, 
  salt: Uint8Array
): Promise<ArrayBuffer> {
  // Deriva la chiave dalla password
  const key = await deriveKey(password, salt.slice().buffer);
  
  // Decripta i dati
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv.slice().buffer) 
    },
    key,
    encryptedData
  );

  return decryptedData;
}

/**
 * Cripta un file con password opzionale
 */
export async function encryptFile(file: File, password?: string): Promise<{ encryptedFile: File; isEncrypted: boolean }> {
  if (!password || password.trim() === '') {
    return { encryptedFile: file, isEncrypted: false };
  }

  const fileBuffer = await file.arrayBuffer();
  const encrypted = await encryptData(fileBuffer, password.trim());
  
  // Combina salt, iv e dati criptati in un singolo buffer
  const combinedBuffer = new ArrayBuffer(16 + 12 + encrypted.encryptedData.byteLength);
  const combinedView = new Uint8Array(combinedBuffer);
  
  combinedView.set(encrypted.salt, 0);
  combinedView.set(encrypted.iv, 16);
  combinedView.set(new Uint8Array(encrypted.encryptedData), 28);
  
  const encryptedFile = new File(
    [combinedBuffer], 
    file.name + '.encrypted', 
    { type: 'application/octet-stream' }
  );
  
  return { encryptedFile, isEncrypted: true };
}

/**
 * Decripta un file criptato
 */
export async function decryptFile(
  encryptedData: ArrayBuffer, 
  password: string
): Promise<{ decryptedFile: Blob; success: boolean }> {
  try {
    const dataView = new Uint8Array(encryptedData);
    
    // Estrai salt, iv e dati criptati
    const salt = dataView.slice(0, 16);
    const iv = dataView.slice(16, 28);
    const encryptedContent = dataView.slice(28);
    
    const decryptedData = await decryptData(encryptedContent.buffer, password, iv, salt);
    
    const decryptedFile = new Blob([decryptedData]);
    
    return { decryptedFile, success: true };
  } catch (error) {
    console.error('Errore nella decrittografia:', error);
    return { decryptedFile: new Blob(), success: false };
  }
}