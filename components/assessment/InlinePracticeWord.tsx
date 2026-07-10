'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { WordIssue } from '@/context/AssessmentContext'
import { pronounceUrl, verifyWord, formatApiError } from '@/lib/api'
import { AssessmentMode, PRACTICE_WORD_MAX_SECONDS } from '@/lib/levels'
import { CheckCircle2, Mic, Square, Volume2 } from 'lucide-react'

interface InlinePracticeWordProps {
  issue: WordIssue
  mode: AssessmentMode
  onEnsureSession: () => Promise<string>
  onVerified: (word: string) => void
}

export function InlinePracticeWord({
  issue,
  mode,
  onEnsureSession,
  onVerified,
}: InlinePracticeWordProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [hasClip, setHasClip] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const clipRef = useRef<Blob | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cleared = issue.cleared

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      audioRef.current?.pause()
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

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

  const startRecording = async () => {
    try {
      audioRef.current?.pause()
      setIsListening(false)
      setError(null)
      chunksRef.current = []
      clipRef.current = null
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) =>
        MediaRecorder.isTypeSupported(t)
      )
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        })
        clipRef.current = blob
        setHasClip(true)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start(500)
      setIsRecording(true)
      setRecordTime(0)
      setHasClip(false)

      timerRef.current = setInterval(() => {
        setRecordTime((prev) => {
          if (prev + 1 >= PRACTICE_WORD_MAX_SECONDS) {
            stopRecording()
            return PRACTICE_WORD_MAX_SECONDS
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      setError('Microphone access denied.')
    }
  }

  const handleRecordClick = () => {
    if (cleared) return
    if (isRecording) stopRecording()
    else startRecording()
  }

  const playBrowserFallback = (word: string): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('speech synthesis unavailable'))
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'en-US'
      utterance.onend = () => resolve()
      utterance.onerror = () => reject(new Error('speech synthesis failed'))
      window.speechSynthesis.speak(utterance)
    })

  const handleListen = async () => {
    if (cleared || isRecording) return
    setError(null)
    setIsListening(true)

    const finishWithFallback = async () => {
      try {
        await playBrowserFallback(issue.word)
      } catch {
        setError('Could not play reference audio. Restart the API after pip install.')
      } finally {
        setIsListening(false)
      }
    }

    try {
      const res = await fetch(pronounceUrl(issue.word))
      if (!res.ok) throw new Error('pronounce fetch failed')
      const blob = await res.blob()
      if (!blob.size) throw new Error('empty audio')
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsListening(false)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        void finishWithFallback()
      }
      await audio.play()
    } catch {
      await finishWithFallback()
    }
  }

  const handleVerify = async () => {
    if (!hasClip || !clipRef.current || cleared || isRecording) return
    setVerifying(true)
    setError(null)
    try {
      const sid = await onEnsureSession()
      const result = await verifyWord(sid, mode, issue.word, clipRef.current)
      if (result.passed) {
        onVerified(issue.word)
      } else {
        setError(`Not quite — heard "${result.heard}". Listen and try again.`)
        setHasClip(false)
        clipRef.current = null
        setRecordTime(0)
      }
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setVerifying(false)
    }
  }

  if (cleared) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/5 border border-primary/20">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-primary">{issue.word}</span>
        <span className="text-xs text-primary ml-auto">Verified ✓</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-destructive text-sm font-bold mt-0.5">✕</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{issue.word}</p>
          <p className="text-xs text-muted-foreground">
            {issue.summaryLine || issue.issue}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pl-5">
        Listen, then speak &ldquo;{issue.word}&rdquo; — max {PRACTICE_WORD_MAX_SECONDS}s
        {recordTime > 0 && (
          <span className="ml-2 text-foreground font-medium tabular-nums">{recordTime}s</span>
        )}
      </p>

      {error && <p className="text-xs text-destructive pl-5">{error}</p>}

      <div className="flex gap-2 pl-5">
        <Button
          size="sm"
          variant="outline"
          className={`flex-1 h-8 text-xs ${isListening ? 'border-primary text-primary' : ''}`}
          onClick={handleListen}
          disabled={isRecording || verifying}
        >
          <Volume2 className="h-3 w-3 mr-1" />
          {isListening ? 'Playing...' : 'Listen'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`flex-1 h-8 text-xs ${isRecording ? 'border-destructive text-destructive' : ''}`}
          onClick={handleRecordClick}
          disabled={verifying || isListening}
        >
          {isRecording ? (
            <>
              <Square className="h-3 w-3 mr-1 fill-current" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-3 w-3 mr-1" />
              Speak
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={!hasClip || isRecording || verifying || isListening}
          onClick={handleVerify}
        >
          {verifying ? '...' : 'Verify'}
        </Button>
      </div>
    </div>
  )
}
