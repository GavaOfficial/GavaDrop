"use client";

import React from 'react';
import { File, FileText, FileImage, FileVideo, FileAudio, Archive } from 'lucide-react';

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
    small: 'w-12 h-12',
    medium: 'w-16 h-16', 
    large: 'w-24 h-24'
  };

  const getFileIcon = () => {
    if (isImage) return FileImage;
    if (isVideo) return FileVideo;
    if (isAudio) return FileAudio;
    if (isPdf || isText) return FileText;
    if (isArchive) return Archive;
    return File;
  };

  const getIconColor = () => {
    if (isImage) return 'from-green-500 to-emerald-600';
    if (isVideo) return 'from-red-500 to-pink-600';
    if (isAudio) return 'from-purple-500 to-violet-600';
    if (isPdf) return 'from-red-600 to-red-700';
    if (isText) return 'from-blue-500 to-cyan-600';
    if (isArchive) return 'from-yellow-500 to-orange-600';
    return 'from-gray-500 to-slate-600';
  };

  const FileIcon = getFileIcon();

  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center rounded-lg bg-gradient-to-br ${getIconColor()} text-white shadow-sm`}>
      <FileIcon className="w-1/2 h-1/2" />
    </div>
  );
};