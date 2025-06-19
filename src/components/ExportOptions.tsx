import React, { useState } from 'react';
import { Download, Package, Folder } from 'lucide-react';
import { MergeResult } from '../types/addon';
import { createZipFromFiles, downloadFile } from '../utils/fileUtils';

interface ExportOptionsProps {
  mergeResult: MergeResult | null;
  isExporting: boolean;
  onExport: () => void;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ mergeResult, isExporting, onExport }) => {
  const [exportFormat, setExportFormat] = useState<'mcaddon' | 'mcpack' | 'zip' | 'folder'>('mcaddon');

  const handleExport = async () => {
    if (!mergeResult) return;
    
    onExport();
    
    try {
      const addonName = mergeResult.manifest.header.name.replace(/[^a-zA-Z0-9]/g, '_');
      
      if (exportFormat === 'folder') {
        // Create a JSON file with folder structure for download
        const folderStructure = {
          manifest: mergeResult.manifest,
          files: mergeResult.files.map(f => ({
            path: f.path,
            content: f.isText ? f.content : `[Binary file: ${f.path}]`
          }))
        };
        
        const blob = new Blob([JSON.stringify(folderStructure, null, 2)], { type: 'application/json' });
        downloadFile(blob, `${addonName}_structure.json`);
      } else {
        // Create ZIP file
        const zipBlob = await createZipFromFiles(mergeResult.files);
        let extension = '';
        if (exportFormat === 'mcaddon') extension = '.mcaddon';
        else if (exportFormat === 'mcpack') extension = '.mcpack';
        else if (exportFormat === 'zip') extension = '.zip';
        downloadFile(zipBlob, `${addonName}${extension}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (!mergeResult) {
    return (
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600">Merge addons first to enable export options</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Download className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Export Merged Addon</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Export Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportFormat"
                value="mcaddon"
                checked={exportFormat === 'mcaddon'}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">
                <strong>.mcaddon</strong> - Complete addon package (recommended)
              </span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportFormat"
                value="mcpack"
                checked={exportFormat === 'mcpack'}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">
                <strong>.mcpack</strong> - Resource/Behavior pack
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportFormat"
                value="zip"
                checked={exportFormat === 'zip'}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">
                <strong>.zip</strong> - Standard zip archive
              </span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="exportFormat"
                value="folder"
                checked={exportFormat === 'folder'}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm">
                <strong>JSON structure</strong> - For manual installation
              </span>
            </label>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Merge Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>Files: {mergeResult.files.length}</div>
            <div>Conflicts resolved: {mergeResult.conflicts.length}</div>
            <div>Addon: {mergeResult.manifest.header.name} v{mergeResult.manifest.header.version.join('.')}</div>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            isExporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export Merged Addon</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};