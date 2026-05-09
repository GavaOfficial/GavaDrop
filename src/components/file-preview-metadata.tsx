"use client";

import React from 'react';
import {
  ArchiveIcon,
  FileIcon,
  FileTextIcon,
  ImageSquareIcon,
  SpeakerHighIcon,
  VideoIcon,
} from '@phosphor-icons/react';

interface FilePreviewMetadataProps {
  fileName: string;
  fileType?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const FilePreviewMetadata: React.FC<FilePreviewMetadataProps> = ({ 
  fileName,
  fileType = '',
  size = 'small',
  className = '' 
}) => {
  const isImage = fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(fileName);
  const isVideo = fileType.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(fileName);
  const isAudio = fileType.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac)$/i.test(fileName);
  const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
  const isText = fileType.startsWith('text/') || /\.(txt|md|json|xml|csv|html|css|js|ts|py|java|c|cpp)$/i.test(fileName);
  const isArchive = /\.(zip|rar|7z|tar|gz)$/i.test(fileName) || ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'].includes(fileType);

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

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center ${getThemeClasses()}`}>
      <PreviewIcon className={iconClasses[size]} weight="duotone" />
    </div>
  );
};
