'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { deleteSession } from '@/lib/api'
import { AssessmentMode } from '@/lib/levels'

export type Page =
  | 'landing'
  | 'privacy'
  | 'mode'
  | 'assessment'
  | 'loading'
  | 'results'
  | 'practice'
  | 'summary'

export type MistakeType = 'wrong_word' | 'skipped' | 'mumbled' | 'unclear' | 'pause' | 'repeat' | 'stutter'

export interface WordIssue {
  word: string
  expected?: string
  heard?: string
  issue: string
  summaryLine?: string
  mistakeType?: MistakeType
  suggestion?: string
  cleared?: boolean
}

export interface PauseIssue {
  afterWord: string
  durationSeconds: number
  issue: string
  summaryLine: string
  mistakeType: 'pause'
  cleared?: boolean
}

export interface AnalysisStats {
  wordsExpected: number
  wordsSpoken: number
  wordsSkipped: number
  pauseCount: number
  guided?: boolean
}

export interface Results {
  mode: AssessmentMode
  overallScore: number
  metrics: {
    pronunciation: number
    fluency: number
    clarity: number
    pace: number
  }
  feedback: string
  transcript: string
  highlightedMistakes: WordIssue[]
  pauses?: PauseIssue[]
  stats?: AnalysisStats
  wordsToImprove: WordIssue[]
  duration?: number
}

interface AssessmentContextType {
  currentPage: Page
  currentMode: AssessmentMode
  unlockedModes: AssessmentMode[]
  completedModes: AssessmentMode[]
  levelScores: Partial<Record<AssessmentMode, number>>
  audioFile: File | Blob | null
  audioUrl: string | null
  duration: number
  isAnalyzing: boolean
  results: Results | null
  privacyAgreed: boolean
  sessionId: string | null
  setCurrentPage: (page: Page) => void
  setCurrentMode: (mode: AssessmentMode) => void
  setAudioFile: (file: File | Blob | null) => void
  setAudioUrl: (url: string | null) => void
  setDuration: (duration: number) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  setResults: (results: Results | null) => void
  setPrivacyAgreed: (agreed: boolean) => void
  setSessionId: (id: string | null) => void
  markWordCleared: (word: string) => void
  markModeComplete: (mode: AssessmentMode, score: number) => void
  /** Wipe results + audio, stay on the current page, bump attempt so the recorder remounts clean. */
  clearAttempt: () => void
  attemptKey: number
  reset: () => void
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined)

export function AssessmentProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing')
  const [currentMode, setCurrentMode] = useState<AssessmentMode>('read-passage')
  const [unlockedModes, setUnlockedModes] = useState<AssessmentMode[]>(['read-passage'])
  const [completedModes, setCompletedModes] = useState<AssessmentMode[]>([])
  const [levelScores, setLevelScores] = useState<Partial<Record<AssessmentMode, number>>>({})
  const [audioFile, setAudioFile] = useState<File | Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<Results | null>(null)
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [attemptKey, setAttemptKey] = useState(0)

  const markWordCleared = (word: string) => {
    setResults((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        wordsToImprove: prev.wordsToImprove.map((w) =>
          w.word === word ? { ...w, cleared: true } : w
        ),
        highlightedMistakes: prev.highlightedMistakes.map((w) =>
          w.word === word ? { ...w, cleared: true } : w
        ),
      }
    })
  }

  const markModeComplete = (mode: AssessmentMode, score: number) => {
    setLevelScores((prev) => ({ ...prev, [mode]: score }))
    setCompletedModes((prev) => (prev.includes(mode) ? prev : [...prev, mode]))

    const order: AssessmentMode[] = ['read-passage', 'free-speech', 'just-a-minute']
    const idx = order.indexOf(mode)
    if (idx >= 0 && idx < order.length - 1) {
      const next = order[idx + 1]
      setUnlockedModes((prev) => (prev.includes(next) ? prev : [...prev, next]))
    }
  }

  const clearAttempt = () => {
    // Drop the server session so the next analyze cannot reuse old mistakes.
    if (sessionId) {
      deleteSession(sessionId).catch(() => {})
    }
    setSessionId(null)
    setAudioFile(null)
    setAudioUrl(null)
    setDuration(0)
    setIsAnalyzing(false)
    setResults(null)
    setAttemptKey((k) => k + 1)
  }

  const reset = () => {
    // Wipe the server-side session too so no old mistakes survive a "back" /
    // restart. Fire-and-forget — the UI resets immediately either way.
    if (sessionId) {
      deleteSession(sessionId).catch(() => {})
    }
    setCurrentPage('landing')
    setCurrentMode('read-passage')
    setUnlockedModes(['read-passage'])
    setCompletedModes([])
    setLevelScores({})
    setAudioFile(null)
    setAudioUrl(null)
    setDuration(0)
    setIsAnalyzing(false)
    setResults(null)
    setPrivacyAgreed(false)
    setSessionId(null)
    setAttemptKey((k) => k + 1)
  }

  return (
    <AssessmentContext.Provider
      value={{
        currentPage,
        currentMode,
        unlockedModes,
        completedModes,
        levelScores,
        audioFile,
        audioUrl,
        duration,
        isAnalyzing,
        results,
        privacyAgreed,
        sessionId,
        setCurrentPage,
        setCurrentMode,
        setAudioFile,
        setAudioUrl,
        setDuration,
        setIsAnalyzing,
        setResults,
        setPrivacyAgreed,
        setSessionId,
        markWordCleared,
        markModeComplete,
        clearAttempt,
        attemptKey,
        reset,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  )
}

export function useAssessment() {
  const context = useContext(AssessmentContext)
  if (!context) {
    throw new Error('useAssessment must be used within AssessmentProvider')
  }
  return context
}
