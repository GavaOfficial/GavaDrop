"use client";

import React, { useState, useEffect } from 'react';
import {
  ArchiveIcon,
  FileIcon,
  FileTextIcon,
  ImageSquareIcon,
  SpeakerHighIcon,
  VideoIcon,
} from '@phosphor-icons/react';
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
    small: 'h-12 w-12 rounded-xl',
    medium: 'h-16 w-16 rounded-2xl',
    large: 'h-24 w-24 rounded-2xl'
  };

  const iconClasses = {
    small: 'h-5 w-5',
    medium: 'h-7 w-7',
    large: 'h-10 w-10'
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
    if (isImage) return ImageSquareIcon;
    if (isVideo) return VideoIcon;
    if (isAudio) return SpeakerHighIcon;
    if (isPdf || isText) return FileTextIcon;
    if (isArchive) return ArchiveIcon;
    return FileIcon;
  };

  const getThemeClasses = () => {
    if (isAudio) return 'bg-[#dff36b]/15 text-[#dff36b]';
    if (isArchive) return 'bg-[#f2d45d]/15 text-[#f2d45d]';
    if (isImage || isVideo) return 'bg-[#c9a6ff]/15 text-[#c9a6ff]';
    return 'bg-white/[0.04] text-white/55';
  };

  const PreviewIcon = getFileIcon();

  if (isImage && previewUrl && !error) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative overflow-hidden border border-white/[0.06] bg-white/[0.04]`}>
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
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center ${getThemeClasses()}`}>
      <PreviewIcon className={iconClasses[size]} weight="duotone" />
    </div>
  );
};
