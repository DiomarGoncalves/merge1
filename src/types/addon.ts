export interface AddonManifest {
  format_version: number;
  header: {
    name: string;
    description: string;
    uuid: string;
    version: [number, number, number];
    min_engine_version?: [number, number, number];
  };
  modules: Array<{
    type: string;
    uuid: string;
    version: [number, number, number];
    description?: string;
  }>;
  dependencies?: Array<{
    uuid: string;
    version: [number, number, number];
  }>;
}

export interface AddonFile {
  path: string;
  content: string | Uint8Array;
  isText: boolean;
}

export interface LoadedAddon {
  id: string;
  name: string;
  type: 'behavior' | 'resource' | 'mixed';
  files: AddonFile[];
  manifest: AddonManifest | null;
  originalFileName: string;
}

export interface FileConflict {
  path: string;
  addons: Array<{
    addonId: string;
    addonName: string;
    content: string | Uint8Array;
  }>;
  resolution?: 'keep-first' | 'keep-last' | 'manual';
  selectedAddonId?: string;
}

export interface MergeResult {
  files: AddonFile[];
  manifest: AddonManifest;
  logs: string[];
  conflicts: FileConflict[];
}