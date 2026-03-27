// lib/api.ts
// API service for connecting to the Colab backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// TYPES
// ============================================

export interface Detection {
  label: string;
  confidence: number;
  box: [number, number, number, number];
  detection_id?: string;
}

export interface SearchResponse {
  counts: Record<string, number>;
  detections: Detection[];
  image_base64: string;
  image_hash: string;
  error?: string;
}

export interface AugmentResponse {
  image_base64?: string;
  error?: string;
  detail?: string;
  [key: string]: any;
}

export interface FolderInfo {
  name: string;
  path: string;
  image_count: number;
  created: string;
}

export interface ImageInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export interface ModelStatus {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  progress: string | null;
}

export interface ModelsStatusResponse {
  models: Record<string, ModelStatus>;
  gpu: {
    allocated_gb: number;
    reserved_gb: number;
    total_gb: number;
    free_gb: number;
  };
  current_model: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = 120000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export function base64ToImageUrl(base64: string): string {
  if (!base64) return '';
  if (base64.startsWith('data:')) return base64;
  return `data:image/png;base64,${base64}`;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// ============================================
// API FUNCTIONS - HEALTH & MODEL MANAGEMENT
// ============================================

export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/`, { method: 'GET' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getModelsStatus(): Promise<ModelsStatusResponse> {
  const response = await fetch(`${API_URL}/models/status`);
  return response.json();
}

export async function warmupModel(modelName: 'sd3_inpaint' | 'pix2pix'): Promise<{ status: string; model: string }> {
  const response = await fetch(`${API_URL}/models/warmup/${modelName}`, {
    method: 'POST',
  });
  return response.json();
}

export async function unloadModels(): Promise<any> {
  const response = await fetch(`${API_URL}/models/unload`, {
    method: 'POST',
  });
  return response.json();
}

// ============================================
// API FUNCTIONS - FOLDER MANAGEMENT
// ============================================

export async function listFolders(): Promise<FolderInfo[]> {
  const response = await fetch(`${API_URL}/api/folders`);
  const data = await response.json();
  return data.folders || [];
}

export async function createFolder(name: string): Promise<any> {
  const formData = new FormData();
  formData.append('name', name);

  const response = await fetch(`${API_URL}/api/folders`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function deleteFolder(name: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/folders/${name}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function listImages(folderName: string, subfolder: string = 'original'): Promise<ImageInfo[]> {
  const response = await fetch(`${API_URL}/api/folders/${folderName}/images?subfolder=${subfolder}`);
  const data = await response.json();
  return data.images || [];
}

export async function uploadImage(folderName: string, file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/folders/${folderName}/upload`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

export async function deleteImage(folderName: string, imageName: string): Promise<any> {
  const response = await fetch(`${API_URL}/api/folders/${folderName}/images/${imageName}`, {
    method: 'DELETE',
  });
  return response.json();
}

export async function getImage(folderName: string, imageName: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/folders/${folderName}/images/${imageName}`);
  const data = await response.json();
  return data.image_base64 || '';
}

// ============================================
// API FUNCTIONS - OBJECT OPERATIONS
// ============================================

export async function searchObjects(file: File): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetchWithTimeout(`${API_URL}/search`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function removeObject(
  file: File,
  index: number,
  imageHash?: string,
  detectionId?: string,
  useSam: boolean = true
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('index', index.toString());
  formData.append('use_sam', useSam.toString());
  if (imageHash) formData.append('image_hash', imageHash);
  if (detectionId) formData.append('detection_id', detectionId);

  const response = await fetchWithTimeout(`${API_URL}/object/remove`, {
    method: 'POST',
    body: formData,
  }, 180000);

  return response.json();
}

export async function addObject(
  file: File,
  prompt: string,
  box: [number, number, number, number],
  useSam: boolean = false
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('prompt', prompt);
  formData.append('box', JSON.stringify(box));
  formData.append('use_sam', useSam.toString());

  const response = await fetchWithTimeout(`${API_URL}/object/add`, {
    method: 'POST',
    body: formData,
  }, 180000);

  return response.json();
}

export async function replaceObject(
  file: File,
  index: number,
  replacement: string,
  imageHash?: string,
  useSam: boolean = true
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('index', index.toString());
  formData.append('replacement', replacement);
  formData.append('use_sam', useSam.toString());
  if (imageHash) formData.append('image_hash', imageHash);

  const response = await fetchWithTimeout(`${API_URL}/object/replace`, {
    method: 'POST',
    body: formData,
  }, 180000);

  return response.json();
}

// ============================================
// API FUNCTIONS - LIGHTING AUGMENTATION
// ============================================

export type ColorFilter = 'none' | 'red' | 'green' | 'blue' | 'black_and_white' | 'sepia' | 'warm' | 'cool';
export type TimeOfDay = 'none' | 'day' | 'golden_hour' | 'night' | 'dawn' | 'dusk';
export type ShadowLevel = 'none' | 'light' | 'medium' | 'heavy' | 'road_shadows';

export async function applyLighting(
  file: File,
  options: {
    brightness?: number;        // -1.0 to 1.0
    contrast?: number;          // -1.0 to 1.0
    shadows?: ShadowLevel;
    sun_flare?: boolean;
    time_of_day?: TimeOfDay;
    color_filter?: ColorFilter;
  }
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('brightness', (options.brightness ?? 0).toString());
  formData.append('contrast', (options.contrast ?? 0).toString());
  formData.append('shadows', options.shadows ?? 'none');
  formData.append('sun_flare', (options.sun_flare ?? false).toString());
  formData.append('time_of_day', options.time_of_day ?? 'day');
  formData.append('color_filter', options.color_filter ?? 'none');

  const response = await fetchWithTimeout(`${API_URL}/augment/lighting`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

// ============================================
// API FUNCTIONS - COLOR OPERATIONS (Object-based)
// ============================================

export async function detectObjectsByColor(
  file: File,
  targetColor: string,
  tolerance: number = 30
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_color', targetColor);
  formData.append('tolerance', tolerance.toString());

  const response = await fetchWithTimeout(`${API_URL}/augment/color/detect`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function changeObjectColor(
  file: File,
  targetColor: string,
  newColor: string,
  tolerance: number = 30,
  useSam: boolean = true
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_color', targetColor);
  formData.append('new_color', newColor);
  formData.append('tolerance', tolerance.toString());
  formData.append('use_sam', useSam.toString());

  const response = await fetchWithTimeout(`${API_URL}/augment/color/change`, {
    method: 'POST',
    body: formData,
  }, 180000);

  return response.json();
}

// ============================================
// API FUNCTIONS - WEATHER AUGMENTATION
// ============================================

export type WeatherType = 'rain' | 'snow' | 'fog' | 'sunny' | 'cloudy' | 'shadows' | 'gravel' | 'motion_blur';

export async function applyWeather(
  file: File,
  weatherType: WeatherType,
  intensity: number = 0.5,
  useAI: boolean = false
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('weather_type', weatherType);
  formData.append('intensity', intensity.toString());
  formData.append('use_ai', useAI.toString());

  const response = await fetchWithTimeout(`${API_URL}/augment/weather`, {
    method: 'POST',
    body: formData,
  }, useAI ? 600000 : 30000);  // 10 min for AI (includes model loading), 30s for fast

  return response.json();
}

export async function applyWeatherBatch(
  file: File,
  weatherTypes: string[],
  intensity: number = 0.5,
  folderName?: string
): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('weather_types', weatherTypes.join(','));
  formData.append('intensity', intensity.toString());
  if (folderName) formData.append('folder_name', folderName);

  const response = await fetchWithTimeout(`${API_URL}/augment/weather/batch`, {
    method: 'POST',
    body: formData,
  }, 120000);

  return response.json();
}

// ============================================
// API FUNCTIONS - SEASON AUGMENTATION
// ============================================

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export async function applySeason(
  file: File,
  targetSeason: Season,
  intensity: number = 0.7
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_season', targetSeason);
  formData.append('intensity', intensity.toString());

  const response = await fetchWithTimeout(`${API_URL}/augment/season`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applySeasonAI(
  file: File,
  targetSeason: Season,
  intensity: number = 0.8
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_season', targetSeason);
  formData.append('intensity', intensity.toString());

  const response = await fetchWithTimeout(`${API_URL}/augment/season/ai`, {
    method: 'POST',
    body: formData,
  }, 600000);  // 10 min for AI

  return response.json();
}

// ============================================
// API FUNCTIONS - BACKGROUND CHANGE
// ============================================

export async function changeBackground(
  foregroundFile: File,
  backgroundFile: File
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('foreground', foregroundFile);
  formData.append('background', backgroundFile);

  const response = await fetchWithTimeout(`${API_URL}/augment/background`, {
    method: 'POST',
    body: formData,
  }, 60000);

  return response.json();
}

export async function changeBackgroundAI(
  file: File,
  backgroundPrompt: string
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('background_prompt', backgroundPrompt);

  const response = await fetchWithTimeout(`${API_URL}/augment/background/ai`, {
    method: 'POST',
    body: formData,
  }, 600000);  // 10 min for AI

  return response.json();
}

export async function removeBackground(
  file: File,
  method: 'auto' | 'transparent_background' | 'rembg' = 'auto'
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('method', method);

  const response = await fetchWithTimeout(`${API_URL}/augment/background/remove`, {
    method: 'POST',
    body: formData,
  }, 120000);

  return response.json();
}

// ============================================
// API FUNCTIONS - BASIC TRANSFORMS
// ============================================

export async function applyFlip(
  file: File,
  horizontal: boolean = false,
  vertical: boolean = false
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('horizontal', horizontal.toString());
  formData.append('vertical', vertical.toString());

  const response = await fetchWithTimeout(`${API_URL}/transform/flip`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applyScale(
  file: File,
  scaleX: number = 1,
  scaleY: number = 1
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('scale_x', scaleX.toString());
  formData.append('scale_y', scaleY.toString());

  const response = await fetchWithTimeout(`${API_URL}/transform/scale`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applyRotation(
  file: File,
  angle: number = 0
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('angle', angle.toString());

  const response = await fetchWithTimeout(`${API_URL}/transform/rotation`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applyCrop(
  file: File,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('box', JSON.stringify([x1, y1, x2, y2]));

  const response = await fetchWithTimeout(`${API_URL}/transform/crop`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applyTranslation(
  file: File,
  offsetX: number = 0,
  offsetY: number = 0
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('offset_x', offsetX.toString());
  formData.append('offset_y', offsetY.toString());

  const response = await fetchWithTimeout(`${API_URL}/transform/translation`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

export async function applyNoise(
  file: File,
  noiseType: 'gaussian' | 'salt-pepper' | 'poisson' | 'speckle' = 'gaussian',
  intensity: number = 0.1
): Promise<AugmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('noise_type', noiseType);
  formData.append('intensity', intensity.toString());

  const response = await fetchWithTimeout(`${API_URL}/transform/noise`, {
    method: 'POST',
    body: formData,
  }, 30000);

  return response.json();
}

// ============================================
// API FUNCTIONS - SAVE
// ============================================

export async function saveImage(
  imageBase64: string,
  folderName: string,
  filename: string,
  subfolder: string = 'augmented'
): Promise<any> {
  const formData = new FormData();
  formData.append('image_base64', imageBase64);
  formData.append('folder_name', folderName);
  formData.append('filename', filename);
  formData.append('subfolder', subfolder);

  const response = await fetch(`${API_URL}/save`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

export async function saveBatch(
  images: Record<string, string>,
  folderName: string,
  baseFilename: string
): Promise<any> {
  const formData = new FormData();
  formData.append('images', JSON.stringify(images));
  formData.append('folder_name', folderName);
  formData.append('base_filename', baseFilename);

  const response = await fetch(`${API_URL}/save/batch`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

// ============================================
// EXPORT DEFAULT API OBJECT
// ============================================

const api = {
  // Health & Models
  checkConnection,
  getModelsStatus,
  warmupModel,
  unloadModels,

  // Folders
  listFolders,
  createFolder,
  deleteFolder,
  listImages,
  uploadImage,
  deleteImage,
  getImage,

  // Object Operations
  searchObjects,
  removeObject,
  addObject,
  replaceObject,

  // Lighting (includes color filters)
  applyLighting,

  // Color Operations (object-based)
  detectObjectsByColor,
  changeObjectColor,

  // Weather
  applyWeather,
  applyWeatherBatch,

  // Season
  applySeason,
  applySeasonAI,

  // Background
  changeBackground,
  changeBackgroundAI,
  removeBackground,

  // Basic Transforms
  applyFlip,
  applyScale,
  applyRotation,
  applyCrop,
  applyTranslation,
  applyNoise,

  // Save
  saveImage,
  saveBatch,

  // Helpers
  base64ToImageUrl,
  fileToBase64,
};

export default api;
