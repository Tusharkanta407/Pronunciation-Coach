'use client'

import React, { useState } from 'react'
import { useAssessment } from '@/context/AssessmentContext'
import { LandingPage } from '@/components/pages/LandingPage'
import { PrivacyPage } from '@/components/pages/PrivacyPage'
import { ModeSelectPage } from '@/components/pages/ModeSelectPage'
import { AssessmentWorkspace } from '@/components/pages/AssessmentWorkspace'
import { SummaryPage } from '@/components/pages/SummaryPage'
import { RestartButton } from '@/components/RestartButton'
import { ErrorDialog } from '@/components/ErrorDialog'
import { analyzeAudio, createSession, ensureSession, formatApiError } from '@/lib/api'

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

  const showError = (message: string, title = 'Something went wrong') => {
    setErrorDialog({ title, message })
  }

  const handleRoundComplete = () => {
    if (!results) return
    markModeComplete(currentMode, results.overallScore)
    setResults(null)
    setAudioFile(null)
    setAudioUrl(null)
    setCurrentPage('mode')
  }

  const handlePrivacyContinue = async () => {
    try {
      const id = await createSession()
      setSessionId(id)
      setPrivacyAgreed(true)
      setCurrentPage('mode')
    } catch (err) {
      showError(formatApiError(err), 'Could not start session')
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
