import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FileConflict } from '../types/addon';

interface ConflictResolverProps {
  conflicts: FileConflict[];
  onResolveConflict: (conflictIndex: number, resolution: FileConflict['resolution'], selectedAddonId?: string) => void;
}

export const ConflictResolver: React.FC<ConflictResolverProps> = ({ conflicts, onResolveConflict }) => {
  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-green-800">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">No conflicts detected</span>
        </div>
        <p className="text-green-700 mt-1">All files can be merged without conflicts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-orange-800">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="text-lg font-semibold">
          File Conflicts Detected ({conflicts.length})
        </h3>
      </div>
      
      <p className="text-gray-600">
        The following files exist in multiple addons. Choose how to resolve each conflict:
      </p>
      
      <div className="space-y-4">
        {conflicts.map((conflict, index) => (
          <div key={conflict.path} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="font-medium text-orange-900 mb-1">{conflict.path}</h4>
              <p className="text-sm text-orange-700">
                Found in {conflict.addons.length} addons
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${index}-first`}
                  name={`conflict-${index}`}
                  checked={conflict.resolution === 'keep-first'}
                  onChange={() => onResolveConflict(index, 'keep-first')}
                  className="text-blue-600"
                />
                <label htmlFor={`${index}-first`} className="text-sm text-gray-700">
                  Keep from <strong>{conflict.addons[0].addonName}</strong> (first)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${index}-last`}
                  name={`conflict-${index}`}
                  checked={conflict.resolution === 'keep-last'}
                  onChange={() => onResolveConflict(index, 'keep-last')}
                  className="text-blue-600"
                />
                <label htmlFor={`${index}-last`} className="text-sm text-gray-700">
                  Keep from <strong>{conflict.addons[conflict.addons.length - 1].addonName}</strong> (last)
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${index}-manual`}
                  name={`conflict-${index}`}
                  checked={conflict.resolution === 'manual'}
                  onChange={() => onResolveConflict(index, 'manual')}
                  className="text-blue-600"
                />
                <label htmlFor={`${index}-manual`} className="text-sm text-gray-700">
                  Choose manually:
                </label>
              </div>
              
              {conflict.resolution === 'manual' && (
                <div className="ml-6 space-y-1">
                  {conflict.addons.map((addon) => (
                    <div key={addon.addonId} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`${index}-${addon.addonId}`}
                        name={`manual-${index}`}
                        checked={conflict.selectedAddonId === addon.addonId}
                        onChange={() => onResolveConflict(index, 'manual', addon.addonId)}
                        className="text-purple-600"
                      />
                      <label htmlFor={`${index}-${addon.addonId}`} className="text-sm text-gray-600">
                        {addon.addonName}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};