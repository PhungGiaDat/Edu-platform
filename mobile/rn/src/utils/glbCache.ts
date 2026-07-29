import * as ExpoFileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = 'glb_cache_';

interface IFileSystem {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  getInfoAsync(path: string): Promise<{ exists: boolean }>;
  makeDirectoryAsync(path: string, opts: object): Promise<void>;
  createDownloadResumable(
    url: string,
    path: string
  ): {
    downloadAsync(): Promise<{ uri: string } | undefined>;
  };
}

const FileSystem: IFileSystem = ExpoFileSystem as unknown as IFileSystem;

interface FileInfo {
  exists: boolean;
}

export const glbCache = {
  async getCachedPath(url: string): Promise<string | null> {
    try {
      const key = CACHE_KEY_PREFIX + url;
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const fileInfo: FileInfo = await FileSystem.getInfoAsync(cached);
        if (fileInfo.exists) return cached;
      }
      return null;
    } catch (error) {
      console.error('GLB cache lookup failed:', error);
      return null;
    }
  },

  async cacheFile(url: string, localPath: string): Promise<void> {
    try {
      const key = CACHE_KEY_PREFIX + url;
      await AsyncStorage.setItem(key, localPath);
    } catch (error) {
      console.error('GLB cache write failed:', error);
      throw error;
    }
  },

  async downloadGLB(url: string): Promise<string> {
    try {
      const cached = await glbCache.getCachedPath(url);
      if (cached) return cached;

      const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const modelsDir = `${cacheDir}models/`;
      const dirInfo: FileInfo = await FileSystem.getInfoAsync(modelsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
      }

      const fileName = url.split('/').pop() || 'model.glb';
      const localPath = modelsDir + fileName;

      const downloadResumable = FileSystem.createDownloadResumable(url, localPath);
      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        throw new Error('Download failed');
      }

      await glbCache.cacheFile(url, result.uri);
      return result.uri;
    } catch (error) {
      console.error('GLB download failed:', error);
      throw error;
    }
  },

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_KEY_PREFIX));
      // Clear cache by removing each key individually
      for (const key of cacheKeys) {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('GLB cache clear failed:', error);
    }
  },
};
