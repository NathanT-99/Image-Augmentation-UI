// app/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { FolderBrowser } from "@/components/folder-browser"
import { FeatureTabs } from "@/components/feature-tabs"
import { ImageComparison } from "@/components/image-comparison"
import { ActionBar } from "@/components/action-bar"
import { StatusBar } from "@/components/status-bar"
import { OutputLog } from "@/components/output-log"
import { Eye } from "lucide-react"
import { toast } from "sonner"
import api, { Detection, base64ToImageUrl } from "@/lib/api"

type CategoryType = "image-level" | "object-based" | "basic-transforms"

export interface ImageState {
  originalFile: File | null
  originalUrl: string
  augmentedBase64: string
  augmentedUrl: string
  detections: Detection[]
  imageHash: string
}

export default function AutoVisionApp() {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Image state
  const [imageState, setImageState] = useState<ImageState>({
    originalFile: null,
    originalUrl: '',
    augmentedBase64: '',
    augmentedUrl: '',
    detections: [],
    imageHash: '',
  })

  // UI state
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("weather")
  const [activeCategory, setActiveCategory] = useState<CategoryType>("image-level")
  const [augmentCount, setAugmentCount] = useState(0)
  const [logs, setLogs] = useState<string[]>([
    "[INFO] AutoVision initialized",
  ])

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await api.checkConnection()
        setIsConnected(connected)
        if (connected) {
          addLog("[INFO] Connected to backend API (Google Colab)")
          toast.success("Connected to backend API")
        } else {
          addLog("[WARN] Backend not connected - start Colab notebook and update .env.local")
          toast.error("Backend not connected", { description: "Start Colab notebook and set NEXT_PUBLIC_API_URL" })
        }
      } catch {
        setIsConnected(false)
        addLog("[ERROR] Failed to connect to backend")
        toast.error("Failed to connect to backend")
      }
    }
    checkConnection()
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  // Log helper
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }, [])

  // Handle image selection from file (uploaded)
  const handleImageUpload = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    setImageState(prev => ({
      ...prev,
      originalFile: file,
      originalUrl: url,
      augmentedBase64: '',
      augmentedUrl: '',
      detections: [],
      imageHash: '',
    }))
    addLog(`[INFO] Loaded image: ${file.name}`)

    // Auto-detect objects if connected
    if (isConnected) {
      setIsProcessing(true)
      addLog("[INFO] Running object detection...")
      try {
        const result = await api.searchObjects(file)
        if (!('error' in result)) {
          setImageState(prev => ({
            ...prev,
            detections: result.detections,
            imageHash: result.image_hash,
          }))
          addLog(`[INFO] Detected ${result.detections.length} objects`)
        }
      } catch (err) {
        addLog(`[ERROR] Detection failed: ${err}`)
      } finally {
        setIsProcessing(false)
      }
    }
  }, [isConnected, addLog])

  // Clear augmented result (call before any augmentation starts)
  const clearAugmentedResult = useCallback(() => {
    setImageState(prev => {
      if (prev.augmentedUrl && prev.augmentedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.augmentedUrl)
      }
      return {
        ...prev,
        augmentedBase64: '',
        augmentedUrl: '',
      }
    })
  }, [])

  // Handle augmentation result — revoke old URL before setting new one
  const handleAugmentationResult = useCallback((base64: string, message: string) => {
    setImageState(prev => {
      // Revoke old blob URL to free memory
      if (prev.augmentedUrl && prev.augmentedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.augmentedUrl)
      }
      return {
        ...prev,
        augmentedBase64: base64,
        augmentedUrl: base64ToImageUrl(base64),
      }
    })
    addLog(message)
    toast.success("Augmentation complete", { description: message.replace(/$$INFO$$\s*/, '') })
  }, [addLog])

  // Save current augmented image
  const handleSave = useCallback(async (filename: string) => {
    if (!imageState.augmentedBase64) {
      addLog("[WARN] No augmented image to save")
      toast.warning("Nothing to save", { description: "Apply an augmentation first" })
      return false
    }
    if (!selectedFolder) {
      addLog("[WARN] No folder selected for saving")
      toast.warning("No folder selected", { description: "Select or create a folder first" })
      return false
    }

    addLog(`[INFO] Saving ${filename}...`)
    try {
      const result = await api.saveImage(
        imageState.augmentedBase64,
        selectedFolder,
        filename
      )

      if (result.success) {
        addLog(`[INFO] Saved to ${result.saved_to}`)
        toast.success("Image saved", { description: `Saved to ${result.saved_to}` })
        return true
      } else {
        addLog(`[ERROR] Save failed: ${result.error}`)
        toast.error("Save failed", { description: result.error })
        return false
      }
    } catch (err) {
      addLog(`[ERROR] Save failed: ${err}`)
      toast.error("Save failed", { description: String(err) })
      return false
    }
  }, [imageState.augmentedBase64, selectedFolder, addLog])

  // Reset augmentation
  const handleReset = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      augmentedBase64: '',
      augmentedUrl: '',
    }))
    addLog("[INFO] Reset augmentation")
  }, [addLog])

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-12 items-center justify-between border-b border-border bg-sidebar px-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Image Augmentation Tool</span>
          <span className="ml-2 rounded bg-primary/20 px-2 py-0.5 text-xs text-primary">v3.5</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className={isConnected ? "text-accent" : "text-destructive"}>
            {isConnected ? "● Backend Connected" : "● Backend Disconnected"}
          </span>
          {isProcessing && (
            <span className="text-primary animate-pulse">Processing...</span>
          )}
        </div>
      </header>

      {/* Feature Tabs Navigation */}
      <FeatureTabs 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        addLog={addLog}
        imageState={imageState}
        onAugmentationResult={handleAugmentationResult}
        clearAugmentationResult={clearAugmentedResult}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        isConnected={isConnected}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Folder Browser */}
        <FolderBrowser
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          selectedImage={selectedImage}
          setSelectedImage={setSelectedImage}
          addLog={addLog}
          onImageUpload={handleImageUpload}
          isConnected={isConnected}
        />

        {/* Main Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Image Comparison View */}
          <ImageComparison 
            selectedImage={selectedImage}
            originalUrl={imageState.originalUrl}
            augmentedUrl={imageState.augmentedUrl}
            detections={imageState.detections}
            isProcessing={isProcessing}
          />

          {/* Action Bar */}
          <ActionBar 
            addLog={addLog} 
            selectedImage={selectedImage}
            augmentCount={augmentCount}
            setAugmentCount={setAugmentCount}
            onSave={handleSave}
            onReset={handleReset}
            hasAugmented={!!imageState.augmentedBase64}
            isProcessing={isProcessing}
            augmentedUrl={imageState.augmentedUrl}
          />

          {/* Output Log */}
          <OutputLog logs={logs} />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar isConnected={isConnected} isProcessing={isProcessing} />
    </div>
  )
}
