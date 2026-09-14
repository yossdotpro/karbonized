import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, File, Image, FileText, Video, Music, Trash2 } from 'lucide-react';
import { fileHandler, fileUtils, FileInfo, FileUploadOptions } from '@/lib/blocks-api';

interface FileInputProps {
  value: string | string[]; // File ID or array of file IDs
  onChange: (value: string | string[]) => void;
  label?: string;
  placeholder?: string;
  accept?: string[];
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  convertToDataUrl?: boolean;
  className?: string;
}

export const FileInput: React.FC<FileInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Click to upload files',
  accept = ['*/*'],
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  convertToDataUrl = true,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileIds = Array.isArray(value) ? value : (value ? [value] : []);
  const files = fileIds.map(id => fileHandler.getFile(id)).filter(Boolean) as FileInfo[];

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const options: FileUploadOptions = {
        accept,
        multiple,
        maxSize,
        maxFiles,
        convertToDataUrl,
      };

      const result = await fileHandler.uploadFile(options);
      
      if (multiple) {
        const newFiles = Array.isArray(result) ? result : [result];
        const newFileIds = newFiles.map(f => f.id);
        onChange([...fileIds, ...newFileIds]);
      } else {
        const newFile = Array.isArray(result) ? result[0] : result;
        onChange(newFile.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    fileHandler.removeFile(fileId);
    
    if (multiple) {
      const newFileIds = fileIds.filter(id => id !== fileId);
      onChange(newFileIds);
    } else {
      onChange('');
    }
  };

  const getFileIcon = (file: FileInfo) => {
    if (fileUtils.isImage(file)) {
      return <Image className="h-4 w-4" />;
    } else if (fileUtils.isVideo(file)) {
      return <Video className="h-4 w-4" />;
    } else if (fileUtils.isAudio(file)) {
      return <Music className="h-4 w-4" />;
    } else if (file.type.includes('text') || file.name.endsWith('.pdf')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const getFilePreview = (file: FileInfo) => {
    if (fileUtils.isImage(file) && file.dataUrl) {
      return (
        <div className="relative w-16 h-16 rounded overflow-hidden border">
          <img 
            src={file.dataUrl} 
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleUpload}
        disabled={isUploading || (multiple && files.length >= maxFiles)}
        className="w-full h-8 text-sm"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? 'Uploading...' : placeholder}
      </Button>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 p-2 border rounded-control bg-background/50"
            >
              {/* File Preview */}
              {getFilePreview(file)}
              
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getFileIcon(file)}
                  <span className="text-sm font-medium truncate">
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {fileUtils.formatFileSize(file.size)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {file.type || 'Unknown type'}
                  </span>
                </div>
              </div>

              {/* Remove Button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(file.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-muted-foreground">
        {accept.length > 0 && accept[0] !== '*/*' && (
          <div>Accepted formats: {accept.join(', ')}</div>
        )}
        {maxSize && (
          <div>Maximum file size: {fileUtils.formatFileSize(maxSize)}</div>
        )}
        {multiple && maxFiles && (
          <div>Maximum files: {maxFiles}</div>
        )}
      </div>
    </div>
  );
};

// Specialized ImageInput component
interface ImageInputProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

export const ImageInput: React.FC<ImageInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Click to upload images',
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB default for images
  maxFiles = 10,
  maxWidth = 1920,
  maxHeight = 1080,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileIds = Array.isArray(value) ? value : (value ? [value] : []);
  const files = fileIds.map(id => fileHandler.getFile(id)).filter(Boolean) as FileInfo[];

  const handleUpload = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const options: FileUploadOptions = {
        accept: ['image/*'],
        multiple,
        maxSize,
        maxFiles,
        convertToDataUrl: true,
      };

      const result = await fileHandler.uploadFile(options);
      
      if (multiple) {
        const newFiles = Array.isArray(result) ? result : [result];
        const newFileIds = newFiles.map(f => f.id);
        onChange([...fileIds, ...newFileIds]);
      } else {
        const newFile = Array.isArray(result) ? result[0] : result;
        onChange(newFile.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    fileHandler.removeFile(fileId);
    
    if (multiple) {
      const newFileIds = fileIds.filter(id => id !== fileId);
      onChange(newFileIds);
    } else {
      onChange('');
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-xs text-muted-foreground">
          {label}
        </Label>
      )}

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleUpload}
        disabled={isUploading || (multiple && files.length >= maxFiles)}
        className="w-full h-8 text-sm"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? 'Uploading...' : placeholder}
      </Button>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Image Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group border rounded-control overflow-hidden bg-background/50"
            >
              {/* Image Preview */}
              {file.dataUrl ? (
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-muted">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Remove Button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRemoveFile(file.id)}
                className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </Button>

              {/* File Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1">
                <div className="text-xs truncate">{file.name}</div>
                <div className="text-xs opacity-75">
                  {fileUtils.formatFileSize(file.size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-muted-foreground">
        <div>Accepted formats: Images (JPG, PNG, GIF, WebP, SVG)</div>
        {maxSize && (
          <div>Maximum file size: {fileUtils.formatFileSize(maxSize)}</div>
        )}
        {multiple && maxFiles && (
          <div>Maximum files: {maxFiles}</div>
        )}
      </div>
    </div>
  );
};
