import React from 'react';
import { FileText, Clock } from 'lucide-react';

interface MergeLogsProps {
  logs: string[];
}

export const MergeLogs: React.FC<MergeLogsProps> = ({ logs }) => {
  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Merge Log</h3>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 text-sm">
              <Clock className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};