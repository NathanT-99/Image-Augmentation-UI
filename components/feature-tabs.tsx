// components/feature-tabs.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Cloud, Sun, SunDim, ImageIcon, Layers, Search, Plus, Minus, Replace, 
  Move, RotateCw, Crop, ZoomIn, FlipHorizontal, Waves, Loader2, Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import api from "@/lib/api"
import type { ImageState } from "@/app/page"
import { AIModelWarmup, type ModelStatus } from "@/components/ai-model-warmup"
import { clear } from "console"

type CategoryType = "image-level" | "object-based" | "basic-transforms"

interface FeatureTabsProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  activeCategory: CategoryType
  setActiveCategory: (category: CategoryType) => void
  addLog: (message: string) => void
  imageState: ImageState
  onAugmentationResult: (base64: string, message: string) => void
  clearAugmentationResult: () => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  isConnected: boolean
}

const imageLevelTabs = [
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "lighting", label: "Lighting", icon: SunDim },
  { id: "season", label: "Season", icon: Layers },
  { id: "background", label: "Background", icon: ImageIcon },
]

const objectBasedTabs = [
  { id: "search", label: "Search", icon: Search },
  { id: "add", label: "Add", icon: Plus },
  { id: "remove", label: "Remove", icon: Minus },
  { id: "replace", label: "Replace", icon: Replace },
]

const basicTransformTabs = [
  { id: "flip", label: "Flip", icon: FlipHorizontal },
  { id: "scale", label: "Scale", icon: ZoomIn },
  { id: "rotation", label: "Rotation", icon: RotateCw },
  { id: "crop", label: "Crop", icon: Crop },
  { id: "translation", label: "Translation", icon: Move },
  { id: "noise", label: "Noise", icon: Waves },
]

const categories = [
  { id: "image-level" as CategoryType, label: "Image-Level", tabs: imageLevelTabs },
  { id: "object-based" as CategoryType, label: "Object-Based", tabs: objectBasedTabs },
  { id: "basic-transforms" as CategoryType, label: "Basic Transforms", tabs: basicTransformTabs },
]

export function FeatureTabs({ 
  activeTab, 
  setActiveTab, 
  activeCategory, 
  setActiveCategory, 
  addLog,
  imageState,
  onAugmentationResult,
  clearAugmentationResult,
  isProcessing,
  setIsProcessing,
  isConnected,
}: FeatureTabsProps) {
  const handleCategoryChange = (category: CategoryType) => {
    setActiveCategory(category)
    const categoryTabs = categories.find(c => c.id === category)?.tabs
    if (categoryTabs && categoryTabs.length > 0) {
      setActiveTab(categoryTabs[0].id)
    }
  }

  const currentCategoryTabs = categories.find(c => c.id === activeCategory)?.tabs || []

  // ============================================
  // SHARED Pre-load AI
  // ============================================

  // ─── SD3 Model Status (shared across all AI panels) ───────────────
  const [sd3Status, setSd3Status] = useState<ModelStatus>({
    loaded: false,
    loading: false,
  })
  // ─── Pix2Pix Model Status (Weather + Season AI) ───────────────
  const [pix2pixStatus, setPix2pixStatus] = useState<ModelStatus>({
    loaded: false,
    loading: false,
  })

  // Poll status to check both models
  useEffect(() => {
    if (!isConnected) return

    const poll = async () => {
      try {
        const status = await api.getModelsStatus()

        const sd = status?.models?.sd3_inpaint ?? (status as any).sd3_inpaint ?? null
        if (sd) {
          setSd3Status((prev) => ({
            loaded: sd.loaded ?? false,
            loading: prev.loading && !sd.loaded ? true : false,
            error: sd.error ?? undefined,
          }))
        }

        const p2p = status?.models?.pix2pix ?? (status as any).pix2pix ?? null
        if (p2p) {
          setPix2pixStatus((prev) => ({
            loaded: p2p.loaded ?? false,
            loading: prev.loading && !p2p.loaded ? true : false,
            error: p2p.error ?? undefined,
          }))
        }
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [isConnected])

  const warmupSD3 = async () => {
    setSd3Status({ loaded: false, loading: true })
    addLog("[INFO] Starting SD3 model warmup...")
    try {
      const result = await api.warmupModel('sd3_inpaint')
      if (result.status === 'started') {
        addLog("[INFO] SD3 loading in background...")
        const interval = setInterval(async () => {
          try {
            const status = await api.getModelsStatus()
            const sd = status?.models?.sd3_inpaint ?? (status as any).sd3_inpaint ?? null
            if (sd?.loaded) {
              setSd3Status({ loaded: true, loading: false })
              addLog("[INFO] SD3 model ready!")
              clearInterval(interval)
            } else if (sd?.error) {
              setSd3Status({ loaded: false, loading: false, error: sd.error })
              addLog(`[ERROR] SD3 load failed: ${sd.error}`)
              clearInterval(interval)
            }
          } catch (err) {
            clearInterval(interval)
          }
        }, 5000)
      } else if (result.status === 'already_loaded') {
        setSd3Status({ loaded: true, loading: false })
        addLog("[INFO] SD3 model already loaded")
      }
    } catch (err) {
      setSd3Status({ loaded: false, loading: false, error: String(err) })
      addLog(`[ERROR] Warmup failed: ${err}`)
    }
  }

  const warmupPix2Pix = async () => {
    setPix2pixStatus({ loaded: false, loading: true })
    addLog("[INFO] Starting Pix2Pix model warmup...")
    try {
      const result = await api.warmupModel('pix2pix')
      if (result.status === 'started') {
        addLog("[INFO] Pix2Pix loading in background...")
        const interval = setInterval(async () => {
          try {
            const status = await api.getModelsStatus()
            const p2p = status?.models?.pix2pix ?? (status as any).pix2pix ?? null
            if (p2p?.loaded) {
              setPix2pixStatus({ loaded: true, loading: false })
              addLog("[INFO] Pix2Pix model ready!")
              clearInterval(interval)
            } else if (p2p?.error) {
              setPix2pixStatus({ loaded: false, loading: false, error: p2p.error ?? undefined })
              addLog(`[ERROR] Pix2Pix load failed: ${p2p.error}`)
              clearInterval(interval)
            }
          } catch (err) {
            clearInterval(interval)
          }
        }, 5000)
      } else if (result.status === 'already_loaded') {
        setPix2pixStatus({ loaded: true, loading: false })
        addLog("[INFO] Pix2Pix model already loaded")
      }
    } catch (err) {
      setPix2pixStatus({ loaded: false, loading: false, error: String(err) })
      addLog(`[ERROR] Pix2Pix warmup failed: ${err}`)
    }
  }
  // ─── End SD3/Pix2Pix shared state ─────────────────────────────────────────

  // Shared props for all panels
  const panelProps = {
    addLog,
    imageState,
    onAugmentationResult,
    clearAugmentationResult,
    isProcessing,
    setIsProcessing,
    isConnected,
    sd3Status,
    warmupSD3,
    pix2pixStatus,
    warmupPix2Pix,
  }

  return (
    <div className="border-b border-border bg-card">
      {/* Category Navigation */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "font-medium",
              activeCategory !== category.id && "opacity-50 hover:opacity-80"
            )}
            onClick={() => handleCategoryChange(category.id)}
          >
            {category.label}
          </Button>
        ))}
        
        {/* Connection indicator */}
        <div className="ml-auto text-xs">
          {isConnected ? (
            <span className="text-accent">● API Connected</span>
          ) : (
            <span className="text-destructive">● API Disconnected - Configure .env.local</span>
          )}
        </div>
      </div>

      {/* Tab Navigation within Category */}
      <div className="flex items-center gap-1 px-4 py-2">
        {currentCategoryTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "secondary" : "ghost"}
            size="sm"
            className={cn("gap-1.5", activeTab === tab.id && "bg-secondary text-secondary-foreground")}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="border-t border-border bg-muted/30 px-4 py-3">
        {/* Image-Level Panels */}
        {activeCategory === "image-level" && activeTab === "weather" && <WeatherPanel {...panelProps} />}
        {activeCategory === "image-level" && activeTab === "lighting" && <LightingPanel {...panelProps} />}
        {activeCategory === "image-level" && activeTab === "season" && <SeasonPanel {...panelProps} />}
        {activeCategory === "image-level" && activeTab === "background" && <BackgroundPanel {...panelProps} />}
        
        {/* Object-Based Panels */}
        {activeCategory === "object-based" && activeTab === "search" && <SearchPanel {...panelProps} />}
        {activeCategory === "object-based" && activeTab === "add" && <AddPanel {...panelProps} />}
        {activeCategory === "object-based" && activeTab === "remove" && <RemovePanel {...panelProps} />}
        {activeCategory === "object-based" && activeTab === "replace" && <ReplacePanel {...panelProps} />}
        
        {/* Basic Transform Panels */}
        {activeCategory === "basic-transforms" && activeTab === "flip" && <FlipPanel {...panelProps} />}
        {activeCategory === "basic-transforms" && activeTab === "scale" && <ScalePanel {...panelProps} />}
        {activeCategory === "basic-transforms" && activeTab === "rotation" && <RotationPanel {...panelProps} />}
        {activeCategory === "basic-transforms" && activeTab === "crop" && <CropPanel {...panelProps} />}
        {activeCategory === "basic-transforms" && activeTab === "translation" && <TranslationPanel {...panelProps} />}
        {activeCategory === "basic-transforms" && activeTab === "noise" && <NoisePanel {...panelProps} />}
      </div>
    </div>
  )
}

// ============================================
// SHARED PANEL PROPS INTERFACE
// ============================================

interface PanelProps {
  addLog: (msg: string) => void
  imageState: ImageState
  onAugmentationResult: (base64: string, message: string) => void
  clearAugmentationResult: () => void
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  isConnected: boolean
  sd3Status: ModelStatus
  warmupSD3: () => Promise<void>
  pix2pixStatus: ModelStatus
  warmupPix2Pix: () => Promise<void>
}

// ============================================
// IMAGE-LEVEL PANELS
// ============================================

function WeatherPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, pix2pixStatus, warmupPix2Pix }: PanelProps) {
  const [selectedWeather, setSelectedWeather] = useState<string[]>(["sunny"])
  const [intensity, setIntensity] = useState([0.5])
  const [generateAll, setGenerateAll] = useState(false)
  const [useAI, setUseAI] = useState(false)
  // REMOVED: const [modelStatus, setModelStatus] = useState<any>(null)
  // REMOVED: useEffect for checkModelStatus
  // REMOVED: checkModelStatus function

  const weatherOptions = [
    { id: "sunny", label: "Sunny", icon: "☀️" },
    { id: "rain", label: "Rain", icon: "🌧️" },
    { id: "snow", label: "Snow", icon: "❄️" },
    { id: "fog", label: "Fog", icon: "🌫️" },
    { id: "cloudy", label: "Cloudy", icon: "☁️" },
    { id: "shadows", label: "Shadows", icon: "🌑" },
    { id: "gravel", label: "Gravel", icon: "⬛" },
    { id: "motion_blur", label: "Motion Blur", icon: "💨" },
  ]

  const toggleWeather = (id: string) => {
    setSelectedWeather((prev) => (prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]))
  }

  const selectAll = () => {
    setSelectedWeather(weatherOptions.map((w) => w.id))
    addLog("[INFO] Selected all weather conditions")
  }

  const deselectAll = () => {
    setSelectedWeather([])
    addLog("[INFO] Deselected all weather conditions")
  }

  const applyWeather = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      toast.warning("No image selected", { description: "Upload or select an image first" })
      return
    }
    if (selectedWeather.length === 0) {
      addLog("[WARN] No weather condition selected")
      toast.warning("No weather selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      toast.error("Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    const weatherType = selectedWeather[0] as 'rain' | 'snow' | 'fog' | 'sunny' | 'cloudy' | 'shadows' | 'gravel' | 'motion_blur'
    const modeLabel = useAI ? "AI-enhanced" : "fast"
    addLog(`[INFO] Applying ${weatherType} weather effect (${modeLabel}, intensity: ${intensity[0].toFixed(2)})...`)

    try {
      const result = await api.applyWeather(imageState.originalFile, weatherType, intensity[0], useAI)

      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied ${weatherType} weather effect (${modeLabel})`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
        toast.error("Weather augmentation failed", { description: result.error })
      }
    } catch (err) {
      addLog(`[ERROR] Weather augmentation failed: ${err}`)
      toast.error("Weather augmentation failed", { description: String(err) })
    } finally {
      setIsProcessing(false)
    }
  }

  const applyAllVariants = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Generating all weather variants...`)

    try {
      const result = await api.applyWeatherBatch(
        imageState.originalFile,
        selectedWeather,
        intensity[0]
      )

      if (result.results) {
        const successCount = Object.values(result.results).filter((r: any) => r.success).length
        addLog(`[INFO] Generated ${successCount}/${selectedWeather.length} weather variants`)
        
        const firstSuccess = Object.entries(result.results).find(([_, r]: [string, any]) => r.success)
        if (firstSuccess) {
          const [name, data] = firstSuccess as [string, any]
          onAugmentationResult(data.image_base64, `[INFO] Showing ${name} variant (${successCount} total generated)`)
        }
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}`)
      }
    } catch (err) {
      addLog(`[ERROR] Batch weather failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Weather Checkboxes with header */}
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium text-muted-foreground shrink-0">Weather Conditions</Label>
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-xs">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll} className="h-6 px-2 text-xs">
            Deselect All
          </Button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weatherOptions.map((weather) => (
            <div
              key={weather.id}
              className={cn(
                "flex flex-col items-center gap-0.7 rounded border-2 px-2.5 py-1.5 cursor-pointer transition-colors min-w-[50px]",
                selectedWeather.includes(weather.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground",
              )}
              onClick={() => toggleWeather(weather.id)}
            >
              <span className="text-sm">{weather.icon}</span>
              <span className="text-[9px] font-medium">{weather.label}</span>
              <Checkbox
                checked={selectedWeather.includes(weather.id)}
                className="h-3 w-3"
                onCheckedChange={() => toggleWeather(weather.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Intensity Slider */}
      <div className="w-40 space-y-2.5 shrink-0">
        <Label className="text-xs font-medium text-muted-foreground">Intensity: {intensity[0].toFixed(2)}</Label>
        <Slider value={intensity} onValueChange={setIntensity} min={0} max={1} step={0.01} className="w-full" />
      </div>

      {/* Options — CHANGED: replaced inline button with AIModelWarmup */}
      <div className="space-y-1.5 shrink-0">
        <Label className="text-xs font-medium text-muted-foreground">Options</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={generateAll} onCheckedChange={setGenerateAll} className="scale-90" />
            <span className="text-xs">All Variants</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={useAI} onCheckedChange={setUseAI} className="scale-90" />
            <span className="text-xs">AI Enhanced</span>
          </div>
        </div>
        {useAI && (
          <AIModelWarmup
            modelName="pix2pix"
            displayName="Pix2Pix"
            status={pix2pixStatus}
            onWarmup={warmupPix2Pix}
            isConnected={isConnected}
          />
        )}
      </div>

      {/* Apply */}
      <div className="shrink-0">
        <Button
          onClick={generateAll ? applyAllVariants : applyWeather}
          disabled={isProcessing || !imageState.originalFile}
          size="sm"
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
          {isProcessing ? "Processing..." : generateAll ? "Generate All" : "Apply Weather"}
        </Button>
      </div>
    </div>
  )
}

function LightingPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [brightness, setBrightness] = useState([0])
  const [contrast, setContrast] = useState([0])
  const [shadow, setShadow] = useState("none")
  const [sunFlare, setSunFlare] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState("none")
  const [colorFilter, setColorFilter] = useState("none")

  const colorFilters = [
    { id: "none", label: "None", color: "bg-muted" },
    { id: "red", label: "Red", color: "bg-red-500" },
    { id: "green", label: "Green", color: "bg-green-500" },
    { id: "blue", label: "Blue", color: "bg-blue-500" },
    { id: "black_and_white", label: "B&W", color: "bg-gradient-to-r from-black to-white" },
    { id: "sepia", label: "Sepia", color: "bg-amber-700" },
    { id: "warm", label: "Warm", color: "bg-orange-400" },
    { id: "cool", label: "Cool", color: "bg-cyan-400" },
  ]

  const applyLighting = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying lighting adjustments...`)

    try {
      const result = await api.applyLighting(imageState.originalFile, {
        brightness: brightness[0],
        contrast: contrast[0],
        shadows: shadow as any,
        sun_flare: sunFlare,
        time_of_day: timeOfDay as any,
        color_filter: colorFilter as any,
      })

      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied lighting adjustments`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Lighting augmentation failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-4">
      {/* Brightness */}
      <div className="w-36 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Brightness: {brightness[0] > 0 ? "+" : ""}{brightness[0].toFixed(2)}
        </Label>
        <Slider value={brightness} onValueChange={setBrightness} min={-1} max={1} step={0.01} className="w-full" />
      </div>

      {/* Contrast */}
      <div className="w-36 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          Contrast: {contrast[0] > 0 ? "+" : ""}{contrast[0].toFixed(2)}
        </Label>
        <Slider value={contrast} onValueChange={setContrast} min={-1} max={1} step={0.01} className="w-full" />
      </div>

      {/* Shadow Dropdown */}
      <div className="w-28 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Shadow</Label>
        <Select value={shadow} onValueChange={setShadow}>
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="heavy">Heavy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Time of Day */}
      <div className="w-32 space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Time of Day</Label>
        <Select value={timeOfDay} onValueChange={setTimeOfDay}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="golden_hour">Golden Hour</SelectItem>
            <SelectItem value="dawn">Dawn</SelectItem>
            <SelectItem value="dusk">Dusk</SelectItem>
            <SelectItem value="night">Night</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Filter */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Color Filter</Label>
        <div className="flex gap-1">
          {colorFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setColorFilter(filter.id)}
              className={cn(
                "w-7 h-7 rounded border-2 transition-all",
                filter.color,
                colorFilter === filter.id 
                  ? "border-primary ring-1 ring-primary scale-110" 
                  : "border-border hover:border-muted-foreground"
              )}
              title={filter.label}
            />
          ))}
        </div>
      </div>

      {/* Sun Flare Toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Effects</Label>
        <div className="flex items-center gap-1.5 h-7">
          <Switch checked={sunFlare} onCheckedChange={setSunFlare} className="scale-90" />
          <Sun className="h-3.5 w-3.5 text-chart-3" />
          <span className="text-xs">Flare</span>
        </div>
      </div>

      {/* Apply */}
      <div className="shrink-0 self-end">
        <Button
          onClick={applyLighting}
          disabled={isProcessing || !imageState.originalFile}
          size="sm"
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SunDim className="mr-2 h-4 w-4" />}
          {isProcessing ? "Processing..." : "Apply Lighting"}
        </Button>
      </div>
    </div>
  )
}

function SeasonPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, pix2pixStatus, warmupPix2Pix }: PanelProps) {
  // NOTE: Season uses InstructPix2Pix, not SD3 — no warmup needed
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(["summer"])
  const [intensity, setIntensity] = useState([0.7])
  const [generateAll, setGenerateAll] = useState(false)
  const [useAI, setUseAI] = useState(false)
  // REMOVED: const [modelStatus, setModelStatus] = useState<any>(null)
  // REMOVED: useEffect for checkModelStatus
  // REMOVED: checkModelStatus function

  const seasons = [
    { id: "spring", label: "Spring", icon: "🌸" },
    { id: "summer", label: "Summer", icon: "☀️" },
    { id: "fall", label: "Autumn", icon: "🍂" },
    { id: "winter", label: "Winter", icon: "❄️" },
  ]

  const toggleSeason = (id: string) => {
    setSelectedSeasons((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const selectAll = () => {
    setSelectedSeasons(seasons.map((s) => s.id))
    addLog("[INFO] Selected all seasons")
  }

  const deselectAll = () => {
    setSelectedSeasons([])
    addLog("[INFO] Deselected all seasons")
  }

  const applySeason = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (selectedSeasons.length === 0) {
      addLog("[WARN] No season selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    const season = selectedSeasons[0] as 'spring' | 'summer' | 'fall' | 'winter'
    addLog(`[INFO] Applying ${season} transformation${useAI ? ' (AI mode - Pix2Pix)' : ''}...`)

    try {
      let result
      if (useAI) {
        result = await api.applySeasonAI(imageState.originalFile, season, intensity[0])
      } else {
        result = await api.applySeason(imageState.originalFile, season, intensity[0])
      }

      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied ${season} transformation`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Season transformation failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Season Checkboxes with header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Label className="text-xs font-medium text-muted-foreground shrink-0">Season Conditions</Label>
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-xs">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll} className="h-6 px-2 text-xs">
            Deselect All
          </Button>
        </div>
        <div className="flex gap-1.5">
          {seasons.map((season) => (
            <div
              key={season.id}
              className={cn(
                "flex flex-col items-center gap-0.7 rounded border-2 px-2.5 py-1.5 cursor-pointer transition-colors min-w-[50px]",
                selectedSeasons.includes(season.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground",
              )}
              onClick={() => toggleSeason(season.id)}
            >
              <span className="text-sm">{season.icon}</span>
              <span className="text-[9px] font-medium">{season.label}</span>
              <Checkbox
                checked={selectedSeasons.includes(season.id)}
                className="h-3 w-3"
                onCheckedChange={() => toggleSeason(season.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div className="w-40 space-y-2.5 shrink-0">
        <Label className="text-xs font-medium text-muted-foreground">Intensity: {intensity[0].toFixed(2)}</Label>
        <Slider value={intensity} onValueChange={setIntensity} min={0} max={1} step={0.01} className="w-full" />
      </div>

      {/* Options — CHANGED: removed broken warmup button, no SD3 needed */}
      <div className="space-y-1.5 shrink-0">
        <Label className="text-xs font-medium text-muted-foreground">Options</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Switch checked={generateAll} onCheckedChange={setGenerateAll} className="scale-90" />
            <span className="text-xs">All Variants</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch checked={useAI} onCheckedChange={setUseAI} className="scale-90" />
            <span className="text-xs">AI Enhanced</span>
          </div>
        </div>
        {useAI && (
          <AIModelWarmup
            modelName="pix2pix"
            displayName="Pix2Pix"
            status={pix2pixStatus}
            onWarmup={warmupPix2Pix}
            isConnected={isConnected}
          />
        )}
      </div>

      {/* Apply */}
      <div className="shrink-0">
        <Button
          onClick={applySeason}
          disabled={isProcessing || !imageState.originalFile}
          size="sm"
        >
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
          {isProcessing ? "Processing..." : "Apply Season"}
        </Button>
      </div>
    </div>
  )
}

function BackgroundPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, sd3Status, warmupSD3 }: PanelProps) {
  const [backgroundPrompt, setBackgroundPrompt] = useState("highway at sunset")
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [bgMode, setBgMode] = useState<"ai" | "upload" | "remove">("ai")
  const [removeMethod, setRemoveMethod] = useState<"auto" | "transparent_background" | "rembg">("auto")

  const presetBackgrounds = [
    { id: "highway_sunset", label: "Highway Sunset", prompt: "highway road at sunset, orange sky" },
    { id: "city_night", label: "City Night", prompt: "city street at night, neon lights" },
    { id: "rural_morning", label: "Rural Morning", prompt: "rural countryside road, morning mist" },
    { id: "urban_rain", label: "Urban Rain", prompt: "urban street, rainy day, wet pavement" },
    { id: "suburban", label: "Suburban", prompt: "suburban neighborhood street, houses" },
  ]

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBackgroundFile(file)
      setBgMode("upload")
      addLog(`[INFO] Background image selected: ${file.name}`)
    }
  }

  const applyBackground = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    // ADDED: SD3 check for AI generate mode
    if (bgMode === "ai" && !sd3Status.loaded) {
      addLog("[WARN] AI model not loaded. Starting warmup first...")
      toast.warning("Loading AI model first", {
        description: "This may take 2-5 minutes. Please wait..."
      })
      await warmupSD3()
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)

    try {
      let result
      if (bgMode === "ai") {
        addLog(`[INFO] Generating AI background: "${backgroundPrompt}"...`)
        result = await api.changeBackgroundAI(imageState.originalFile, backgroundPrompt)
      } else if (bgMode === "upload" && backgroundFile) {
        addLog(`[INFO] Compositing with uploaded background...`)
        result = await api.changeBackground(imageState.originalFile, backgroundFile)
      } else if (bgMode === "remove") {
        addLog(`[INFO] Removing background (method: ${removeMethod})...`)
        result = await api.removeBackground(imageState.originalFile, removeMethod)
      } else {
        addLog("[WARN] No background selected")
        setIsProcessing(false)
        return
      }

      if (result.image_base64) {
        onAugmentationResult(result.image_base64, 
          bgMode === "remove" 
            ? `[INFO] Background removed successfully` 
            : `[INFO] Background changed successfully`
        )
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Background change failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-6">
      {/* Mode Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Mode</Label>
        <Select value={bgMode} onValueChange={(v) => setBgMode(v as "ai" | "upload" | "remove")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ai">AI Generate</SelectItem>
            <SelectItem value="upload">Upload Image</SelectItem>
            <SelectItem value="remove">Remove Background</SelectItem>
          </SelectContent>
        </Select>
        {/* ADDED: Show warmup when AI mode selected */}
        {bgMode === "ai" && (
          <AIModelWarmup
            modelName="sd3"
            displayName="SD3 Inpainting"
            status={sd3Status}
            onWarmup={warmupSD3}
            isConnected={isConnected}
          />
        )}
      </div>

      {bgMode === "ai" && (
        <>
          {/* AI Prompt */}
          <div className="space-y-3 flex-1 max-w-md">
            <Label className="text-xs font-medium text-muted-foreground">Background Description</Label>
            <Input
              value={backgroundPrompt}
              onChange={(e) => setBackgroundPrompt(e.target.value)}
              placeholder="Describe the background..."
              className="w-full"
            />
          </div>

          {/* Presets */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">Presets</Label>
            <div className="flex gap-2 flex-wrap">
              {presetBackgrounds.map((preset) => (
                <Button
                  key={preset.id}
                  variant={backgroundPrompt === preset.prompt ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setBackgroundPrompt(preset.prompt)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}

      {bgMode === "upload" && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">Upload Background</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-64"
            />
            {backgroundFile && (
              <span className="text-xs text-accent">{backgroundFile.name}</span>
            )}
          </div>
        </div>
      )}

      {bgMode === "remove" && (
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground">Removal Method</Label>
          <Select value={removeMethod} onValueChange={(v) => setRemoveMethod(v as any)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (best quality)</SelectItem>
              <SelectItem value="transparent_background">Transparent Background</SelectItem>
              <SelectItem value="rembg">Rembg</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Outputs a transparent PNG</p>
        </div>
      )}

      {/* Apply Button */}
      <div className="ml-auto">
        <Button 
          onClick={applyBackground}
          disabled={isProcessing || !imageState.originalFile || (bgMode === "upload" && !backgroundFile)}
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="mr-2 h-4 w-4" />
          )}
          {isProcessing 
            ? "Processing..." 
            : bgMode === "remove" 
              ? "Remove Background" 
              : "Change Background"
          }
        </Button>
      </div>
    </div>
  )
}

// ============================================
// OBJECT-BASED PANELS
// ============================================

function SearchPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [query, setQuery] = useState("")

  const runDetection = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Running object detection...`)

    try {
      const result = await api.searchObjects(imageState.originalFile)
      
      if (result.detections) {
        addLog(`[INFO] Found ${result.detections.length} objects:`)
        const counts: Record<string, number> = {}
        result.detections.forEach(d => {
          counts[d.label] = (counts[d.label] || 0) + 1
        })
        Object.entries(counts).forEach(([label, count]) => {
          addLog(`[INFO]   - ${label}: ${count}`)
        })
        
        if (result.image_base64) {
          onAugmentationResult(result.image_base64, `[INFO] Detection complete - ${result.detections.length} objects`)
        }
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}`)
      }
    } catch (err) {
      addLog(`[ERROR] Detection failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Label className="text-xs font-medium text-muted-foreground">Search Objects:</Label>
      <Input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g., car, pedestrian, traffic sign..."
        className="w-64"
      />
      <Button
        onClick={runDetection}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Search className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Detecting..." : "Detect Objects"}
      </Button>
      <span className="text-xs text-muted-foreground">
        {imageState.detections.length > 0 
          ? `${imageState.detections.length} objects detected`
          : "No detections yet"
        }
      </span>
    </div>
  )
}

function AddPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, sd3Status, warmupSD3 }: PanelProps) {
  const [objectType, setObjectType] = useState("car")
  const [customPrompt, setCustomPrompt] = useState("")

  const addObject = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    // ADDED: SD3 check
    if (!sd3Status.loaded) {
      addLog("[WARN] AI model not loaded. Starting warmup first...")
      toast.warning("Loading AI model first", {
        description: "This may take 2-5 minutes. Please wait..."
      })
      await warmupSD3()
      return
    }

    const prompt = customPrompt || objectType
    const box: [number, number, number, number] = [100, 100, 300, 300]
    
    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Adding "${prompt}" to image...`)

    try {
      const result = await api.addObject(imageState.originalFile, prompt, box)
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Added ${prompt} to image`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Add object failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* ADDED: SD3 warmup */}
      <AIModelWarmup
        modelName="sd3"
        displayName="SD3 Inpainting"
        status={sd3Status}
        onWarmup={warmupSD3}
        isConnected={isConnected}
      />

      <Label className="text-xs font-medium text-muted-foreground">Add Object:</Label>
      <Select value={objectType} onValueChange={setObjectType}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="car">Car</SelectItem>
          <SelectItem value="truck">Truck</SelectItem>
          <SelectItem value="pedestrian">Pedestrian</SelectItem>
          <SelectItem value="cyclist">Cyclist</SelectItem>
          <SelectItem value="traffic_sign">Traffic Sign</SelectItem>
          <SelectItem value="traffic_light">Traffic Light</SelectItem>
          <SelectItem value="custom">Custom...</SelectItem>
        </SelectContent>
      </Select>
      {objectType === "custom" && (
        <Input
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Describe object..."
          className="w-48"
        />
      )}
      <Button 
        onClick={addObject}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Adding..." : "Add to Image"}
      </Button>
      <span className="text-xs text-muted-foreground">
        (Object will be placed in center - draw support coming soon)
      </span>
    </div>
  )
}

function RemovePanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, sd3Status, warmupSD3 }: PanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const removeObject = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (imageState.detections.length === 0) {
      addLog("[WARN] No objects detected - run Search first")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    // ADDED: SD3 check
    if (!sd3Status.loaded) {
      addLog("[WARN] AI model not loaded. Starting warmup first...")
      toast.warning("Loading AI model first", {
        description: "This may take 2-5 minutes. Please wait..."
      })
      await warmupSD3()
      return
    }

    const detection = imageState.detections[selectedIndex]
    if (!detection) {
      addLog("[WARN] Invalid selection")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Removing ${detection.label} at index ${selectedIndex}...`)

    try {
      const result = await api.removeObject(
        imageState.originalFile,
        selectedIndex,
        imageState.imageHash,
        detection.detection_id
      )
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Removed ${detection.label}`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Remove failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* ADDED: SD3 warmup */}
      <AIModelWarmup
        modelName="sd3"
        displayName="SD3 Inpainting"
        status={sd3Status}
        onWarmup={warmupSD3}
        isConnected={isConnected}
      />

      <Label className="text-xs font-medium text-muted-foreground">Remove Objects:</Label>
      
      {imageState.detections.length > 0 ? (
        <>
          <Select value={selectedIndex.toString()} onValueChange={(v) => setSelectedIndex(parseInt(v))}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {imageState.detections.map((det, i) => (
                <SelectItem key={i} value={i.toString()}>
                  [{i}] {det.label} ({(det.confidence * 100).toFixed(1)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="destructive" 
            onClick={removeObject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Minus className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "Removing..." : "Remove Selected"}
          </Button>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">
          Run "Search" first to detect objects
        </span>
      )}
    </div>
  )
}

function ReplacePanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected, sd3Status, warmupSD3 }: PanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [replacementType, setReplacementType] = useState("truck")
  const [customReplacement, setCustomReplacement] = useState("")

  const replaceObject = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (imageState.detections.length === 0) {
      addLog("[WARN] No objects detected - run Search first")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    // ADDED: SD3 check
    if (!sd3Status.loaded) {
      addLog("[WARN] AI model not loaded. Starting warmup first...")
      toast.warning("Loading AI model first", {
        description: "This may take 2-5 minutes. Please wait..."
      })
      await warmupSD3()
      return
    }

    const detection = imageState.detections[selectedIndex]
    const replacement = replacementType === "custom" ? customReplacement : replacementType

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Replacing ${detection.label} with ${replacement}...`)

    try {
      const result = await api.replaceObject(
        imageState.originalFile,
        selectedIndex,
        replacement,
        imageState.imageHash
      )
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Replaced ${detection.label} with ${replacement}`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Replace failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* ADDED: SD3 warmup */}
      <AIModelWarmup
        modelName="sd3"
        displayName="SD3 Inpainting"
        status={sd3Status}
        onWarmup={warmupSD3}
        isConnected={isConnected}
      />

      <Label className="text-xs font-medium text-muted-foreground">Replace:</Label>
      
      {imageState.detections.length > 0 ? (
        <>
          <Select value={selectedIndex.toString()} onValueChange={(v) => setSelectedIndex(parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {imageState.detections.map((det, i) => (
                <SelectItem key={i} value={i.toString()}>
                  [{i}] {det.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <span className="text-muted-foreground">with</span>
          
          <Select value={replacementType} onValueChange={setReplacementType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="car">Car</SelectItem>
              <SelectItem value="truck">Truck</SelectItem>
              <SelectItem value="bus">Bus</SelectItem>
              <SelectItem value="van">Van</SelectItem>
              <SelectItem value="motorcycle">Motorcycle</SelectItem>
              <SelectItem value="custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
          
          {replacementType === "custom" && (
            <Input
              value={customReplacement}
              onChange={(e) => setCustomReplacement(e.target.value)}
              placeholder="red sports car..."
              className="w-40"
            />
          )}
          
          <Button 
            onClick={replaceObject}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Replace className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "Replacing..." : "Replace"}
          </Button>
        </>
      ) : (
        <span className="text-sm text-muted-foreground">
          Run "Search" first to detect objects
        </span>
      )}
    </div>
  )
}

// ============================================
// BASIC TRANSFORM PANELS
// ============================================

function FlipPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)

  const applyFlip = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!flipH && !flipV) {
      addLog("[WARN] Select at least one flip direction")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying flip: H=${flipH}, V=${flipV}...`)

    try {
      const result = await api.applyFlip(imageState.originalFile, flipH, flipV)
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied flip: H=${flipH}, V=${flipV}`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Flip failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-8">
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Flip Options</Label>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={flipH} onCheckedChange={(c) => setFlipH(!!c)} />
            <span className="text-sm">Horizontal</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={flipV} onCheckedChange={(c) => setFlipV(!!c)} />
            <span className="text-sm">Vertical</span>
          </div>
        </div>
      </div>
      <Button 
        onClick={applyFlip}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FlipHorizontal className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Flip"}
      </Button>
    </div>
  )
}

function ScalePanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [scaleX, setScaleX] = useState([1])
  const [scaleY, setScaleY] = useState([1])
  const [lockRatio, setLockRatio] = useState(true)

  const handleScaleX = (value: number[]) => {
    setScaleX(value)
    if (lockRatio) setScaleY(value)
  }

  const handleScaleY = (value: number[]) => {
    setScaleY(value)
    if (lockRatio) setScaleX(value)
  }

  const applyScale = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying scale: ${scaleX[0].toFixed(2)}x, ${scaleY[0].toFixed(2)}x...`)

    try {
      const result = await api.applyScale(imageState.originalFile, scaleX[0], scaleY[0])
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied scale: ${scaleX[0].toFixed(2)}x, ${scaleY[0].toFixed(2)}x`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Scale failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-8">
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Scale X: {scaleX[0].toFixed(2)}x</Label>
        <Slider value={scaleX} onValueChange={handleScaleX} min={0.1} max={3} step={0.01} className="w-full" />
      </div>
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Scale Y: {scaleY[0].toFixed(2)}x</Label>
        <Slider value={scaleY} onValueChange={handleScaleY} min={0.1} max={3} step={0.01} className="w-full" />
      </div>
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Options</Label>
        <div className="flex items-center gap-2">
          <Checkbox checked={lockRatio} onCheckedChange={(c) => setLockRatio(!!c)} />
          <span className="text-sm">Lock Aspect Ratio</span>
        </div>
      </div>
      <Button 
        onClick={applyScale}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ZoomIn className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Scale"}
      </Button>
    </div>
  )
}

function RotationPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [angle, setAngle] = useState([0])

  const presets = [
    { label: "90°", value: 90 },
    { label: "180°", value: 180 },
    { label: "270°", value: 270 },
    { label: "-90°", value: -90 },
  ]

  const applyRotation = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying rotation: ${angle[0]} degrees...`)

    try {
      const result = await api.applyRotation(imageState.originalFile, angle[0])
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied rotation: ${angle[0]} degrees`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Rotation failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-8">
      <div className="w-56 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Rotation Angle: {angle[0]}°</Label>
        <Slider value={angle} onValueChange={setAngle} min={-180} max={180} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-180°</span>
          <span>0°</span>
          <span>+180°</span>
        </div>
      </div>
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Quick Presets</Label>
        <div className="flex gap-2">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={angle[0] === p.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => setAngle([p.value])}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      <Button 
        onClick={applyRotation}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Rotation"}
      </Button>
    </div>
  )
}

function CropPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [cropMode, setCropMode] = useState("center")
  const [cropPercent, setCropPercent] = useState([80])

  const applyCrop = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying ${cropMode} crop at ${cropPercent[0]}%...`)

    try {
      // Calculate crop box based on mode
      // This is simplified - real implementation would need image dimensions
      const percent = cropPercent[0] / 100
      const margin = (1 - percent) / 2
      
      // Assume 1000x1000 for calculation, backend will handle actual dimensions
      const x1 = Math.floor(1000 * margin)
      const y1 = Math.floor(1000 * margin)
      const x2 = Math.floor(1000 * (1 - margin))
      const y2 = Math.floor(1000 * (1 - margin))

      const result = await api.applyCrop(imageState.originalFile, x1, y1, x2, y2)
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied ${cropMode} crop`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Crop failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-8">
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Crop Mode</Label>
        <Select value={cropMode} onValueChange={setCropMode}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="center">Center Crop</SelectItem>
            <SelectItem value="top">Top</SelectItem>
            <SelectItem value="bottom">Bottom</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Keep: {cropPercent[0]}%</Label>
        <Slider value={cropPercent} onValueChange={setCropPercent} min={10} max={100} step={5} className="w-full" />
      </div>
      <Button 
        onClick={applyCrop}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Crop className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Crop"}
      </Button>
    </div>
  )
}

function TranslationPanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [offsetX, setOffsetX] = useState([0])
  const [offsetY, setOffsetY] = useState([0])

  const applyTranslation = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying translation: X=${offsetX[0]}px, Y=${offsetY[0]}px...`)

    try {
      const result = await api.applyTranslation(imageState.originalFile, offsetX[0], offsetY[0])
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied translation: X=${offsetX[0]}px, Y=${offsetY[0]}px`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Translation failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-8">
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Offset X: {offsetX[0]}px</Label>
        <Slider value={offsetX} onValueChange={setOffsetX} min={-500} max={500} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-500</span>
          <span>0</span>
          <span>+500</span>
        </div>
      </div>
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Offset Y: {offsetY[0]}px</Label>
        <Slider value={offsetY} onValueChange={setOffsetY} min={-500} max={500} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-500</span>
          <span>0</span>
          <span>+500</span>
        </div>
      </div>
      <Button 
        onClick={applyTranslation}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Move className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Translation"}
      </Button>
    </div>
  )
}

function NoisePanel({ addLog, imageState, onAugmentationResult, clearAugmentationResult, isProcessing, setIsProcessing, isConnected }: PanelProps) {
  const [noiseType, setNoiseType] = useState("gaussian")
  const [intensity, setIntensity] = useState([0.1])

  const applyNoise = async () => {
    if (!imageState.originalFile) {
      addLog("[WARN] No image selected")
      return
    }
    if (!isConnected) {
      addLog("[ERROR] Backend not connected")
      return
    }

    clearAugmentationResult()
    setIsProcessing(true)
    addLog(`[INFO] Applying ${noiseType} noise at intensity ${intensity[0].toFixed(2)}...`)

    try {
      const result = await api.applyNoise(
        imageState.originalFile, 
        noiseType as 'gaussian' | 'salt-pepper' | 'poisson' | 'speckle', 
        intensity[0]
      )
      
      if (result.image_base64) {
        onAugmentationResult(result.image_base64, `[INFO] Applied ${noiseType} noise at intensity ${intensity[0].toFixed(2)}`)
      } else if (result.error) {
        addLog(`[ERROR] ${result.error}: ${result.detail || ''}`)
      }
    } catch (err) {
      addLog(`[ERROR] Noise failed: ${err}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex items-start gap-8">
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Noise Type</Label>
        <Select value={noiseType} onValueChange={setNoiseType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gaussian">Gaussian</SelectItem>
            <SelectItem value="salt-pepper">Salt & Pepper</SelectItem>
            <SelectItem value="poisson">Poisson</SelectItem>
            <SelectItem value="speckle">Speckle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-48 space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Intensity: {intensity[0].toFixed(2)}</Label>
        <Slider value={intensity} onValueChange={setIntensity} min={0} max={1} step={0.01} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>0.5</span>
          <span>1</span>
        </div>
      </div>
      <Button 
        onClick={applyNoise}
        disabled={isProcessing || !imageState.originalFile}
      >
        {isProcessing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Waves className="mr-2 h-4 w-4" />
        )}
        {isProcessing ? "Processing..." : "Apply Noise"}
      </Button>
    </div>
  )
}
