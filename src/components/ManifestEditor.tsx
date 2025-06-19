import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { AddonManifest } from '../types/addon';

interface ManifestEditorProps {
  manifest: AddonManifest | null;
  onManifestChange: (manifest: AddonManifest) => void;
}

export const ManifestEditor: React.FC<ManifestEditorProps> = ({ manifest, onManifestChange }) => {
  const [editedManifest, setEditedManifest] = useState<AddonManifest | null>(manifest);
  
  useEffect(() => {
    setEditedManifest(manifest);
  }, [manifest]);

  if (!editedManifest) {
    return null;
  }

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedManifest };
    
    if (field === 'name') {
      updated.header.name = value;
    } else if (field === 'description') {
      updated.header.description = value;
    } else if (field === 'version') {
      const parts = value.split('.').map((v: string) => parseInt(v) || 0);
      if (parts.length === 3) {
        updated.header.version = [parts[0], parts[1], parts[2]];
      }
    }
    
    setEditedManifest(updated);
  };

  const handleSave = () => {
    if (editedManifest) {
      onManifestChange(editedManifest);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Addon Configuration</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Addon Name
          </label>
          <input
            type="text"
            value={editedManifest.header.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter addon name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={editedManifest.header.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter addon description"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Version (x.y.z)
          </label>
          <input
            type="text"
            value={editedManifest.header.version.join('.')}
            onChange={(e) => handleFieldChange('version', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="1.0.0"
            pattern="[0-9]+\.[0-9]+\.[0-9]+"
          />
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>UUID:</strong> {editedManifest.header.uuid}</div>
            <div><strong>Format Version:</strong> {editedManifest.format_version}</div>
            <div><strong>Modules:</strong> {editedManifest.modules.length}</div>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration</span>
        </button>
      </div>
    </div>
  );
};