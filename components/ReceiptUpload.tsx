'use client'

import { useState, useRef } from 'react'
import { compressImage, extractEXIF, reverseGeocode, getBrowserLocation } from '@/lib/utils/image'
import { runOCR, type OCRResult } from '@/lib/utils/ocr'

interface ReceiptUploadProps {
  onUploadComplete: (data: {
    file: File
    ocrResult: OCRResult
    location?: string
    gpsCoordinates?: { latitude: number; longitude: number }
  }) => void
}

export default function ReceiptUpload({ onUploadComplete }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setProgress('Compressing image...')

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)

      // Compress image
      const compressedFile = await compressImage(file)
      setProgress('Extracting metadata...')

      // Extract EXIF data
      const metadata = await extractEXIF(compressedFile)
      let location: string | undefined
      let gpsCoordinates: { latitude: number; longitude: number } | undefined

      // Try EXIF GPS first
      if (metadata.gpsCoordinates) {
        gpsCoordinates = metadata.gpsCoordinates
        setProgress('Getting location from image...')
        const geocoded = await reverseGeocode(
          gpsCoordinates.latitude,
          gpsCoordinates.longitude
        )
        if (geocoded) location = geocoded
      } else {
        // Fallback to browser geolocation
        setProgress('Getting your location...')
        const browserLocation = await getBrowserLocation()
        if (browserLocation) {
          gpsCoordinates = browserLocation
          const geocoded = await reverseGeocode(
            browserLocation.latitude,
            browserLocation.longitude
          )
          if (geocoded) location = geocoded
        }
      }

      // Run OCR
      setProgress('Reading receipt text...')
      const imageUrl = URL.createObjectURL(compressedFile)
      const ocrResult = await runOCR(imageUrl)
      URL.revokeObjectURL(imageUrl)

      setProgress('Done!')

      // Call parent callback
      onUploadComplete({
        file: compressedFile,
        ocrResult,
        location,
        gpsCoordinates,
      })

      setTimeout(() => {
        setProgress('')
        setUploading(false)
      }, 1000)
    } catch (error) {
      console.error('Error processing receipt:', error)
      setProgress('Error processing receipt')
      setUploading(false)
    }
  }

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full h-64 object-cover rounded-lg"
          />
          {!uploading && (
            <button
              onClick={() => {
                setPreview(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={handleCameraCapture}
          disabled={uploading}
          className="w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-4 hover:border-blue-500 transition disabled:opacity-50"
        >
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            {uploading ? 'Processing...' : 'Take photo of receipt'}
          </span>
        </button>
      )}

      {progress && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">{progress}</span>
        </div>
      )}
    </div>
  )
}
