'use client'

import React from 'react'
import { Mic, Square } from 'lucide-react'

interface CircularRecordButtonProps {
  isRecording: boolean
  recordingTime: number
  maxSeconds: number
  minSeconds?: number
  highlighted?: boolean
  onClick: () => void
}

export function CircularRecordButton({
  isRecording,
  recordingTime,
  maxSeconds,
  minSeconds = 0,
  highlighted,
  onClick,
}: CircularRecordButtonProps) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(recordingTime / maxSeconds, 1)
  const strokeDashoffset = circumference - progress * circumference

  const mins = Math.floor(recordingTime / 60)
  const secs = recordingTime % 60
  const timeLabel = `${mins}:${secs.toString().padStart(2, '0')}`
  const minMet = minSeconds <= 0 || recordingTime >= minSeconds
  const minLabel =
    minSeconds > 0
      ? `${Math.floor(minSeconds / 60)}:${(minSeconds % 60).toString().padStart(2, '0')} minimum`
      : null

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        className={`relative flex h-36 w-36 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
          highlighted ? 'scale-110 ring-4 ring-primary/40 shadow-xl shadow-primary/20' : ''
        } ${isRecording ? 'animate-pulse' : 'hover:scale-105'}`}
      >
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox="0 0 128 128"
          aria-hidden
        >
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-border"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-all duration-500 ${
              isRecording ? 'text-destructive' : recordingTime > 0 ? 'text-primary' : 'text-primary/30'
            }`}
          />
        </svg>

        <div
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-colors ${
            isRecording
              ? 'bg-destructive hover:bg-destructive/90'
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          {isRecording ? (
            <Square className="h-9 w-9 text-white fill-white" />
          ) : (
            <Mic className="h-9 w-9 text-primary-foreground" />
          )}
        </div>
      </button>

      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums text-foreground">{timeLabel}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isRecording
            ? minLabel
              ? `Keep going — ${minLabel}`
              : 'Tap circle to stop'
            : recordingTime > 0
              ? minMet
                ? 'Tap to re-record'
                : minLabel
                  ? `Need ${minLabel} — keep recording`
                  : 'Tap to re-record'
              : minLabel
                ? `Tap to start (${minLabel})`
                : 'Tap circle to start'}
        </p>
      </div>
    </div>
  )
}
