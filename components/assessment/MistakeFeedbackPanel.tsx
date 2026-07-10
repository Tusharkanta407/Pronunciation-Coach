'use client'

import React from 'react'
import { PauseIssue, Results, WordIssue } from '@/context/AssessmentContext'

const TYPE_LABELS: Record<string, string> = {
  wrong_word: 'Wrong word',
  wrong_sound: 'Mispronounced',
  skipped: 'Skipped / mumbled',
  unclear: 'Unclear',
  mumbled: 'Mumbled',
  pause: 'Pause',
  repeat: 'Repeated word',
  stutter: 'Repeated phrase',
}

interface MistakeFeedbackPanelProps {
  results: Results
  isGuided?: boolean
  audioDurationSeconds?: number
}

function MistakeRow({
  summaryLine,
  mistakeType,
  expected,
  heard,
  issue,
}: {
  summaryLine: string
  mistakeType?: string
  expected?: string
  heard?: string
  issue?: string
}) {
  const label = mistakeType ? TYPE_LABELS[mistakeType] ?? mistakeType : 'Issue'

  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wide text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground leading-snug">{summaryLine}</p>
      {expected && heard && heard !== '(not detected)' && expected.toLowerCase() !== heard.toLowerCase() && (
        <p className="text-xs text-muted-foreground mt-1.5">
          Expected: <span className="text-foreground font-medium">{expected}</span>
          {' · '}
          You said: <span className="text-destructive font-medium">{heard}</span>
        </p>
      )}
      {issue && issue !== summaryLine && (
        <p className="text-xs text-muted-foreground mt-1">{issue}</p>
      )}
    </div>
  )
}

export function MistakeFeedbackPanel({
  results,
  isGuided = false,
  audioDurationSeconds,
}: MistakeFeedbackPanelProps) {
  const mistakes = results.highlightedMistakes ?? []
  const pauses = results.pauses ?? []
  const hasIssues = mistakes.length > 0 || pauses.length > 0

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">What you said</p>
        <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">
          &ldquo;{results.transcript}&rdquo;
        </p>
        {results.stats && (
          <p className="text-xs text-muted-foreground mt-2">
            {audioDurationSeconds != null && audioDurationSeconds > 0 && (
              <>{Math.round(audioDurationSeconds)}s recording · </>
            )}
            {results.stats.wordsSpoken} words detected
            {!isGuided && ` · ${results.stats.wordsExpected} expected`}
            {results.stats.wordsSkipped > 0 && ` · ${results.stats.wordsSkipped} skipped`}
            {results.stats.pauseCount > 0 && ` · ${results.stats.pauseCount} long pause(s)`}
          </p>
        )}
      </div>

      {hasIssues ? (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Issues found</p>
          <div className="space-y-2">
            {mistakes
              .filter((m) => !m.cleared)
              .map((m: WordIssue, i: number) => (
                <MistakeRow
                  key={`${m.word}-${m.heard}-${m.mistakeType ?? 'issue'}-${i}`}
                  summaryLine={m.summaryLine || m.issue}
                  mistakeType={m.mistakeType}
                  expected={m.expected ?? m.word}
                  heard={m.heard}
                  issue={m.issue}
                />
              ))}
            {pauses.map((p: PauseIssue, i: number) => (
              <MistakeRow
                key={`pause-${p.afterWord}-${i}`}
                summaryLine={p.summaryLine}
                mistakeType="pause"
                issue={p.issue}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-primary font-medium">No major mistakes detected — great job!</p>
      )}
    </div>
  )
}
