'use client'

import React, { useState } from 'react'
import { Upload } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { RecordingButton } from './RecordingButton'

interface AudioUploadCardProps {
  onFileSelected: (file: File | Blob, url: string, duration: number) => void
}

export function AudioUploadCard({ onFileSelected }: AudioUploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = (file: File) => {
    // Validate file
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a']
    if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
      alert('Please upload an audio file (MP3, WAV, M4A)')
      return
    }

    const url = URL.createObjectURL(file)
    
    // Get duration
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      setFileName(file.name)
      onFileSelected(file, url, audio.duration)
    }
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  return (
    <div className="space-y-6">
      <Card
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`p-12 border-2 border-dashed transition-all ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30'
        }`}
      >
        <div className="text-center space-y-4">
          <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Drag & Drop or Upload Audio
            </p>
            <p className="text-sm text-muted-foreground">Supported formats: MP3, WAV, M4A</p>
          </div>
          
          <label className="inline-block">
            <input
              type="file"
              accept="audio/*"
              onChange={handleInputChange}
              className="hidden"
            />
            <span className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors">
              Choose File
            </span>
          </label>

          {fileName && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium">✓ File selected: {fileName}</p>
            </div>
          )}
        </div>
      </Card>

      <RecordingButton onRecordingComplete={(blob, duration) => {
        const url = URL.createObjectURL(blob)
        setFileName('Recording')
        onFileSelected(blob, url, duration)
      }} />
    </div>
  )
}
