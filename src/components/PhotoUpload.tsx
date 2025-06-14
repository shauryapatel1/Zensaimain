import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadProps {
  onPhotoSelect: (file: File | null) => void;
  currentPhoto?: string | null;
  disabled?: boolean;
  className?: string;
}

export default function PhotoUpload({ 
  onPhotoSelect, 
  currentPhoto, 
  disabled = false, 
  className = '' 
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setPreview(null);
      onPhotoSelect(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onPhotoSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearPhoto = () => {
    setPreview(null);
    onPhotoSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-zen-sage-200">
              <img
                src={preview}
                alt="Journal photo"
                className="w-full h-48 object-cover"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                  <button
                    onClick={openFileDialog}
                    disabled={disabled}
                    className="p-2 bg-white/90 text-zen-sage-700 rounded-full hover:bg-white transition-colors shadow-lg"
                    title="Change photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearPhoto}
                    disabled={disabled}
                    className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white transition-colors shadow-lg"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer
              ${isDragging 
                ? 'border-zen-mint-400 bg-zen-mint-50' 
                : 'border-zen-sage-300 hover:border-zen-mint-400 hover:bg-zen-mint-50/50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-zen-mint-200' : 'bg-zen-sage-100'}
              `}>
                {isDragging ? (
                  <Upload className="w-6 h-6 text-zen-mint-600" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zen-sage-600" />
                )}
              </div>
              
              <div>
                <p className="font-medium text-zen-sage-700 mb-1">
                  {isDragging ? 'Drop your photo here' : 'Add a photo to your entry'}
                </p>
                <p className="text-sm text-zen-sage-500">
                  Drag & drop or click to browse • Max 5MB
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}