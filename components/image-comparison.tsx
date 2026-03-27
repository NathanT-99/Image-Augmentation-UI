// components/image-comparison.tsx
"use client"

import { ArrowLeftRight, Loader2, Upload } from "lucide-react"
import { Detection } from "@/lib/api"

interface ImageComparisonProps {
  selectedImage: string | null
  originalUrl: string
  augmentedUrl: string
  detections: Detection[]
  isProcessing: boolean
}

export function ImageComparison({ 
  selectedImage, 
  originalUrl, 
  augmentedUrl,
  detections,
  isProcessing 
}: ImageComparisonProps) {
  return (
    <div className="flex flex-1 gap-4 overflow-hidden p-4">
      {/* Original Image */}
      <div className="flex flex-1 flex-col rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
          <span className="text-sm font-medium">ORIGINAL</span>
          <span className="text-xs text-muted-foreground">
            {selectedImage || "No image selected"}
            {detections.length > 0 && ` \u2022 ${detections.length} objects`}
          </span>
        </div>
        <div className="relative flex-1 overflow-auto bg-muted/20">
          <div className="flex min-h-full items-center justify-center p-4">
            {originalUrl ? (
              <img
                src={originalUrl}
                alt="Original"
                className="max-w-full rounded object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select an image from the dataset</p>
                <p className="text-xs mt-1">or upload a new image</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-secondary-foreground animate-spin" />
          ) : (
            <ArrowLeftRight className="h-5 w-5 text-secondary-foreground" />
          )}
        </div>
      </div>

      {/* Augmented Image */}
      <div className="flex flex-1 flex-col rounded-lg border border-primary/30 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0">
          <span className="text-sm font-medium text-primary">AUGMENTED</span>
          <span className="text-xs text-muted-foreground">
            {isProcessing ? "Processing..." : augmentedUrl ? "Preview ready" : "Preview"}
          </span>
        </div>
        <div className="relative flex-1 overflow-auto bg-primary/5">
          <div className="flex min-h-full items-center justify-center p-4">
            {isProcessing ? (
              <div className="text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Processing augmentation...</p>
                <p className="text-xs mt-1">This may take a moment</p>
              </div>
            ) : augmentedUrl ? (
              <img
                src={augmentedUrl}
                alt="Augmented"
                className="max-w-full rounded object-contain"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>Augmented preview will appear here</p>
                <p className="text-xs mt-1">Select options above and click Apply</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
