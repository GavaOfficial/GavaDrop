import JSZip from 'jszip';

export interface FolderInfo {
  name: string;
  files: File[];
  size: number;
}

/**
 * Raggruppa i file per cartella basandosi sul webkitRelativePath
 */
export function groupFilesByFolder(files: File[]): { folders: FolderInfo[], singleFiles: File[] } {
  const folders = new Map<string, File[]>();
  const singleFiles: File[] = [];

  files.forEach(file => {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    
    if (relativePath) {
      // È un file da una cartella
      const pathParts = relativePath.split('/');
      const folderName = pathParts[0]; // Nome della cartella root
      
      if (!folders.has(folderName)) {
        folders.set(folderName, []);
      }
      folders.get(folderName)!.push(file);
    } else {
      // È un file singolo
      singleFiles.push(file);
    }
  });

  const folderInfos: FolderInfo[] = Array.from(folders.entries()).map(([name, files]) => ({
    name,
    files,
    size: files.reduce((total, file) => total + file.size, 0)
  }));

  return { folders: folderInfos, singleFiles };
}

/**
 * Comprimi una cartella in un file ZIP
 */
export async function compressFolder(folder: FolderInfo): Promise<File> {
  const zip = new JSZip();
  
  // Aggiungi tutti i file alla cartella ZIP
  for (const file of folder.files) {
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    
    // Rimuovi il nome della cartella root dal path per evitare nesting doppio
    const pathInZip = relativePath.split('/').slice(1).join('/') || file.name;
    
    zip.file(pathInZip, file);
  }
  
  // Genera il blob ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Crea un File object dal blob
  return new File([zipBlob], `${folder.name}.zip`, { 
    type: 'application/zip'
  });
}

/**
 * Ottieni l'icona appropriata per il tipo di elemento
 */
export function getItemIcon(item: File | FolderInfo): string {
  if ('files' in item) {
    // È una cartella
    return 'FOLDER';
  } else {
    // È un file - determina l'icona basata sull'estensione
    const extension = item.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'IMAGE';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'mkv':
        return 'VIDEO';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return 'AUDIO';
      case 'pdf':
        return 'PDF';
      case 'txt':
      case 'md':
        return 'TEXT';
      case 'zip':
      case 'rar':
      case '7z':
        return 'ARCHIVE';
      default:
        return 'FILE';
    }
  }
}