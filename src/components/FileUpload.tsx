import React, { useCallback } from 'react';
import { Upload, FileUp } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, isProcessing }) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.name.endsWith('.mcaddon') || file.name.endsWith('.mcpack')
    );
    
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = '';
  }, [onFilesSelected]);

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isProcessing
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <div className="animate-spin">
              <FileUp className="w-12 h-12 text-blue-500" />
            </div>
          ) : (
            <Upload className="w-12 h-12 text-gray-400" />
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isProcessing ? 'Processing addons...' : 'Upload Minecraft Addons'}
            </h3>
            <p className="text-gray-600">
              Drag and drop .mcaddon or .mcpack files here, or{' '}
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                browse files
                <input
                  type="file"
                  multiple
                  accept=".mcaddon,.mcpack"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            Supports both Behavior Packs and Resource Packs
          </div>
        </div>
      </div>
    </div>
  );
};