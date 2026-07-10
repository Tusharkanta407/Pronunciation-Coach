'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '../landing/Header'
import { ModeTabs } from '../assessment/ModeTabs'
import { CircularRecordButton } from '../assessment/CircularRecordButton'
import { FloatingTutorial, TutorialStep } from '../assessment/FloatingTutorial'
import { CompactScore } from '../assessment/CompactScore'
import { MistakeFeedbackPanel } from '../assessment/MistakeFeedbackPanel'
import { InlinePracticeWord } from '../assessment/InlinePracticeWord'
import { TranscriptHighlight } from '../results/TranscriptHighlight'
import { getLevel, AssessmentMode, MAX_PRACTICE_WORDS, PASS_THRESHOLD, pickJamTopic, isGuidedMode } from '@/lib/levels'
import { Results } from '@/context/AssessmentContext'
import { ArrowLeft, Upload } from 'lucide-react'

interface AssessmentWorkspaceProps {
  mode: AssessmentMode
  sessionId: string | null
  unlockedModes: AssessmentMode[]
  results: Results | null
  isAnalyzing: boolean
  onModeChange: (mode: AssessmentMode) => void
  onAnalyze: (file: Blob, duration: number) => void
  onEnsureSession: () => Promise<string>
  onWordCleared: (word: string) => void
  onRoundComplete: () => void
  onBack: () => void
}

function getTutorialSteps(mode: AssessmentMode): TutorialStep[] {
  const level = getLevel(mode)

  if (mode === 'read-passage') {
    return [
      {
        id: 'read',
        title: 'Read the passage carefully',
        description: 'Go through the full passage first before you start recording.',
        hint: '✓ Take your time — read each sentence clearly.',
        target: 'passage-card',
      },
      {
        id: 'start',
        title: 'Start recording',
        description: 'Tap the green circle to begin. The ring shows your time (up to 1 minute).',
        hint: '👉 Tap the microphone circle below.',
        target: 'record-circle',
      },
      {
        id: 'stop',
        title: 'Read aloud & stop when done',
        description: 'Read the entire passage. Tap the circle again when finished.',
        hint: '⏹ Tap the circle again when done.',
        target: 'record-circle',
      },
      {
        id: 'analyze',
        title: 'Submit for analysis',
        description: 'Click Analyze, then practice flagged words on the right panel.',
        hint: '✅ Practice each word (10s max) before next round.',
        target: 'analyze-button',
      },
    ]
  }

  if (mode === 'free-speech') {
    return [
      {
        id: 'read',
        title: `Prepare: ${level.title}`,
        description: level.instruction,
        target: 'passage-card',
      },
      {
        id: 'start',
        title: 'Tap circle to record',
        description: 'Tap the green circle to start. Tap again when finished.',
        target: 'record-circle',
      },
      {
        id: 'analyze',
        title: 'Submit & practice mistakes',
        description: 'Analyze your recording, then practice words on the right.',
        target: 'analyze-button',
      },
    ]
  }

  if (mode === 'just-a-minute') {
    return [
      {
        id: 'topic',
        title: 'Your random topic',
        description: 'Read the topic on the left. Talk about it freely — any angle is fine.',
        hint: '🎲 A new topic appears each time you enter this round.',
        target: 'passage-card',
      },
      {
        id: 'start',
        title: 'Record for at least 1 minute',
        description: 'Tap the circle to start. Keep speaking until at least 1:00 shows on the timer.',
        hint: '⏱ Minimum 60 seconds — do not stop early.',
        target: 'record-circle',
      },
      {
        id: 'stop',
        title: 'Stop when you reach 1:00+',
        description: 'You can talk up to 75 seconds. Tap the circle to stop after one full minute.',
        target: 'record-circle',
      },
      {
        id: 'analyze',
        title: 'Submit & practice mistakes',
        description: 'We pick up pronunciation errors from your speech. Practice flagged words to continue.',
        target: 'analyze-button',
      },
    ]
  }

  return []
}

export function AssessmentWorkspace({
  mode,
  sessionId,
  unlockedModes,
  results,
  isAnalyzing,
  onModeChange,
  onAnalyze,
  onEnsureSession,
  onWordCleared,
  onRoundComplete,
  onBack,
}: AssessmentWorkspaceProps) {
  const level = getLevel(mode)
  const tutorialSteps = getTutorialSteps(mode)

  const [showTutorial, setShowTutorial] = useState(true)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [jamTopic, setJamTopic] = useState(() => pickJamTopic())

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const uploadedBlobRef = useRef<Blob | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeTarget = showTutorial && !results ? tutorialSteps[tutorialStep]?.target : null
  const practiceWords = results?.wordsToImprove.slice(0, MAX_PRACTICE_WORDS) ?? []
  const highlightedMistakes = results?.highlightedMistakes ?? practiceWords
  const highlightSource =
    results && isGuidedMode(mode) ? results.transcript : level.content
  const isGuidedSpeech = isGuidedMode(mode)
  const isJam = mode === 'just-a-minute'
  const minSeconds = level.minRecordingSeconds
  const meetsMinDuration = recordingTime >= minSeconds
  const allPracticeCleared =
    practiceWords.length === 0 || practiceWords.every((w) => w.cleared)
  const canAdvance =
    isGuidedSpeech
      ? (results?.overallScore ?? 0) >= PASS_THRESHOLD || allPracticeCleared
      : practiceWords.length === 0 || allPracticeCleared

  useEffect(() => {
    setShowTutorial(true)
    setTutorialStep(0)
    if (mode === 'just-a-minute') setJamTopic(pickJamTopic())
    resetRecording()
    return () => cleanup()
  }, [mode])

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  const resetRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setRecordingTime(0)
    setHasRecording(false)
    setAudioUrl(null)
    setFileName(null)
    audioChunksRef.current = []
    uploadedBlobRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder?.state === 'recording') {
      try {
        recorder.requestData()
      } catch {
        /* ignore */
      }
      recorder.stop()
    }
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const pickRecorderMime = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  const startRecording = async () => {
    try {
      resetRecording()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      const mimeType = pickRecorderMime()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        uploadedBlobRef.current = blob
        setAudioUrl(URL.createObjectURL(blob))
        setHasRecording(true)
        setFileName('Recording')
        stream.getTracks().forEach((t) => t.stop())
      }

      // Timeslice ensures the full recording is captured (not just the last chunk)
      recorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev + 1 >= level.maxRecordingSeconds) {
            stopRecording()
            return level.maxRecordingSeconds
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      alert('Microphone access denied. Please allow mic access or upload a file.')
    }
  }

  const handleCircleClick = () => {
    if (results) return
    if (isRecording) stopRecording()
    else startRecording()
  }

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration)
      if (dur < minSeconds) {
        alert(
          `Recording is ${dur}s — Jam requires at least ${minSeconds} seconds. Please record again.`
        )
        URL.revokeObjectURL(url)
        return
      }
      setRecordingTime(dur)
      uploadedBlobRef.current = file
      setAudioUrl(url)
      setHasRecording(true)
      setFileName(file.name)
      audioChunksRef.current = []
      setIsRecording(false)
    }
  }

  const handleAnalyze = () => {
    if (!meetsMinDuration) {
      alert(`Keep recording — you need at least ${minSeconds} seconds for this round.`)
      return
    }
    if (uploadedBlobRef.current) {
      onAnalyze(uploadedBlobRef.current, recordingTime)
    }
  }

  const handleNextRound = () => {
    if (canAdvance) {
      onRoundComplete()
    }
  }

  const canSubmit = hasRecording && !isRecording && recordingTime > 0 && meetsMinDuration && !results

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-border bg-card px-8 py-6 shadow-lg text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-semibold text-foreground">Analyzing your pronunciation...</p>
          </div>
        </div>
      )}

      {showTutorial && !results && (
        <FloatingTutorial
          steps={tutorialSteps}
          currentStep={tutorialStep}
          onNext={() => {
            if (tutorialStep < tutorialSteps.length - 1) setTutorialStep((s) => s + 1)
            else setShowTutorial(false)
          }}
          onSkip={() => setShowTutorial(false)}
        />
      )}

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-6">Assessment</h1>

        <ModeTabs active={mode} unlockedModes={unlockedModes} onChange={onModeChange} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: passage + feedback */}
          <div className="space-y-4 order-1">
            <Card
              id="passage-card"
              className={`p-6 border transition-all duration-300 ${
                activeTarget === 'passage-card'
                  ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20'
                  : 'border-border'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {level.title}
              </p>
              {!results ? (
                isJam ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{level.instruction}</p>
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                        Your topic
                      </p>
                      <p className="text-lg font-semibold text-foreground leading-snug">{jamTopic}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{level.content}</p>
                  </div>
                ) : (
                  <p className="text-foreground leading-relaxed text-base">{level.content}</p>
                )
              ) : highlightedMistakes.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Highlighted words show where pronunciation was off:
                  </p>
                  <TranscriptHighlight
                    text={highlightSource}
                    wordsToImprove={highlightedMistakes}
                    showPassage
                    showDetails={false}
                  />
                </div>
              ) : (
                <p className="text-foreground leading-relaxed text-base">{level.content}</p>
              )}
            </Card>

            {results && (
              <Card className="p-4 border border-border">
                <p className="text-sm font-semibold text-foreground mb-2">Your Feedback</p>
                <p className="text-sm text-foreground leading-relaxed mb-4">{results.feedback}</p>
                <MistakeFeedbackPanel
                  results={results}
                  isGuided={isGuidedSpeech}
                  audioDurationSeconds={results.duration}
                />
              </Card>
            )}
          </div>

          {/* Right: score + practice only */}
          <div className="space-y-4 order-2">
            <CompactScore score={results?.overallScore ?? null} />

            <Card className="p-4 border border-border">
              <p className="text-sm font-semibold text-foreground mb-3">
                {results ? 'Practice Words' : 'Mistakes'}
              </p>

              {!results && (
                <p className="text-sm text-muted-foreground">
                  Analyze your recording to see words to practice here.
                </p>
              )}

              {results && practiceWords.length === 0 && (
                <p className="text-sm text-primary font-medium">
                  {isGuidedSpeech ? 'No unclear words — you can continue.' : 'No mistakes — great job!'}
                </p>
              )}

              {results && practiceWords.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Practice up to {MAX_PRACTICE_WORDS} words (10s each) to continue.
                  </p>
                  {practiceWords.map((issue) => (
                    <InlinePracticeWord
                      key={issue.word}
                      issue={issue}
                      mode={mode}
                      onEnsureSession={onEnsureSession}
                      onVerified={onWordCleared}
                    />
                  ))}
                </div>
              )}

              {results && (
                <Button
                  className="w-full h-12 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={!canAdvance}
                  onClick={handleNextRound}
                >
                  {canAdvance
                    ? 'Next Round →'
                    : `Practice ${practiceWords.filter((w) => !w.cleared).length} more word(s)`}
                </Button>
              )}
            </Card>
          </div>

          {!results && (
            <Card className="p-6 border border-border flex flex-col items-center order-3 lg:order-2 lg:col-start-1">
                <div
                  id="record-circle"
                  className={`transition-all duration-300 ${
                    activeTarget === 'record-circle' ? 'scale-105' : ''
                  }`}
                >
                  <CircularRecordButton
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    maxSeconds={level.maxRecordingSeconds}
                    minSeconds={minSeconds > 3 ? minSeconds : undefined}
                    highlighted={activeTarget === 'record-circle'}
                    onClick={handleCircleClick}
                  />
                </div>

                <div className="w-full mt-6 pt-6 border-t border-border">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRecording}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload audio instead
                  </Button>
                </div>

                {hasRecording && audioUrl && (
                  <div className="w-full mt-4 space-y-3">
                    <p className={`text-sm font-medium text-center ${meetsMinDuration ? 'text-primary' : 'text-destructive'}`}>
                      {meetsMinDuration
                        ? `✓ ${fileName} ready (${recordingTime}s)`
                        : `${recordingTime}s recorded — need at least ${minSeconds}s`}
                    </p>
                    <audio controls src={audioUrl} className="w-full" />
                    <Button variant="outline" size="sm" className="w-full" onClick={resetRecording}>
                      Discard &amp; re-record
                    </Button>
                  </div>
                )}

                {canSubmit && (
                  <Button
                    id="analyze-button"
                    className={`w-full h-12 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 transition-all ${
                      activeTarget === 'analyze-button' ? 'ring-4 ring-primary/30 scale-[1.02]' : ''
                    }`}
                    disabled={isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    Analyze Pronunciation
                  </Button>
                )}
              </Card>
          )}
        </div>

        <div className="mt-6">
          <Button variant="outline" className="w-full sm:w-auto h-11 px-8" onClick={onBack} disabled={isRecording}>
            Cancel
          </Button>
        </div>
      </main>
    </div>
  )
}
