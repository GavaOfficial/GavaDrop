/**
 * Utility per la gestione della cronologia trasferimenti
 */

export interface TransferHistoryItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  relativePath?: string;
  direction: 'sent' | 'received';
  deviceName: string;
  deviceId: string;
  timestamp: number;
  status: 'completed' | 'failed' | 'cancelled';
  encrypted: boolean;
  batchId?: string; // Per raggruppare trasferimenti batch
  fileData?: string; // Base64 encoded file data per resend (solo per file inviati)
}

export interface HistoryGroup {
  date: string;
  displayDate: string;
  items: TransferHistoryItem[];
}

/**
 * Converte un file in base64 per il salvataggio
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Rimuovi il prefix data:type;base64,
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Salva un elemento nella cronologia
 */
export function saveToHistory(item: Omit<TransferHistoryItem, 'id' | 'timestamp'>): void {
  const clientId = localStorage.getItem('gavadrop-client-id');
  if (!clientId) return;

  const historyItem: TransferHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now()
  };

  try {
    const existingHistory = localStorage.getItem(`gavadrop-history-${clientId}`);
    const history: TransferHistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
    
    history.unshift(historyItem); // Aggiungi in cima
    
    // Mantieni solo gli ultimi 100 elementi per evitare di riempire troppo localStorage
    if (history.length > 100) {
      history.splice(100);
    }
    
    localStorage.setItem(`gavadrop-history-${clientId}`, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

/**
 * Salva un file inviato con i dati per il resend
 */
export async function saveFileToHistory(
  file: File, 
  item: Omit<TransferHistoryItem, 'id' | 'timestamp' | 'fileData'>
): Promise<void> {
  const clientId = localStorage.getItem('gavadrop-client-id');
  if (!clientId) return;

  try {
    // Salva solo i file piccoli per evitare di riempire localStorage (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    let fileData: string | undefined = undefined;
    
    if (file.size <= maxSize) {
      fileData = await fileToBase64(file);
    }

    const historyItem: TransferHistoryItem = {
      ...item,
      fileData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const existingHistory = localStorage.getItem(`gavadrop-history-${clientId}`);
    const history: TransferHistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
    
    history.unshift(historyItem); // Aggiungi in cima
    
    // Mantieni solo gli ultimi 50 elementi se stiamo salvando dati file per evitare storage overflow
    const maxItems = fileData ? 50 : 100;
    if (history.length > maxItems) {
      history.splice(maxItems);
    }
    
    localStorage.setItem(`gavadrop-history-${clientId}`, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving file to history:', error);
    // Fallback: salva senza file data
    saveToHistory(item);
  }
}

/**
 * Recupera la cronologia
 */
export function getHistory(): TransferHistoryItem[] {
  const clientId = localStorage.getItem('gavadrop-client-id');
  if (!clientId) return [];

  try {
    const historyData = localStorage.getItem(`gavadrop-history-${clientId}`);
    return historyData ? JSON.parse(historyData) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
}

/**
 * Raggruppa la cronologia per data
 */
export function groupHistoryByDate(history: TransferHistoryItem[], language: 'it' | 'en' = 'it'): HistoryGroup[] {
  const groups: { [key: string]: TransferHistoryItem[] } = {};
  
  history.forEach(item => {
    const date = new Date(item.timestamp);
    const dateKey = date.toDateString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });
  
  return Object.entries(groups).map(([dateKey, items]) => {
    const date = new Date(dateKey);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let displayDate: string;
    if (date.toDateString() === today.toDateString()) {
      displayDate = language === 'it' ? 'Oggi' : 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      displayDate = language === 'it' ? 'Ieri' : 'Yesterday';
    } else {
      displayDate = date.toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    return {
      date: dateKey,
      displayDate,
      items: items.sort((a, b) => b.timestamp - a.timestamp) // Più recenti prima
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Rimuove un elemento dalla cronologia
 */
export function removeFromHistory(itemId: string): void {
  const clientId = localStorage.getItem('gavadrop-client-id');
  if (!clientId) return;

  try {
    const existingHistory = localStorage.getItem(`gavadrop-history-${clientId}`);
    if (!existingHistory) return;
    
    const history: TransferHistoryItem[] = JSON.parse(existingHistory);
    const filteredHistory = history.filter(item => item.id !== itemId);
    
    localStorage.setItem(`gavadrop-history-${clientId}`, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error removing from history:', error);
  }
}

/**
 * Pulisce tutta la cronologia
 */
export function clearHistory(): void {
  const clientId = localStorage.getItem('gavadrop-client-id');
  if (!clientId) return;

  try {
    localStorage.removeItem(`gavadrop-history-${clientId}`);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

/**
 * Formatta la dimensione del file
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formatta il timestamp
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('it-IT', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}