'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAssessment } from '@/context/AssessmentContext'
import { LandingPage } from '@/components/pages/LandingPage'
import { PrivacyPage } from '@/components/pages/PrivacyPage'
import { ModeSelectPage } from '@/components/pages/ModeSelectPage'
import { AssessmentWorkspace } from '@/components/pages/AssessmentWorkspace'
import { SummaryPage } from '@/components/pages/SummaryPage'
import { RestartButton } from '@/components/RestartButton'
import { ErrorDialog } from '@/components/ErrorDialog'
import { ServerWakeScreen } from '@/components/loading/ServerWakeScreen'
import { analyzeAudio, createSession, ensureSession, formatApiError, wakeBackend } from '@/lib/api'

export default function Page() {
  const {
    currentPage,
    setCurrentPage,
    currentMode,
    setCurrentMode,
    unlockedModes,
    completedModes,
    levelScores,
    sessionId,
    setSessionId,
    setAudioFile,
    setAudioUrl,
    setDuration,
    isAnalyzing,
    setIsAnalyzing,
    results,
    setResults,
    setPrivacyAgreed,
    markWordCleared,
    markModeComplete,
    reset,
    attemptKey,
  } = useAssessment()

  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null)
  const [isWaking, setIsWaking] = useState(false)
  const [wakeAttempt, setWakeAttempt] = useState(0)
  const [wakeElapsedMs, setWakeElapsedMs] = useState(0)
  const wakePromiseRef = useRef<Promise<void> | null>(null)

  const showError = (message: string, title = 'Something went wrong') => {
    setErrorDialog({ title, message })
  }

  // Start waking the backend as soon as the user opens the consent page —
  // by the time they finish reading, Render is often already up.
  useEffect(() => {
    if (currentPage !== 'privacy') return
    if (!wakePromiseRef.current) {
      wakePromiseRef.current = wakeBackend().catch(() => {
        wakePromiseRef.current = null
      })
    }
  }, [currentPage])

  const handleRoundComplete = () => {
    if (!results) return
    markModeComplete(currentMode, results.overallScore)
    setResults(null)
    setAudioFile(null)
    setAudioUrl(null)
    setCurrentPage('mode')
  }

  const handlePrivacyContinue = async () => {
    setIsWaking(true)
    setWakeAttempt(0)
    setWakeElapsedMs(0)
    try {
      await wakeBackend((attempt, elapsedMs) => {
        setWakeAttempt(attempt)
        setWakeElapsedMs(elapsedMs)
      })
      wakePromiseRef.current = Promise.resolve()

      const id = await createSession()
      setSessionId(id)
      setPrivacyAgreed(true)
      setCurrentPage('mode')
    } catch (err) {
      wakePromiseRef.current = null
      showError(formatApiError(err), 'Server not ready')
    } finally {
      setIsWaking(false)
    }
  }

  const handleAnalyze = async (file: Blob, duration: number) => {
    setAudioFile(file)
    setAudioUrl(URL.createObjectURL(file))
    setDuration(duration)
    setIsAnalyzing(true)
    try {
      const sid = await ensureSession(sessionId)
      if (sid !== sessionId) setSessionId(sid)
      const result = await analyzeAudio(sid, currentMode, file)
      setResults(result)
    } catch (err) {
      showError(formatApiError(err), 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleEnsureSession = async (): Promise<string> => {
    const sid = await ensureSession(sessionId)
    if (sid !== sessionId) setSessionId(sid)
    return sid
  }

  if (isWaking) {
    return (
      <>
        <ServerWakeScreen elapsedMs={wakeElapsedMs} attempt={wakeAttempt} />
        <ErrorDialog
          open={errorDialog !== null}
          title={errorDialog?.title}
          message={errorDialog?.message ?? ''}
          onClose={() => setErrorDialog(null)}
        />
      </>
    )
  }

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onStart={() => setCurrentPage('privacy')} />
      )}

      {currentPage === 'privacy' && (
        <PrivacyPage
          onContinue={handlePrivacyContinue}
          onBack={reset}
        />
      )}

      {currentPage === 'mode' && (
        <ModeSelectPage
          unlockedModes={unlockedModes}
          completedModes={completedModes}
          levelScores={levelScores}
          onSelect={(mode) => {
            setCurrentMode(mode)
            setResults(null)
            setCurrentPage('assessment')
          }}
          onBack={() => setCurrentPage('privacy')}
          onFinish={() => setCurrentPage('summary')}
        />
      )}

      {currentPage === 'assessment' && (
        <AssessmentWorkspace
          key={attemptKey}
          mode={currentMode}
          sessionId={sessionId}
          unlockedModes={unlockedModes}
          results={results}
          isAnalyzing={isAnalyzing}
          onModeChange={setCurrentMode}
          onAnalyze={handleAnalyze}
          onEnsureSession={handleEnsureSession}
          onWordCleared={markWordCleared}
          onRoundComplete={handleRoundComplete}
          onBack={() => setCurrentPage('mode')}
        />
      )}

      {currentPage === 'summary' && (
        <SummaryPage
          levelScores={levelScores}
          completedModes={completedModes}
          onRestart={reset}
          onBackToModes={() => setCurrentPage('mode')}
        />
      )}

      <RestartButton />

      <ErrorDialog
        open={errorDialog !== null}
        title={errorDialog?.title}
        message={errorDialog?.message ?? ''}
        onClose={() => setErrorDialog(null)}
      />
    </>
  )
}
