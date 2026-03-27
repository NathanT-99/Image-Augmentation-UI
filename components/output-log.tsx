"use client"

import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Terminal, ChevronDown, ChevronUp, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OutputLogProps {
  logs: string[]
}

export function OutputLog({ logs }: OutputLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, isMinimized])

  return (
    <div
      className={cn(
        "border-t border-border bg-sidebar transition-all duration-200 ease-in-out",
        isMinimized ? "h-8" : "h-32"
      )}
    >
      <div
        className="flex items-center justify-between border-b border-sidebar-border px-3 py-1.5 cursor-pointer select-none hover:bg-sidebar-accent/50 transition-colors"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Output Log</span>
          {isMinimized && logs.length > 0 && (
            <span className="text-xs text-muted-foreground/60">
              ({logs.length} {logs.length === 1 ? "entry" : "entries"})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            setIsMinimized(!isMinimized)
          }}
        >
          {isMinimized ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>
      {!isMinimized && (
        <ScrollArea className="h-[calc(100%-28px)]" ref={scrollRef}>
          <div className="p-2 font-mono text-xs">
            {logs.map((log, index) => (
              <div
                key={index}
                className={
                  log.includes("[ERROR]")
                    ? "text-destructive"
                    : log.includes("[WARN]")
                      ? "text-chart-3"
                      : log.includes("[INFO]")
                        ? "text-accent"
                        : "text-muted-foreground"
                }
              >
                {log}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
