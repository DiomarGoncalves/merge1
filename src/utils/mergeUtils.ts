import { LoadedAddon, FileConflict, MergeResult, AddonFile } from '../types/addon';
import { generateNewManifest } from './fileUtils';

export const detectConflicts = (addons: LoadedAddon[]): FileConflict[] => {
  const fileMap = new Map<string, Array<{ addonId: string; addonName: string; content: string | Uint8Array }>>();
  
  // Group files by path
  addons.forEach(addon => {
    addon.files.forEach(file => {
      if (!fileMap.has(file.path)) {
        fileMap.set(file.path, []);
      }
      fileMap.get(file.path)!.push({
        addonId: addon.id,
        addonName: addon.name,
        content: file.content
      });
    });
  });
  
  // Find conflicts (files that exist in multiple addons)
  const conflicts: FileConflict[] = [];
  fileMap.forEach((addonFiles, path) => {
    if (addonFiles.length > 1 && !path.endsWith('/')) {
      conflicts.push({
        path,
        addons: addonFiles,
        resolution: 'keep-last' // Default resolution
      });
    }
  });
  
  return conflicts;
};

export const mergeAddons = (
  addons: LoadedAddon[],
  conflicts: FileConflict[],
  mergedManifest: any
): MergeResult => {
  const mergedFiles: AddonFile[] = [];
  const logs: string[] = [];
  const conflictMap = new Map<string, FileConflict>();
  
  // Create conflict lookup map
  conflicts.forEach(conflict => {
    conflictMap.set(conflict.path, conflict);
  });
  
  // Process all files
  const processedPaths = new Set<string>();
  
  addons.forEach((addon, addonIndex) => {
    addon.files.forEach(file => {
      if (processedPaths.has(file.path)) return;
      
      const conflict = conflictMap.get(file.path);
      
      if (conflict) {
        // Handle conflict resolution
        let selectedContent: string | Uint8Array;
        let selectedAddonName: string;
        
        switch (conflict.resolution) {
          case 'keep-first':
            selectedContent = conflict.addons[0].content;
            selectedAddonName = conflict.addons[0].addonName;
            break;
          case 'keep-last':
            selectedContent = conflict.addons[conflict.addons.length - 1].content;
            selectedAddonName = conflict.addons[conflict.addons.length - 1].addonName;
            break;
          case 'manual':
            const selectedAddon = conflict.addons.find(a => a.addonId === conflict.selectedAddonId);
            if (selectedAddon) {
              selectedContent = selectedAddon.content;
              selectedAddonName = selectedAddon.addonName;
            } else {
              selectedContent = conflict.addons[0].content;
              selectedAddonName = conflict.addons[0].addonName;
            }
            break;
          default:
            selectedContent = file.content;
            selectedAddonName = addon.name;
        }
        
        mergedFiles.push({
          path: file.path,
          content: selectedContent,
          isText: file.isText
        });
        
        logs.push(`Conflict resolved for ${file.path}: kept version from ${selectedAddonName}`);
      } else {
        // No conflict, add file as-is
        mergedFiles.push(file);
        logs.push(`Added ${file.path} from ${addon.name}`);
      }
      
      processedPaths.add(file.path);
    });
  });
  
  // Add the merged manifest
  mergedFiles.push({
    path: 'manifest.json',
    content: JSON.stringify(mergedManifest, null, 2),
    isText: true
  });
  
  logs.push(`Generated new manifest.json with UUID: ${mergedManifest.header.uuid}`);
  logs.push(`Merge completed: ${mergedFiles.length} files total`);
  
  return {
    files: mergedFiles,
    manifest: mergedManifest,
    logs,
    conflicts
  };
};