'use client'

import React, { useState, useRef } from 'react'
import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RecordingButtonProps {
  onRecordingComplete: (blob: Blob, duration: number) => void
}

export function RecordingButton({ onRecordingComplete }: RecordingButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const startTime = useRef<number>(0)

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []
      startTime.current = Date.now()

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data)
      }

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' })
        const duration = (Date.now() - startTime.current) / 1000
        onRecordingComplete(audioBlob, duration)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Please allow microphone access to record audio.')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">Or record directly with your microphone</p>
        <Button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
          className="w-full max-w-sm mx-auto"
        >
          {isRecording ? (
            <>
              <Square className="w-5 h-5 mr-2" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-2" />
              Start Recording
            </>
          )}
        </Button>
      </div>
      {isRecording && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording...</span>
          </div>
        </div>
      )}
    </div>
  )
}
