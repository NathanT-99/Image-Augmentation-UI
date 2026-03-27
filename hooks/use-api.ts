// hooks/use-api.ts
// Custom React hooks for API operations

import { useState, useCallback } from 'react';
import api, { 
  Detection, 
  SearchResponse, 
  AugmentResponse,
  base64ToImageUrl 
} from '@/lib/api';

// ============================================
// CONNECTION HOOK
// ============================================

export function useConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    try {
      const connected = await api.checkConnection();
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isConnected, isChecking, checkConnection };
}

// ============================================
// IMAGE STATE HOOK
// ============================================

export interface ImageState {
  originalFile: File | null;
  originalUrl: string;
  augmentedBase64: string;
  augmentedUrl: string;
  detections: Detection[];
  imageHash: string;
}

export function useImageState() {
  const [imageState, setImageState] = useState<ImageState>({
    originalFile: null,
    originalUrl: '',
    augmentedBase64: '',
    augmentedUrl: '',
    detections: [],
    imageHash: '',
  });

  const setOriginalImage = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setImageState(prev => ({
      ...prev,
      originalFile: file,
      originalUrl: url,
      augmentedBase64: '',
      augmentedUrl: '',
      detections: [],
      imageHash: '',
    }));
  }, []);

  const setAugmentedImage = useCallback((base64: string) => {
    setImageState(prev => ({
      ...prev,
      augmentedBase64: base64,
      augmentedUrl: base64ToImageUrl(base64),
    }));
  }, []);

  const setDetections = useCallback((detections: Detection[], imageHash: string) => {
    setImageState(prev => ({
      ...prev,
      detections,
      imageHash,
    }));
  }, []);

  const clearImages = useCallback(() => {
    setImageState({
      originalFile: null,
      originalUrl: '',
      augmentedBase64: '',
      augmentedUrl: '',
      detections: [],
      imageHash: '',
    });
  }, []);

  return {
    imageState,
    setOriginalImage,
    setAugmentedImage,
    setDetections,
    clearImages,
  };
}

// ============================================
// AUGMENTATION HOOK
// ============================================

export function useAugmentation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const processAugmentation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    setIsProcessing(true);
    setError(null);
    setProgress(`Processing ${operationName}...`);

    try {
      const result = await operation();
      setProgress(`${operationName} complete!`);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setProgress(`${operationName} failed: ${errorMessage}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    error,
    progress,
    processAugmentation,
    setError,
    setProgress,
  };
}

// ============================================
// FOLDER MANAGEMENT HOOK
// ============================================

export interface Folder {
  name: string;
  images: string[];
  expanded: boolean;
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const folderList = await api.listFolders();
      
      // Load images for each folder
      const foldersWithImages = await Promise.all(
        folderList.map(async (folder) => {
          const images = await api.listImages(folder.name);
          return {
            name: folder.name,
            images: images.map(img => img.name),
            expanded: false,
          };
        })
      );

      setFolders(foldersWithImages);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addFolder = useCallback(async (name: string) => {
    await api.createFolder(name);
    await loadFolders();
  }, [loadFolders]);

  const removeFolder = useCallback(async (name: string) => {
    await api.deleteFolder(name);
    await loadFolders();
  }, [loadFolders]);

  const toggleFolder = useCallback((name: string) => {
    setFolders(prev => 
      prev.map(f => 
        f.name === name ? { ...f, expanded: !f.expanded } : f
      )
    );
  }, []);

  return {
    folders,
    isLoading,
    loadFolders,
    addFolder,
    removeFolder,
    toggleFolder,
    setFolders,
  };
}
