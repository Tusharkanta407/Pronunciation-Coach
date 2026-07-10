'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '../landing/Header'
import { LEVELS } from '@/lib/levels'
import { AssessmentMode } from '@/lib/levels'
import { CheckCircle2, Lock, Mic, BookOpen, Timer } from 'lucide-react'

interface ModeSelectPageProps {
  unlockedModes: AssessmentMode[]
  completedModes: AssessmentMode[]
  levelScores: Partial<Record<AssessmentMode, number>>
  onSelect: (mode: AssessmentMode) => void
  onBack: () => void
  onFinish: () => void
}

const icons: Record<AssessmentMode, React.ReactNode> = {
  'read-passage': <BookOpen className="h-5 w-5" />,
  'free-speech': <Mic className="h-5 w-5" />,
  'just-a-minute': <Timer className="h-5 w-5" />,
}

export function ModeSelectPage({
  unlockedModes,
  completedModes,
  levelScores,
  onSelect,
  onBack,
  onFinish,
}: ModeSelectPageProps) {
  const allDone = completedModes.length === LEVELS.length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Round</h1>
          <p className="text-muted-foreground">
            Complete each round and clear your mistakes to unlock the next.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {LEVELS.map((level, index) => {
            const unlocked = unlockedModes.includes(level.id)
            const completed = completedModes.includes(level.id)
            const score = levelScores[level.id]

            return (
              <Card
                key={level.id}
                className={`p-5 border transition-all ${
                  unlocked
                    ? 'border-border hover:border-primary/40 cursor-pointer'
                    : 'border-border/50 opacity-60'
                }`}
                onClick={() => unlocked && onSelect(level.id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      completed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {unlocked ? icons[level.id] : <Lock className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Round {index + 1}
                      </span>
                      {completed && (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {score}%
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{level.title}</h3>
                    <p className="text-sm text-muted-foreground">{level.instruction}</p>
                  </div>
                  {unlocked && !completed && (
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Start
                    </Button>
                  )}
                  {completed && (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSelect(level.id) }}>
                      Retry
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1 h-11">
            Back
          </Button>
          {allDone && (
            <Button onClick={onFinish} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
              View Final Summary
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
