'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

interface CompactScoreProps {
  score: number | null
}

export function CompactScore({ score }: CompactScoreProps) {
  return (
    <Card className="px-4 py-3 border border-border flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Score
      </p>
      {score !== null ? (
        <p className="text-2xl font-bold text-primary tabular-nums">{score}%</p>
      ) : (
        <p className="text-lg font-medium text-muted-foreground/40">—</p>
      )}
    </Card>
  )
}
