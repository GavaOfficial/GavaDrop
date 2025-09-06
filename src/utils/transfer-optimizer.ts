interface TransferMetrics {
  startTime: number;
  bytesTransferred: number;
  lastChunkTime: number;
  chunkSizes: number[];
  transferSpeeds: number[];
}

interface ChunkingStrategy {
  baseChunkSize: number;
  maxChunkSize: number;
  minChunkSize: number;
  adaptiveThreshold: number;
}

export class TransferOptimizer {
  private metrics: TransferMetrics;
  private strategy: ChunkingStrategy;
  private readonly SPEED_WINDOW_SIZE = 5;
  private readonly ADAPTATION_INTERVAL = 3;

  constructor() {
    this.metrics = {
      startTime: Date.now(),
      bytesTransferred: 0,
      lastChunkTime: Date.now(),
      chunkSizes: [],
      transferSpeeds: []
    };

    this.strategy = {
      baseChunkSize: 16384, // 16KB default
      maxChunkSize: 1048576, // 1MB max
      minChunkSize: 4096, // 4KB min
      adaptiveThreshold: 0.8 // 80% efficiency threshold
    };
  }

  calculateOptimalChunkSize(): number {
    const currentTime = Date.now();
    const timeSinceLastChunk = currentTime - this.metrics.lastChunkTime;
    
    // Per i primi chunk, usa la dimensione base
    if (this.metrics.chunkSizes.length < 3) {
      return this.strategy.baseChunkSize;
    }

    // Calcola la velocità media delle ultime trasferimenti
    const recentSpeeds = this.metrics.transferSpeeds.slice(-this.SPEED_WINDOW_SIZE);
    const avgSpeed = recentSpeeds.reduce((sum, speed) => sum + speed, 0) / recentSpeeds.length;
    
    // Calcola la tendenza della velocità (miglioramento o peggioramento)
    const speedTrend = this.calculateSpeedTrend();
    
    let newChunkSize = this.strategy.baseChunkSize;

    // Algoritmo di adattamento basato su velocità e tendenza
    if (avgSpeed > 1000000) { // >1MB/s - connessione veloce
      newChunkSize = Math.min(this.strategy.maxChunkSize, this.strategy.baseChunkSize * 4);
    } else if (avgSpeed > 500000) { // >500KB/s - connessione media
      newChunkSize = Math.min(this.strategy.maxChunkSize, this.strategy.baseChunkSize * 2);
    } else if (avgSpeed < 100000) { // <100KB/s - connessione lenta
      newChunkSize = Math.max(this.strategy.minChunkSize, this.strategy.baseChunkSize / 2);
    }

    // Adatta in base alla tendenza
    if (speedTrend > 0.1) { // Velocità in aumento
      newChunkSize = Math.min(this.strategy.maxChunkSize, newChunkSize * 1.2);
    } else if (speedTrend < -0.1) { // Velocità in diminuzione
      newChunkSize = Math.max(this.strategy.minChunkSize, newChunkSize * 0.8);
    }

    // Adatta in base alla latenza
    if (timeSinceLastChunk > 200) { // Alta latenza
      newChunkSize = Math.max(this.strategy.minChunkSize, newChunkSize * 0.7);
    }

    return Math.round(newChunkSize);
  }

  updateMetrics(chunkSize: number): void {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.metrics.lastChunkTime;
    
    if (timeDiff > 0) {
      const speed = (chunkSize / timeDiff) * 1000; // bytes per second
      this.metrics.transferSpeeds.push(speed);
      
      // Mantieni solo le ultime N velocità per il calcolo della media
      if (this.metrics.transferSpeeds.length > this.SPEED_WINDOW_SIZE * 2) {
        this.metrics.transferSpeeds = this.metrics.transferSpeeds.slice(-this.SPEED_WINDOW_SIZE);
      }
    }

    this.metrics.chunkSizes.push(chunkSize);
    this.metrics.bytesTransferred += chunkSize;
    this.metrics.lastChunkTime = currentTime;
  }

  private calculateSpeedTrend(): number {
    if (this.metrics.transferSpeeds.length < 3) return 0;

    const recent = this.metrics.transferSpeeds.slice(-3);
    const older = this.metrics.transferSpeeds.slice(-6, -3);
    
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, speed) => sum + speed, 0) / recent.length;
    const olderAvg = older.reduce((sum, speed) => sum + speed, 0) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  getCurrentSpeed(): number {
    const totalTime = Date.now() - this.metrics.startTime;
    return totalTime > 0 ? (this.metrics.bytesTransferred / totalTime) * 1000 : 0;
  }

  getAverageSpeed(): number {
    if (this.metrics.transferSpeeds.length === 0) return 0;
    return this.metrics.transferSpeeds.reduce((sum, speed) => sum + speed, 0) / this.metrics.transferSpeeds.length;
  }

  getEstimatedTimeRemaining(remainingBytes: number): number {
    const avgSpeed = this.getAverageSpeed();
    return avgSpeed > 0 ? remainingBytes / avgSpeed : 0;
  }

  reset(): void {
    this.metrics = {
      startTime: Date.now(),
      bytesTransferred: 0,
      lastChunkTime: Date.now(),
      chunkSizes: [],
      transferSpeeds: []
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentSpeed: this.getCurrentSpeed(),
      averageSpeed: this.getAverageSpeed(),
      efficiency: this.calculateEfficiency()
    };
  }

  private calculateEfficiency(): number {
    const avgSpeed = this.getAverageSpeed();
    const maxObservedSpeed = Math.max(...this.metrics.transferSpeeds, 0);
    return maxObservedSpeed > 0 ? avgSpeed / maxObservedSpeed : 0;
  }
}

// Utility per compressione intelligente
export class CompressionHelper {
  private static readonly COMPRESSION_THRESHOLD = 1024 * 1024; // 1MB
  private static readonly COMPRESSIBLE_TYPES = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/csv'
  ];

  static shouldCompress(file: File): boolean {
    // Non comprimere file piccoli
    if (file.size < this.COMPRESSION_THRESHOLD) {
      return false;
    }

    // Non comprimere file già compressi
    if (this.isAlreadyCompressed(file)) {
      return false;
    }

    // Comprimi file di testo e dati
    return this.COMPRESSIBLE_TYPES.some(type => file.type.startsWith(type));
  }

  private static isAlreadyCompressed(file: File): boolean {
    const compressedExtensions = [
      '.zip', '.rar', '.7z', '.gz', '.bz2',
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.mp3', '.mp4', '.mkv', '.avi', '.mov',
      '.pdf'
    ];

    return compressedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );
  }

  static async compressText(text: string): Promise<Uint8Array> {
    // Implementazione semplice di compressione usando CompressionStream
    if (typeof window !== 'undefined' && 'CompressionStream' in window) {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(text));
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          chunks.push(value);
        }
      }
      
      // Combina i chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
    
    // Fallback: ritorna il testo non compresso
    return new TextEncoder().encode(text);
  }
}

// Utility per trasferimenti paralleli
export class ParallelTransferManager {
  private activeTransfers: Map<string, Promise<void>> = new Map();
  private maxConcurrentTransfers: number = 3;
  private transferQueue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrentTransfers = maxConcurrent;
  }

  async addTransfer(id: string, transferFunction: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const wrappedTransfer = async () => {
        try {
          await transferFunction();
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          this.activeTransfers.delete(id);
          this.processQueue();
        }
      };

      if (this.activeTransfers.size < this.maxConcurrentTransfers) {
        const transferPromise = wrappedTransfer();
        this.activeTransfers.set(id, transferPromise);
      } else {
        this.transferQueue.push(wrappedTransfer);
      }
    });
  }

  private processQueue(): void {
    if (this.transferQueue.length > 0 && this.activeTransfers.size < this.maxConcurrentTransfers) {
      const nextTransfer = this.transferQueue.shift();
      if (nextTransfer) {
        const id = `queued_${Date.now()}_${Math.random()}`;
        const transferPromise = nextTransfer();
        this.activeTransfers.set(id, transferPromise);
      }
    }
  }

  getActiveTransferCount(): number {
    return this.activeTransfers.size;
  }

  getQueueLength(): number {
    return this.transferQueue.length;
  }

  clearQueue(): void {
    this.transferQueue = [];
  }
}