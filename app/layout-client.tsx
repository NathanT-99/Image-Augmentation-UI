"use client"

import React from "react"

import { Toaster } from "sonner"

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'oklch(0.18 0.005 260)',
            border: '1px solid oklch(0.25 0.005 260)',
            color: 'oklch(0.95 0 0)',
          },
        }}
      />
    </>
  )
}
