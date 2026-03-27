// components/folder-browser.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  FolderOpen, 
  ImageIcon, 
  Plus, 
  Trash2, 
  Upload,
  RefreshCw,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface FolderBrowserProps {
  selectedFolder: string | null
  setSelectedFolder: (folder: string | null) => void
  selectedImage: string | null
  setSelectedImage: (image: string | null) => void
  addLog: (message: string) => void
  onImageUpload: (file: File) => void
  isConnected: boolean
}

interface DatasetFolder {
  name: string
  expanded: boolean
  images: string[]
  isLoading?: boolean
}

export function FolderBrowser({
  selectedFolder,
  setSelectedFolder,
  selectedImage,
  setSelectedImage,
  addLog,
  onImageUpload,
  isConnected,
}: FolderBrowserProps) {
  const [folders, setFolders] = useState<DatasetFolder[]>([])
  
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load folders from backend when connected
  useEffect(() => {
    if (isConnected) {
      loadFolders()
    }
  }, [isConnected])

  const loadFolders = async () => {
    if (!isConnected) return
    
    setIsLoadingFolders(true)
    addLog("[INFO] Loading folders from backend...")
    
    try {
      const folderList = await api.listFolders()
      
      if (folderList.length > 0) {
        const foldersWithImages = await Promise.all(
          folderList.map(async (folder) => {
            try {
              const images = await api.listImages(folder.name)
              return {
                name: folder.name,
                images: images.map(img => img.name),
                expanded: false,
              }
            } catch {
              return {
                name: folder.name,
                images: [],
                expanded: false,
              }
            }
          })
        )
        
        setFolders(foldersWithImages)
        addLog(`[INFO] Loaded ${foldersWithImages.length} folders`)
      } else {
        addLog("[INFO] No folders found on backend")
      }
    } catch (err) {
      addLog(`[ERROR] Failed to load folders: ${err}`)
    } finally {
      setIsLoadingFolders(false)
    }
  }

  const toggleFolder = async (folderName: string) => {
    const folder = folders.find(f => f.name === folderName)
    
    // If expanding and connected, load images
    if (folder && !folder.expanded && isConnected && folder.images.length === 0) {
      setFolders(prev => prev.map(f => 
        f.name === folderName ? { ...f, isLoading: true } : f
      ))
      
      try {
        const images = await api.listImages(folderName)
        setFolders(prev => prev.map(f => 
          f.name === folderName 
            ? { ...f, expanded: true, images: images.map(img => img.name), isLoading: false } 
            : f
        ))
      } catch {
        setFolders(prev => prev.map(f => 
          f.name === folderName ? { ...f, expanded: true, isLoading: false } : f
        ))
      }
    } else {
      setFolders(prev => prev.map(f => 
        f.name === folderName ? { ...f, expanded: !f.expanded } : f
      ))
    }
  }

  const handleFolderSelect = (folderName: string) => {
    setSelectedFolder(folderName)
    addLog(`[INFO] Selected dataset: ${folderName}`)
  }

  const handleImageSelect = async (imageName: string, folderName: string) => {
    setSelectedImage(imageName)
    setSelectedFolder(folderName)
    addLog(`[INFO] Selected image: ${imageName}`)
    
    // If connected, load the actual image from backend
    if (isConnected) {
      try {
        const imageBase64 = await api.getImage(folderName, imageName)
        if (imageBase64) {
          // Convert base64 to File object
          const response = await fetch(`data:image/png;base64,${imageBase64}`)
          const blob = await response.blob()
          const file = new File([blob], imageName, { type: 'image/png' })
          onImageUpload(file)
        }
      } catch (err) {
        addLog(`[WARN] Could not load image from backend, using placeholder`)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageUpload(file)
      setSelectedImage(file.name)
      addLog(`[INFO] Uploaded local file: ${file.name}`)
      
      // Add to current folder's image list (local only)
      if (selectedFolder) {
        setFolders(prev => prev.map(f => 
          f.name === selectedFolder 
            ? { ...f, images: [...f.images, file.name] }
            : f
        ))
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const addFolder = async () => {
    const name = newFolderName.trim() || `Dataset_${folders.length + 1}`
    
    if (isConnected) {
      try {
        await api.createFolder(name)
        addLog(`[INFO] Created folder on backend: ${name}`)
        await loadFolders()
      } catch (err) {
        addLog(`[ERROR] Failed to create folder: ${err}`)
      }
    } else {
      setFolders(prev => [...prev, { name, expanded: false, images: [] }])
      addLog(`[INFO] Created local folder: ${name}`)
    }
    
    setNewFolderName("")
    setShowNewFolderInput(false)
  }

  const deleteFolder = async (folderName: string) => {
    if (isConnected) {
      try {
        await api.deleteFolder(folderName)
        addLog(`[WARN] Deleted folder from backend: ${folderName}`)
        await loadFolders()
      } catch (err) {
        addLog(`[ERROR] Failed to delete folder: ${err}`)
      }
    } else {
      setFolders(prev => prev.filter(f => f.name !== folderName))
      addLog(`[WARN] Deleted local folder: ${folderName}`)
    }
    
    if (selectedFolder === folderName) {
      setSelectedFolder(null)
      setSelectedImage(null)
    }
  }

  const uploadToBackend = async () => {
    if (!selectedFolder || !fileInputRef.current) return
    fileInputRef.current.click()
  }

  return (
    <div className="flex w-64 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <span className="text-sm font-medium text-sidebar-foreground">Datasets</span>
        <div className="flex items-center gap-1">
          {isConnected && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={loadFolders}
              disabled={isLoadingFolders}
              title="Refresh folders"
            >
              {isLoadingFolders ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNewFolderInput(!showNewFolderInput)}
            title="Add folder"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Folder Input */}
      {showNewFolderInput && (
        <div className="flex items-center gap-1 border-b border-sidebar-border p-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === "Enter" && addFolder()}
          />
          <Button size="sm" className="h-7 px-2" onClick={addFolder}>
            Add
          </Button>
        </div>
      )}

      {/* Upload Button */}
      <div className="border-b border-sidebar-border p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          Upload Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Folder Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoadingFolders ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-4">
              No folders found
            </div>
          ) : (
            folders.map((folder) => (
              <div key={folder.name} className="mb-1">
                {/* Folder Item */}
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded px-2 py-1.5 text-sm cursor-pointer",
                    selectedFolder === folder.name
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                  onClick={() => handleFolderSelect(folder.name)}
                >
                  <button
                    className="p-0.5 hover:bg-sidebar-accent rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFolder(folder.name)
                    }}
                  >
                    {folder.isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : folder.expanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {folder.expanded ? (
                    <FolderOpen className="h-4 w-4 text-primary" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="text-xs text-muted-foreground">{folder.images.length}</span>
                  <button
                    className="hidden p-0.5 hover:bg-destructive/20 rounded group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFolder(folder.name)
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>

                {/* Images */}
                {folder.expanded && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {folder.images.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        No images
                      </div>
                    ) : (
                      folder.images.map((image) => (
                        <div
                          key={image}
                          className={cn(
                            "flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer",
                            selectedImage === image && selectedFolder === folder.name
                              ? "bg-primary/20 text-primary"
                              : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                          )}
                          onClick={() => handleImageSelect(image, folder.name)}
                        >
                          <ImageIcon className="h-3 w-3" />
                          <span className="truncate">{image}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Connection Status */}
      <div className="border-t border-sidebar-border p-2">
        <div className={cn(
          "text-xs text-center py-1 rounded",
          isConnected ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
        )}>
          {isConnected ? "● Backend Connected" : "○ Local Mode"}
        </div>
      </div>

      {/* Thumbnails Preview */}
      {selectedFolder && (
        <div className="border-t border-sidebar-border p-2">
          <span className="mb-2 block text-xs font-medium text-muted-foreground">
            Preview ({folders.find(f => f.name === selectedFolder)?.images.length || 0} images)
          </span>
          <div className="grid grid-cols-3 gap-1">
            {folders
              .find((f) => f.name === selectedFolder)
              ?.images.slice(0, 6)
              .map((img, i) => (
                <div
                  key={img}
                  className={cn(
                    "aspect-square rounded bg-muted flex items-center justify-center cursor-pointer border-2 overflow-hidden",
                    selectedImage === img ? "border-primary" : "border-transparent hover:border-muted-foreground",
                  )}
                  onClick={() => handleImageSelect(img, selectedFolder)}
                  title={img}
                >
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
