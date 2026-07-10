'use client'

import React, { useState } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAssessment } from '@/context/AssessmentContext'

/**
 * Clears the current attempt in place: results, audio, and server session.
 * Stays on the same page so you can re-record immediately — does NOT go home.
 */
export function RestartButton() {
  const { currentPage, clearAttempt } = useAssessment()
  const [confirming, setConfirming] = useState(false)

  if (currentPage === 'landing' || currentPage === 'privacy') return null

  const handleConfirm = () => {
    setConfirming(false)
    clearAttempt()
  }

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirming(true)}
          className="shadow-md"
          aria-label="Clear recording and results, stay on this page"
        >
          <RotateCcw />
          Restart
        </Button>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="restart-title"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-6 text-card-foreground shadow-xl ring-1 ring-foreground/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="flex-1">
                <h2 id="restart-title" className="text-base font-semibold">
                  Clear this attempt?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Removes your recording and results so you can record again on this page.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleConfirm}>
                <RotateCcw />
                Clear &amp; re-record
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
