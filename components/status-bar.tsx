// components/status-bar.tsx
"use client"

import { Circle, Cpu, HardDrive, Wifi, WifiOff, Loader2 } from "lucide-react"

interface StatusBarProps {
  isConnected: boolean
  isProcessing: boolean
}

export function StatusBar({ isConnected, isProcessing }: StatusBarProps) {
  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-sidebar px-3 text-xs">
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 text-accent" />
              <span className="text-muted-foreground">Connected</span>
              <Circle className="h-2 w-2 fill-accent text-accent" />
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-destructive" />
              <span className="text-destructive">Disconnected</span>
              <Circle className="h-2 w-2 fill-destructive text-destructive" />
            </>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center gap-1.5 text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing...</span>
          </div>
        )}

        {/* Images Loaded */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="h-3 w-3" />
          <span>Ready</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* GPU Status */}
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3 w-3 text-accent" />
          <span className="text-muted-foreground">GPU: Google Colab</span>
          <span className={isConnected ? "text-accent" : "text-muted-foreground"}>
            {isConnected ? "Ready" : "N/A"}
          </span>
        </div>

        {/* Backend URL */}
        <div className="text-muted-foreground">
          {process.env.NEXT_PUBLIC_API_URL 
            ? `Backend: ${process.env.NEXT_PUBLIC_API_URL.replace('https://', '').split('.')[0]}...`
            : "Backend: Not configured"
          }
        </div>
      </div>
    </div>
  )
}
