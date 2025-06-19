import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { AddonFile, AddonManifest, LoadedAddon } from '../types/addon';

export const isTextFile = (filename: string): boolean => {
  const textExtensions = ['.json', '.js', '.mcfunction', '.lang', '.txt', '.md', '.mcmeta'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return textExtensions.includes(extension);
};

export const parseAddonFromFile = async (file: File): Promise<LoadedAddon> => {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  const files: AddonFile[] = [];
  let manifest: AddonManifest | null = null;
  let addonType: 'behavior' | 'resource' | 'mixed' = 'mixed';

  // Detecta se todos os arquivos estão dentro de uma subpasta comum
  const allPaths = Object.keys(zipContent.files).filter(p => !zipContent.files[p].dir);
  let commonPrefix = '';
  if (allPaths.length > 0) {
    const splitPaths = allPaths.map(p => p.split('/').filter(Boolean));
    if (splitPaths.every(parts => parts.length > 1 && parts[0] === splitPaths[0][0])) {
      // Todos os arquivos estão dentro da mesma subpasta
      commonPrefix = splitPaths[0][0] + '/';
    }
  }

  // Process all files in the addon
  for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
    if (zipEntry.dir) continue;

    // Remove prefixo comum se existir
    let normalizedPath = relativePath;
    if (commonPrefix && normalizedPath.startsWith(commonPrefix)) {
      normalizedPath = normalizedPath.slice(commonPrefix.length);
    }

    const isText = isTextFile(normalizedPath);
    const content = await zipEntry.async(isText ? 'text' : 'uint8array');

    files.push({
      path: normalizedPath,
      content,
      isText
    });

    // Parse manifest.json
    if (normalizedPath.endsWith('manifest.json')) {
      try {
        manifest = JSON.parse(content as string);
      } catch (error) {
        console.warn(`Failed to parse manifest from ${relativePath}:`, error);
      }
    }
  }

  // Determine addon type
  const hasBehaviorFiles = files.some(f => 
    f.path.includes('functions/') || 
    f.path.includes('scripts/') || 
    f.path.includes('entities/') ||
    f.path.includes('loot_tables/')
  );
  
  const hasResourceFiles = files.some(f => 
    f.path.includes('textures/') || 
    f.path.includes('models/') || 
    f.path.includes('sounds/') ||
    f.path.includes('animations/')
  );
  
  if (hasBehaviorFiles && !hasResourceFiles) {
    addonType = 'behavior';
  } else if (hasResourceFiles && !hasBehaviorFiles) {
    addonType = 'resource';
  }
  
  return {
    id: uuidv4(),
    name: manifest?.header?.name || file.name.replace(/\.(mcaddon|mcpack|zip)$/, ''),
    type: addonType,
    files,
    manifest,
    originalFileName: file.name
  };
};

export const generateNewManifest = (
  name: string,
  description: string,
  version: [number, number, number],
  addons: LoadedAddon[]
): AddonManifest => {
  const hasBehavior = addons.some(a => a.type === 'behavior' || a.type === 'mixed');
  const hasResource = addons.some(a => a.type === 'resource' || a.type === 'mixed');
  
  const modules = [];
  
  if (hasBehavior) {
    modules.push({
      type: 'data',
      uuid: uuidv4(),
      version
    });
  }
  
  if (hasResource) {
    modules.push({
      type: 'resources',
      uuid: uuidv4(),
      version
    });
  }
  
  return {
    format_version: 2,
    header: {
      name,
      description,
      uuid: uuidv4(),
      version,
      min_engine_version: [1, 20, 0]
    },
    modules
  };
};

export const downloadFile = (content: Blob, filename: string): void => {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const createZipFromFiles = async (files: AddonFile[]): Promise<Blob> => {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.path, file.content);
  });
  
  return await zip.generateAsync({ type: 'blob' });
};