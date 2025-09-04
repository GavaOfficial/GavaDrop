"use client";

import React, { useState, useEffect } from 'react';
import { File, FileText, FileImage, FileVideo, FileAudio, Archive } from 'lucide-react';
import Image from 'next/image';

interface FilePreviewProps {
  file: File;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  size = 'small',
  className = '' 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const isPdf = file.type === 'application/pdf';
  const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
  const isArchive = ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(file.type);

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16', 
    large: 'w-24 h-24'
  };

  useEffect(() => {
    if (isImage && file.size < 5 * 1024 * 1024) { // Only preview images < 5MB
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, isImage]);

  const getFileIcon = () => {
    if (isImage) return FileImage;
    if (isVideo) return FileVideo;
    if (isAudio) return FileAudio;
    if (isPdf || isText) return FileText;
    if (isArchive) return Archive;
    return File;
  };

  const FileIcon = getFileIcon();

  if (isImage && previewUrl && !error) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800`}>
        <Image
          src={previewUrl}
          alt={file.name}
          fill
          className="object-cover"
          onError={() => setError(true)}
          sizes={size === 'large' ? '96px' : size === 'medium' ? '64px' : '48px'}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white`}>
      <FileIcon className="w-1/2 h-1/2" />
    </div>
  );
};