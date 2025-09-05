/**
 * Utility per la gestione delle notifiche audio
 */

export type SoundType = 'message' | 'fileRequest' | 'fileComplete' | 'error' | 'success';

// Audio context per generare suoni sintetici
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Genera un tono sintetico
 */
const playTone = (frequency: number, duration: number, volume: number = 0.1): void => {
  try {
    const ctx = getAudioContext();
    
    // Resume context se è suspended (policy browser)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
};

/**
 * Genera una sequenza di toni
 */
const playToneSequence = (notes: { frequency: number; duration: number; delay?: number }[], volume: number = 0.1): void => {
  let currentTime = 0;
  
  notes.forEach(({ frequency, duration, delay = 0 }) => {
    setTimeout(() => playTone(frequency, duration, volume), currentTime * 1000);
    currentTime += duration + delay;
  });
};

/**
 * Suoni predefiniti per diversi eventi
 */
const soundDefinitions: Record<SoundType, () => void> = {
  message: () => {
    // Singolo tono dolce per messaggi
    playTone(800, 0.15, 0.08);
  },
  
  fileRequest: () => {
    // Doppio tono ascendente per richieste file
    playToneSequence([
      { frequency: 600, duration: 0.2 },
      { frequency: 900, duration: 0.25, delay: 0.1 }
    ], 0.12);
  },
  
  fileComplete: () => {
    // Trillo ascendente per completamenti
    playToneSequence([
      { frequency: 523, duration: 0.15 }, // C
      { frequency: 659, duration: 0.15, delay: 0.05 }, // E  
      { frequency: 784, duration: 0.2, delay: 0.05 }   // G
    ], 0.1);
  },
  
  success: () => {
    // Accordo maggiore per successi
    playToneSequence([
      { frequency: 523, duration: 0.3 }, // C
      { frequency: 659, duration: 0.3 }, // E (simultaneo)
      { frequency: 784, duration: 0.3 }  // G (simultaneo)
    ], 0.08);
  },
  
  error: () => {
    // Tono basso discendente per errori
    playToneSequence([
      { frequency: 300, duration: 0.2 },
      { frequency: 200, duration: 0.3, delay: 0.1 }
    ], 0.15);
  }
};

/**
 * Riproduce un suono di notifica
 */
export const playNotificationSound = (soundType: SoundType): void => {
  // Controlla se l'audio è abilitato nel browser
  if (typeof window === 'undefined') return;
  
  try {
    soundDefinitions[soundType]();
  } catch (error) {
    console.warn(`Failed to play ${soundType} sound:`, error);
  }
};

/**
 * Inizializza il contesto audio (da chiamare su interazione utente)
 */
export const initializeAudioContext = (): void => {
  try {
    getAudioContext();
  } catch (error) {
    console.warn('Failed to initialize audio context:', error);
  }
};

/**
 * Verifica se l'audio è supportato
 */
export const isAudioSupported = (): boolean => {
  return typeof window !== 'undefined' && 
         (window.AudioContext !== undefined || (window as any).webkitAudioContext !== undefined);
};