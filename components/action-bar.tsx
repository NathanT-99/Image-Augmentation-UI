// components/action-bar.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, RotateCcw, Save, FolderOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ActionBarProps {
  addLog: (message: string) => void
  selectedImage: string | null
  augmentCount: number
  setAugmentCount: (count: number) => void
  onSave: (filename: string) => Promise<boolean>
  onReset: () => void
  hasAugmented: boolean
  isProcessing: boolean
  augmentedUrl: string
}

export function ActionBar({ 
  addLog, 
  selectedImage, 
  augmentCount, 
  setAugmentCount,
  onSave,
  onReset,
  hasAugmented,
  isProcessing,
  augmentedUrl
}: ActionBarProps) {
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [customFilename, setCustomFilename] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Generate default filename based on original image
  const getDefaultFilename = () => {
    if (!selectedImage) return "augmented_1.png"
    const baseName = selectedImage.replace(/\.[^.]+$/, "") // Remove extension
    return `${baseName}-augmented_${augmentCount + 1}.png`
  }

  const handleSave = async () => {
    setIsSaving(true)
    const filename = getDefaultFilename()
    const success = await onSave(filename)
    if (success) {
      setAugmentCount(augmentCount + 1)
    }
    setIsSaving(false)
  }

  const handleSaveAs = () => {
    setCustomFilename(getDefaultFilename())
    setSaveAsOpen(true)
  }

  const confirmSaveAs = async () => {
    setIsSaving(true)
    const filename = customFilename || getDefaultFilename()
    const success = await onSave(filename)
    if (success) {
      setAugmentCount(augmentCount + 1)
    }
    setSaveAsOpen(false)
    setCustomFilename("")
    setIsSaving(false)
  }

  const handleDownload = () => {
    if (!augmentedUrl) {
      toast.warning("No image to download")
      return
    }
    
    const filename = getDefaultFilename()
    const link = document.createElement('a')
    link.href = augmentedUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    addLog(`[INFO] Downloaded: ${filename}`)
    toast.success("Image downloaded", { description: filename })
    setAugmentCount(augmentCount + 1)
  }

  const handleReset = () => {
    onReset()
  }

  return (
    <>
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSave} 
            className="gap-2 bg-transparent"
            disabled={!hasAugmented || isSaving || isProcessing}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSaveAs} 
            className="gap-2 bg-transparent"
            disabled={!hasAugmented || isProcessing}
          >
            <FolderOpen className="h-4 w-4" />
            Save As...
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload} 
            className="gap-2 bg-transparent"
            disabled={!hasAugmented || isProcessing}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleReset} 
            className="gap-2"
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Next: {getDefaultFilename()}</span>
          <span className="text-border">|</span>
          <span>Output: /datasets/augmented/</span>
        </div>
      </div>

      {/* Save As Dialog */}
      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save As</DialogTitle>
            <DialogDescription>
              Enter a custom filename for the augmented image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={getDefaultFilename()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Output Directory</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span>/datasets/augmented/</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={confirmSaveAs} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
