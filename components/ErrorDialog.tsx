'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorDialogProps {
  open: boolean
  title?: string
  message: string
  onClose: () => void
}

/**
 * In-app error popup — replaces browser alert() for API / network failures.
 */
export function ErrorDialog({
  open,
  title = 'Something went wrong',
  message,
  onClose,
}: ErrorDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-card p-6 text-card-foreground shadow-xl ring-1 ring-foreground/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="error-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button size="sm" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </div>
  )
}
