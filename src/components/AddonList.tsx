import React from 'react';
import { Trash2, FileText } from 'lucide-react';
import { LoadedAddon } from '../types/addon';

interface AddonListProps {
  addons: LoadedAddon[];
  onRemoveAddon: (addonId: string) => void;
}

export const AddonList: React.FC<AddonListProps> = ({ addons, onRemoveAddon }) => {
  const getAddonTypeColor = (type: LoadedAddon['type']) => {
    switch (type) {
      case 'behavior':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'resource':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mixed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAddonTypeLabel = (type: LoadedAddon['type']) => {
    switch (type) {
      case 'behavior':
        return 'Behavior Pack';
      case 'resource':
        return 'Resource Pack';
      case 'mixed':
        return 'Mixed Pack';
      default:
        return 'Unknown';
    }
  };

  if (addons.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No addons loaded yet. Upload some .zip or .mcpack files to get started.</p>
      </div>
    );
  }

  // Caminhos das logos padrão
  const resourceLogo = "/rplogo.png";
  const behaviorLogo = "/bhlogo.png";

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Loaded Addons ({addons.length})
      </h3>
      
      {addons.map((addon) => (
        <div
          key={addon.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                {/* Logo padrão para todos os addons */}
                <img
                  src={addon.type === 'resource' ? resourceLogo : behaviorLogo}
                  alt="Addon Logo"
                  className="w-8 h-8 rounded"
                  style={{ background: "#f3f4f6" }}
                />
                <h4 className="font-semibold text-gray-900">{addon.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getAddonTypeColor(addon.type)}`}>
                  {getAddonTypeLabel(addon.type)}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>{addon.files.length} files</span>
                </div>
                <div>Original file: {addon.originalFileName}</div>
                {addon.manifest && (
                  <div>Version: {addon.manifest.header.version.join('.')}</div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onRemoveAddon(addon.id)}
              className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove addon"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};