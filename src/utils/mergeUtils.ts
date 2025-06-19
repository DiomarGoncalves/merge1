import { LoadedAddon, FileConflict, MergeResult, AddonFile } from '../types/addon';
import { generateNewManifest } from './fileUtils';
import { readFileSync } from 'fs';

// Função utilitária para merge de conteúdo de arquivos texto
function mergeFileContents(path: string, files: Array<{ content: string | Uint8Array, isText: boolean }>): string | Uint8Array {
  // Unificação especial para main.js e _import.js
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith('main.js') || lowerPath.endsWith('_import.js')) {
    // Junta todos os conteúdos de main.js e _import.js
    const lines = new Set<string>();
    files.forEach(f => {
      (f.content as string).split('\n').forEach(line => {
        lines.add(line);
      });
    });
    return Array.from(lines).join('\n');
  }
  if (path.endsWith('.json')) {
    // Merge profundo de JSON
    try {
      const merged = files
        .map(f => JSON.parse(f.content as string))
        .reduce((acc, obj) => deepMerge(acc, obj), {});
      return JSON.stringify(merged, null, 2);
    } catch {
      // Se der erro, retorna o último
      return files[files.length - 1].content;
    }
  }
  if (path.endsWith('.lang') || path.endsWith('.txt')) {
    // Junta linhas, evitando duplicatas
    const lines = new Set<string>();
    files.forEach(f => {
      (f.content as string).split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed) lines.add(trimmed);
      });
    });
    return Array.from(lines).join('\n');
  }
  if (path.endsWith('.js')) {
    // Junta scripts JS, separando por linha e evitando duplicatas exatas
    const lines = new Set<string>();
    files.forEach(f => {
      (f.content as string).split('\n').forEach(line => {
        lines.add(line);
      });
    });
    return Array.from(lines).join('\n');
  }
  // Para outros arquivos texto, concatena tudo
  return files.map(f => f.content as string).join('\n');
}

// Merge profundo para objetos JSON
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object' || !target || !source) return source;
  for (const key of Object.keys(source)) {
    if (key in target) {
      target[key] = deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge profundo, mas une arrays (concatena e remove duplicatas por valor JSON)
function deepMergeUi(target: any, source: any): any {
  if (Array.isArray(target) && Array.isArray(source)) {
    const merged = [...target];
    source.forEach(item => {
      const exists = merged.some(existing =>
        JSON.stringify(existing) === JSON.stringify(item)
      );
      if (!exists) merged.push(item);
    });
    return merged;
  }
  if (typeof target === 'object' && typeof source === 'object' && target && source) {
    const result: any = { ...target };
    for (const key of Object.keys(source)) {
      if (key in result) {
        result[key] = deepMergeUi(result[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
  return source;
}

// Merge especial para arquivos de UI (une arrays)
function mergeUiJsonFiles(files: AddonFile[]): any {
  return files
    .map(f => JSON.parse(f.content as string))
    .reduce((acc, obj) => deepMergeUi(acc, obj), {});
}

// Merge especial para arquivos de textura (une texture_data)
function mergeTextureJsonFiles(files: AddonFile[]): any {
  const merged = files
    .map(f => JSON.parse(f.content as string))
    .reduce((acc, obj) => {
      // Unir texture_data se existir
      if (obj.texture_data && acc.texture_data) {
        acc.texture_data = { ...acc.texture_data, ...obj.texture_data };
      } else if (obj.texture_data) {
        acc.texture_data = { ...obj.texture_data };
      }
      // Unir outros campos normalmente
      for (const key of Object.keys(obj)) {
        if (key !== 'texture_data') {
          acc[key] = deepMerge(acc[key], obj[key]);
        }
      }
      return acc;
    }, {});
  return merged;
}

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

// Função para merge de manifests de todos os addons
function mergeManifests(baseManifest: any, addons: LoadedAddon[]): any {
  // Copia o header do baseManifest (nome, uuid, etc)
  const mergedManifest = { ...baseManifest };
  // Unifica todos os módulos dos manifests dos addons, evitando duplicatas por tipo
  const allModules: any[] = [];
  const seenTypes = new Set<string>();
  addons.forEach(addon => {
    if (addon.manifest && Array.isArray(addon.manifest.modules)) {
      addon.manifest.modules.forEach(mod => {
        // Evita duplicar tipos (data/resources/scripts)
        if (!seenTypes.has(mod.type)) {
          const modCopy = { ...mod };
          // Força o entry dos scripts para scripts/main.js
          if (modCopy.type === 'script') {
            modCopy.entry = 'scripts/main.js';
          }
          allModules.push(modCopy);
          seenTypes.add(mod.type);
        }
      });
    }
  });
  // Garante que os módulos do baseManifest também estejam presentes
  if (Array.isArray(baseManifest.modules)) {
    baseManifest.modules.forEach(mod => {
      if (!seenTypes.has(mod.type)) {
        const modCopy = { ...mod };
        if (modCopy.type === 'script') {
          modCopy.entry = 'scripts/main.js';
        }
        allModules.push(modCopy);
        seenTypes.add(mod.type);
      }
    });
  }
  mergedManifest.modules = allModules;

  // Unifica dependencies (sem duplicatas)
  const allDeps: any[] = [];
  const seenDeps = new Set<string>();
  addons.forEach(addon => {
    if (addon.manifest && Array.isArray(addon.manifest.dependencies)) {
      addon.manifest.dependencies.forEach(dep => {
        const versionKey = Array.isArray(dep.version) ? dep.version.join('.') : String(dep.version ?? '');
        const key = dep.uuid + versionKey;
        if (!seenDeps.has(key)) {
          allDeps.push({ ...dep });
          seenDeps.add(key);
        }
      });
    }
  });
  if (Array.isArray(baseManifest.dependencies)) {
    baseManifest.dependencies.forEach(dep => {
      const versionKey = Array.isArray(dep.version) ? dep.version.join('.') : String(dep.version ?? '');
      const key = dep.uuid + versionKey;
      if (!seenDeps.has(key)) {
        allDeps.push({ ...dep });
        seenDeps.add(key);
      }
    });
  }

  // --- FILTRAR DEPENDÊNCIAS QUE NÃO ESTÃO NOS MÓDULOS ---
  if (allDeps.length > 0) {
    const moduleUuids = new Set(
      (mergedManifest.modules || []).map((mod: any) => mod.uuid)
    );
    mergedManifest.dependencies = allDeps.filter(dep => moduleUuids.has(dep.uuid));
    // Se não sobrar nenhuma dependência válida, remova o campo
    if (mergedManifest.dependencies.length === 0) {
      delete mergedManifest.dependencies;
    }
  }

  return mergedManifest;
}

function mergeUiDefsFiles(uiDefsFiles: AddonFile[]): any {
  // Junta todos os arrays ui_defs, removendo duplicatas
  const allUiDefs: string[] = [];
  uiDefsFiles.forEach(f => {
    try {
      const obj = JSON.parse(f.content as string);
      if (Array.isArray(obj.ui_defs)) {
        obj.ui_defs.forEach((def: string) => {
          if (!allUiDefs.includes(def)) {
            allUiDefs.push(def);
          }
        });
      }
    } catch {
      // ignora erros de parse
    }
  });
  return { ui_defs: allUiDefs };
}

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

  // Agrupa todos os arquivos main.js e _import.js para merge especial
  const scriptMergeMap: Record<string, Array<{ content: string | Uint8Array, isText: boolean }>> = {};

  addons.forEach((addon) => {
    addon.files.forEach((file) => {
      const lowerPath = file.path.toLowerCase();
      if (lowerPath.endsWith('main.js') || lowerPath.endsWith('_import.js')) {
        if (!scriptMergeMap['main.js']) scriptMergeMap['main.js'] = [];
        scriptMergeMap['main.js'].push({ content: file.content, isText: file.isText });
        // Não marque como processado ainda, pois pode haver ambos
      }
    });
  });

  // Adiciona os arquivos main.js e _import.js unificados se houver algum
  if (scriptMergeMap['main.js']) {
    const mergedScript = mergeFileContents('main.js', scriptMergeMap['main.js']);
    // Gera ambos os arquivos
    mergedFiles.push({
      path: 'scripts/main.js',
      content: mergedScript,
      isText: true
    });
    mergedFiles.push({
      path: 'scripts/_import.js',
      content: mergedScript,
      isText: true
    });
    logs.push('Merged all main.js and _import.js scripts into scripts/main.js and scripts/_import.js');
  }

  // Marque ambos como processados para evitar duplicidade
  addons.forEach((addon) => {
    addon.files.forEach((file) => {
      const lowerPath = file.path.toLowerCase();
      if (lowerPath.endsWith('main.js') || lowerPath.endsWith('_import.js')) {
        processedPaths.add(file.path);
      }
    });
  });

  // Merge especial para todos os arquivos _ui_defs.json
  const uiDefsFiles: AddonFile[] = [];
  const uiJsonFilesMap: Record<string, AddonFile[]> = {};

  addons.forEach((addon) => {
    addon.files.forEach((file) => {
      if (file.path.endsWith('_ui_defs.json')) {
        uiDefsFiles.push(file);
      }
      // Merge especial para todos os arquivos ui/*.json que aparecem em múltiplos addons
      if (file.path.startsWith('ui/') && file.path.endsWith('.json')) {
        if (!uiJsonFilesMap[file.path]) uiJsonFilesMap[file.path] = [];
        uiJsonFilesMap[file.path].push(file);
      }
    });
  });

  // _ui_defs.json (array union)
  if (uiDefsFiles.length > 0) {
    try {
      const mergedUiDefs = mergeUiDefsFiles(uiDefsFiles);
      mergedFiles.push({
        path: 'ui/_ui_defs.json',
        content: JSON.stringify(mergedUiDefs, null, 2),
        isText: true
      });
      logs.push(`Merged ${uiDefsFiles.length} _ui_defs.json files into one unified ui/_ui_defs.json (array union)`);
    } catch (e) {
      mergedFiles.push({
        path: 'ui/_ui_defs.json',
        content: uiDefsFiles[0].content,
        isText: true
      });
      logs.push('Failed to merge _ui_defs.json, using the first one found.');
    }
  }

  // Merge todos os arquivos ui/*.json que aparecem em múltiplos addons (exceto _ui_defs.json)
  Object.entries(uiJsonFilesMap).forEach(([path, files]) => {
    if (files.length > 1 && !path.endsWith('_ui_defs.json')) {
      try {
        const mergedUi = mergeUiJsonFiles(files);
        mergedFiles.push({
          path,
          content: JSON.stringify(mergedUi, null, 2),
          isText: true
        });
        logs.push(`Merged ${files.length} files into unified ${path} (UI array union)`);
      } catch {
        mergedFiles.push({
          path,
          content: files[0].content,
          isText: true
        });
        logs.push(`Failed to merge ${path}, using the first one found.`);
      }
    }
  });

  // Marque todos como processados para não duplicar
  const processedUiDefs = new Set(uiDefsFiles.map(f => f.path));
  const processedUiJsons = new Set(
    Object.entries(uiJsonFilesMap)
      .filter(([_, files]) => files.length > 1)
      .map(([path]) => path)
  );
  addons.forEach((addon, addonIndex) => {
    addon.files.forEach(file => {
      if (processedPaths.has(file.path)) return;
      if (processedUiDefs.has(file.path) && file.path.endsWith('_ui_defs.json')) return;
      if (processedUiJsons.has(file.path) && file.path.startsWith('ui/') && file.path.endsWith('.json')) return;

      const conflict = conflictMap.get(file.path);

      if (conflict) {
        // --- MERGE ESPECIAL PARA blocks.json ---
        if (file.path.endsWith('blocks.json')) {
          const allFiles = conflict.addons.map((a) => {
            const addonObj = addons.find(ad => ad.id === a.addonId);
            const fileObj = addonObj?.files.find(f => f.path === conflict.path);
            return fileObj
              ? { content: fileObj.content, isText: fileObj.isText }
              : { content: a.content, isText: true };
          });
          const mergedContent = JSON.stringify(mergeBlocksJson(allFiles), null, 2);
          mergedFiles.push({
            path: file.path,
            content: mergedContent,
            isText: file.isText
          });
          logs.push(`Conflict merged for ${file.path}: unified content from ${conflict.addons.length} addons (blocks.json special merge)`);
        }
        // --- MERGE ESPECIAL PARA arquivos de textura ---
        else if (
          (file.path === 'textures/item_texture.json' || file.path === 'textures/terrain_texture.json')
        ) {
          const allFiles = conflict.addons.map((a) => {
            const addonObj = addons.find(ad => ad.id === a.addonId);
            const fileObj = addonObj?.files.find(f => f.path === conflict.path);
            return fileObj
              ? fileObj
              : { content: a.content, isText: true, path: file.path };
          });
          const mergedTexture = mergeTextureJsonFiles(allFiles);
          mergedFiles.push({
            path: file.path,
            content: JSON.stringify(mergedTexture, null, 2),
            isText: true
          });
          logs.push(`Conflict merged for ${file.path}: unified texture_data from ${conflict.addons.length} addons`);
        }
        // --- MERGE ESPECIAL PARA UI JSONs ---
        else if (
          file.path.startsWith('ui/') &&
          file.path.endsWith('.json') &&
          !file.path.endsWith('_ui_defs.json')
        ) {
          const allFiles = conflict.addons.map((a) => {
            const addonObj = addons.find(ad => ad.id === a.addonId);
            const fileObj = addonObj?.files.find(f => f.path === conflict.path);
            return fileObj
              ? fileObj
              : { content: a.content, isText: true, path: file.path };
          });
          const mergedUi = mergeUiJsonFiles(allFiles);
          mergedFiles.push({
            path: file.path,
            content: JSON.stringify(mergedUi, null, 2),
            isText: true
          });
          logs.push(`Conflict merged for ${file.path}: unified content from ${conflict.addons.length} addons (UI special merge)`);
        }
        // --- MERGE PADRÃO ---
        else {
          // Para qualquer outro arquivo, sempre faz merge de todos os conteúdos
          const allFiles = conflict.addons.map((a) => {
            const addonObj = addons.find(ad => ad.id === a.addonId);
            const fileObj = addonObj?.files.find(f => f.path === conflict.path);
            return fileObj
              ? { content: fileObj.content, isText: fileObj.isText }
              : { content: a.content, isText: true };
          });
          const mergedContent = mergeFileContents(file.path, allFiles);

          mergedFiles.push({
            path: file.path,
            content: mergedContent,
            isText: file.isText
          });

          logs.push(`Conflict merged for ${file.path}: unified content from ${conflict.addons.length} addons`);
        }
      } else {
        // No conflict, add file as-is
        mergedFiles.push(file);
        logs.push(`Added ${file.path} from ${addon.name}`);
      }

      processedPaths.add(file.path);
    });
  });
  
  // Inclui todos os arquivos de assets e scripts de todos os addons, mesmo se não houver conflito
  addons.forEach((addon) => {
    addon.files.forEach((file) => {
      if (
        (file.path.startsWith('textures/') ||
         file.path.startsWith('textures\\') ||
         file.path.startsWith('sounds/') ||
         file.path.startsWith('sounds\\') ||
         file.path.startsWith('scripts/') ||
         file.path.startsWith('scripts\\')) &&
        !mergedFiles.some(f => f.path === file.path) &&
        !processedPaths.has(file.path)
      ) {
        mergedFiles.push(file);
        logs.push(`Included asset/script ${file.path} from ${addon.name}`);
      }
    });
  });

  // Inclua todos os arquivos de materiais e modelos de todos os addons, sem sobrescrever
  addons.forEach((addon) => {
    addon.files.forEach((file) => {
      if (
        (file.path.startsWith('materials/') ||
         file.path.startsWith('models/') ||
         file.path.startsWith('materials\\') ||
         file.path.startsWith('models\\')) &&
        !mergedFiles.some(f => f.path === file.path) &&
        !processedPaths.has(file.path)
      ) {
        mergedFiles.push(file);
        logs.push(`Included material/model ${file.path} from ${addon.name}`);
      }
    });
  });

  // Antes de adicionar o manifest, faça merge dos manifests dos addons
  const finalManifest = mergeManifests(mergedManifest, addons);

  // Add the merged manifest
  mergedFiles.push({
    path: 'manifest.json',
    content: JSON.stringify(finalManifest, null, 2),
    isText: true
  });

  logs.push(`Generated new manifest.json with UUID: ${finalManifest.header.uuid}`);
  logs.push(`Merge completed: ${mergedFiles.length} files total`);
  
  return {
    files: mergedFiles,
    manifest: finalManifest,
    logs,
    conflicts
  };
};

// No merge de blocks.json, una os objetos, mas evite sobrescrever componentes de geometria de blocos customizados
function mergeBlocksJson(files: AddonFile[]): any {
  // Merge profundo, mas nunca sobrescreva "minecraft:geometry" de blocos customizados
  // E remova propriedades legadas se geometry estiver presente
  const merged = files
    .map(f => JSON.parse(f.content as string))
    .reduce((acc, obj) => {
      for (const key in obj) {
        if (!acc[key]) {
          acc[key] = obj[key];
        } else {
          // Se ambos têm geometry, mantém a primeira geometry encontrada
          if (
            obj[key].components &&
            obj[key].components["minecraft:geometry"] &&
            acc[key].components &&
            acc[key].components["minecraft:geometry"]
          ) {
            acc[key] = { ...deepMerge(acc[key], obj[key]) };
            acc[key].components["minecraft:geometry"] = acc[key].components["minecraft:geometry"];
          } else {
            acc[key] = deepMerge(acc[key], obj[key]);
          }
        }
        // --- Remover propriedades legadas se geometry presente ---
        if (
          acc[key].components &&
          acc[key].components["minecraft:geometry"]
        ) {
          delete acc[key].components["minecraft:block_shape"];
          delete acc[key].components["minecraft:legacy_block"];
          delete acc[key].components["minecraft:material_instances"];
        }
      }
      return acc;
    }, {});
  return merged;
}

// No processo de merge, chame mergeAssets e inclua os arquivos no resultado final