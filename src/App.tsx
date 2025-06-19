import React, { useState, useCallback } from 'react';
import { Puzzle, Moon, Sun } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AddonList } from './components/AddonList';
import { ConflictResolver } from './components/ConflictResolver';
import { ManifestEditor } from './components/ManifestEditor';
import { ExportOptions } from './components/ExportOptions';
import { MergeLogs } from './components/MergeLogs';
import { LoadedAddon, FileConflict, MergeResult } from './types/addon';
import { parseAddonFromFile, generateNewManifest } from './utils/fileUtils';
import { detectConflicts, mergeAddons } from './utils/mergeUtils';

function App() {
  const [addons, setAddons] = useState<LoadedAddon[]>([]);
  const [conflicts, setConflicts] = useState<FileConflict[]>([]);
  const [mergeResult, setMergeResult] = useState<MergeResult | null>(null);
  const [mergedManifest, setMergedManifest] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    
    try {
      const newAddons: LoadedAddon[] = [];
      
      for (const file of files) {
        try {
          const addon = await parseAddonFromFile(file);
          newAddons.push(addon);
        } catch (error) {
          console.error(`Failed to parse ${file.name}:`, error);
          alert(`Failed to parse ${file.name}. Please ensure it's a valid .mcaddon or .mcpack file.`);
        }
      }
      
      if (newAddons.length > 0) {
        setAddons(prev => [...prev, ...newAddons]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleRemoveAddon = useCallback((addonId: string) => {
    setAddons(prev => prev.filter(addon => addon.id !== addonId));
    setMergeResult(null);
    setConflicts([]);
  }, []);

  const handleDetectConflicts = useCallback(() => {
    if (addons.length === 0) return;
    
    const detectedConflicts = detectConflicts(addons);
    setConflicts(detectedConflicts);
    
    // Generate default manifest
    const defaultManifest = generateNewManifest(
      'Merged Addon',
      'Combined addon created with Minecraft Addon Merger',
      [1, 0, 0],
      addons
    );
    setMergedManifest(defaultManifest);
  }, [addons]);

  const handleResolveConflict = useCallback((
    conflictIndex: number,
    resolution: FileConflict['resolution'],
    selectedAddonId?: string
  ) => {
    setConflicts(prev => prev.map((conflict, index) => 
      index === conflictIndex
        ? { ...conflict, resolution, selectedAddonId }
        : conflict
    ));
  }, []);

  const handleMergeAddons = useCallback(() => {
    if (addons.length === 0 || !mergedManifest) return;
    
    const result = mergeAddons(addons, conflicts, mergedManifest);
    setMergeResult(result);
  }, [addons, conflicts, mergedManifest]);

  const handleManifestChange = useCallback((manifest: any) => {
    setMergedManifest(manifest);
  }, []);

  const handleExport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 2000);
  }, []);

  React.useEffect(() => {
    if (addons.length > 0) {
      handleDetectConflicts();
    }
  }, [addons, handleDetectConflicts]);

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className={`text-center mb-8 p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Puzzle className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Minecraft Addon Merger
            </h1>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Combine multiple Minecraft Bedrock Edition addons with intelligent conflict resolution
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <FileUpload onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />
            
            {/* Addon List */}
            {addons.length > 0 && (
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <AddonList addons={addons} onRemoveAddon={handleRemoveAddon} />
              </div>
            )}
            
            {/* Conflict Resolution */}
            {addons.length > 0 && (
              <div className={`p-6 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <ConflictResolver conflicts={conflicts} onResolveConflict={handleResolveConflict} />
                
                {addons.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleMergeAddons}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Merge Addons ({addons.length})
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Merge Logs */}
            {mergeResult && (
              <div className={`rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <MergeLogs logs={mergeResult.logs} />
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Manifest Editor */}
            {mergedManifest && (
              <ManifestEditor 
                manifest={mergedManifest} 
                onManifestChange={handleManifestChange}
              />
            )}
            
            {/* Export Options */}
            <ExportOptions 
              mergeResult={mergeResult}
              isExporting={isExporting}
              onExport={handleExport}
            />
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center mt-12 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-600'}`}>
          <p className="text-sm">
            Built for Minecraft Bedrock Edition addon creators. Supports BP, RP, and mixed packs.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;