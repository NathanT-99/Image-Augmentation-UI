"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export interface ModelStatus {
  loaded: boolean
  loading: boolean
  error?: string
}

interface AIModelWarmupProps {
  modelName: string
  displayName: string
  status: ModelStatus | null
  onWarmup: () => void
  isConnected: boolean
}

export function AIModelWarmup({
  displayName,
  status,
  onWarmup,
  isConnected,
}: AIModelWarmupProps) {
  const isLoaded = status?.loaded ?? false
  const isLoading = status?.loading ?? false
  const hasError = !!status?.error

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onWarmup}
        className="h-7 text-xs gap-1.5"
        disabled={!isConnected || isLoading || isLoaded}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isLoaded ? (
          "✅"
        ) : (
          "🔥"
        )}
        {isLoaded ? `${displayName} Ready` : `Pre-load ${displayName}`}
      </Button>
      <span
        className={`text-xs ${
          isLoaded
            ? "text-green-500"
            : isLoading
              ? "text-yellow-500"
              : hasError
                ? "text-red-500"
                : "text-muted-foreground"
        }`}
      >
        {isLoaded
          ? "✅ Ready"
          : isLoading
            ? "⏳ Loading…"
            : hasError
              ? `❌ ${status?.error}`
              : "Not loaded"}
      </span>
    </div>
  )
}