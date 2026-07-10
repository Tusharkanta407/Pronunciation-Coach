'use client'

import React, { useEffect, useState } from 'react'

const demoWords = [
  { word: 'suspense', ok: false },
  { word: 'everyone', ok: false },
  { word: 'practice', ok: true },
  { word: 'morning', ok: true },
]

export function TestPreview() {
  const [score, setScore] = useState(0)
  const target = 85

  useEffect(() => {
    const interval = setInterval(() => {
      setScore((prev) => {
        if (prev >= target) {
          clearInterval(interval)
          return target
        }
        return prev + 1
      })
    }, 25)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl" />
      <div className="relative rounded-2xl border border-border bg-background shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Example preview
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            Round 1
          </span>
        </div>

        <div className="text-center py-2">
          <p className="text-4xl font-bold text-primary tabular-nums">{score}%</p>
          <p className="text-xs text-muted-foreground mt-1">Pronunciation Score</p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-sm leading-relaxed text-foreground">
            The{' '}
            <span className="bg-destructive/15 text-destructive font-semibold px-1 rounded">
              suspense
            </span>{' '}
            kept{' '}
            <span className="bg-destructive/15 text-destructive font-semibold px-1 rounded">
              everyone
            </span>{' '}
            waiting every practice morning.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Flagged words</p>
          {demoWords
            .filter((w) => !w.ok)
            .map((w) => (
              <div
                key={w.word}
                className="flex items-center gap-2 text-sm animate-in fade-in duration-500"
              >
                <span className="text-destructive">✕</span>
                <span className="font-medium text-foreground">{w.word}</span>
                <span className="text-muted-foreground text-xs ml-auto">say again →</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
