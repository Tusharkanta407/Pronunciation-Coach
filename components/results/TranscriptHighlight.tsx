'use client'

import React from 'react'
import { WordIssue } from '@/context/AssessmentContext'

interface TranscriptHighlightProps {
  text: string
  wordsToImprove: WordIssue[]
  showPassage?: boolean
  showDetails?: boolean
}

export function TranscriptHighlight({
  text,
  wordsToImprove,
  showPassage = true,
  showDetails = true,
}: TranscriptHighlightProps) {
  const mistakeWords = new Set(wordsToImprove.map((w) => w.word.toLowerCase()))
  const tokens = text.split(/(\s+)/)

  return (
    <div className="space-y-4">
      {showPassage && (
        <p className="text-base leading-relaxed text-foreground">
          {tokens.map((token, i) => {
            const clean = token.replace(/[^a-zA-Z']/g, '').toLowerCase()
            if (!clean) return <span key={i}>{token}</span>

            const mistake = wordsToImprove.find((w) => w.word.toLowerCase() === clean)
            if (!mistake || mistake.cleared) {
              if (mistakeWords.has(clean) && mistake?.cleared) {
                return (
                  <span key={i} className="text-primary font-medium underline decoration-primary/40">
                    {token}
                  </span>
                )
              }
              return <span key={i}>{token}</span>
            }

            return (
              <span
                key={i}
                className="relative inline-block bg-destructive/10 text-destructive font-semibold px-1 rounded border-b-2 border-destructive"
                title={
                mistake.summaryLine ||
                `${mistake.issue}${mistake.heard ? ` (heard: ${mistake.heard})` : ''}`
              }
              >
                {token}
              </span>
            )
          })}
        </p>
      )}

      {showDetails && (
        <div className="space-y-3">
          {wordsToImprove
            .filter((w) => !w.cleared)
            .map((mistake) => (
              <div
                key={mistake.word}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                  <span className="font-semibold text-foreground">{mistake.word}</span>
                  {mistake.heard && (
                    <span className="text-xs text-muted-foreground">(heard: {mistake.heard})</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">What went wrong:</span> {mistake.issue}
                </p>
                {mistake.suggestion && (
                  <p className="text-sm text-primary mt-1">
                    <span className="font-medium">Tip:</span> {mistake.suggestion}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
