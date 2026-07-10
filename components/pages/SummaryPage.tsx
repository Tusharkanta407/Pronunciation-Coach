'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '../landing/Header'
import { LEVELS } from '@/lib/levels'
import { AssessmentMode } from '@/lib/levels'
import { Trophy } from 'lucide-react'

interface SummaryPageProps {
  levelScores: Partial<Record<AssessmentMode, number>>
  completedModes: AssessmentMode[]
  onRestart: () => void
  onBackToModes: () => void
}

export function SummaryPage({
  levelScores,
  completedModes,
  onRestart,
  onBackToModes,
}: SummaryPageProps) {
  const scores = completedModes.map((m) => levelScores[m] ?? 0)
  const average =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const allDone = completedModes.length === LEVELS.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-12 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {allDone ? 'Assessment Complete!' : 'Round Complete'}
          </h1>
          <p className="text-muted-foreground">
            {allDone
              ? 'You finished all three pronunciation rounds.'
              : 'Great work! Continue to the next round when ready.'}
          </p>
        </div>

        <Card className="p-6 mb-6 border border-border text-left">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
            Your Scores
          </p>
          <div className="space-y-3">
            {LEVELS.map((level) => {
              const score = levelScores[level.id]
              const done = completedModes.includes(level.id)
              return (
                <div key={level.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{level.title}</span>
                  {done ? (
                    <span className="font-bold text-primary">{score}%</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              )
            })}
          </div>
          {scores.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="font-semibold text-foreground">Average</span>
              <span className="font-bold text-2xl text-primary">{average}%</span>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          {!allDone && (
            <Button
              className="h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={onBackToModes}
            >
              Next Round
            </Button>
          )}
          <Button variant="outline" className="h-11" onClick={onRestart}>
            Start Over
          </Button>
        </div>
      </main>
    </div>
  )
}
