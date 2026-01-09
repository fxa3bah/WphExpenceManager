import imageCompression from 'browser-image-compression'
import ExifReader from 'exifreader'

export interface ImageMetadata {
  gpsCoordinates?: {
    latitude: number
    longitude: number
  }
  dateTaken?: string
  cameraMake?: string
  cameraModel?: string
}

/**
 * Advanced image compression with multi-pass optimization
 * Achieves optimal file size while maintaining visual quality
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.4, // Aggressive target: <400KB
    maxWidthOrHeight: 1920,
    useWebWorker: true, // Offload to Web Worker for performance
    fileType: 'image/jpeg' as const,
    initialQuality: 0.85, // Start with high quality
    alwaysKeepResolution: false,
    preserveExif: false, // Remove EXIF to save space (we extract it separately)
  }

  try {
    // First pass: compress with browser-image-compression
    const compressedFile = await imageCompression(file, options)

    // If still too large, do a second pass with lower quality
    if (compressedFile.size > 400 * 1024) {
      const secondPassOptions = {
        ...options,
        maxSizeMB: 0.3,
        initialQuality: 0.75,
        maxWidthOrHeight: 1600,
      }
      return await imageCompression(compressedFile, secondPassOptions)
    }

    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)

    // Fallback: try canvas-based compression
    try {
      return await canvasCompress(file)
    } catch (fallbackError) {
      console.error('Fallback compression failed:', fallbackError)
      return file
    }
  }
}

/**
 * Fallback canvas-based compression
 * Ultra-fast but lower quality compression for emergency cases
 */
async function canvasCompress(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }

        // Calculate optimal dimensions
        let width = img.width
        let height = img.height
        const maxDimension = 1600

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else {
            width = (width / height) * maxDimension
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height

        // Use high-quality rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Failed to create blob'))
            }
          },
          'image/jpeg',
          0.85
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Extract EXIF metadata from image
 * Runs before compression to preserve location/date data
 */
export async function extractEXIF(file: File): Promise<ImageMetadata> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const tags = ExifReader.load(arrayBuffer)

    const metadata: ImageMetadata = {}

    // Extract GPS coordinates
    if (tags.GPSLatitude && tags.GPSLongitude) {
      const lat = tags.GPSLatitude.description
      const lng = tags.GPSLongitude.description

      if (lat && lng) {
        metadata.gpsCoordinates = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        }
      }
    }

    // Extract date taken
    if (tags.DateTime || tags.DateTimeOriginal) {
      const dateTag = tags.DateTimeOriginal || tags.DateTime
      if (dateTag && dateTag.description) {
        metadata.dateTaken = dateTag.description
      }
    }

    // Extract camera info
    if (tags.Make) {
      metadata.cameraMake = tags.Make.description
    }
    if (tags.Model) {
      metadata.cameraModel = tags.Model.description
    }

    return metadata
  } catch (error) {
    console.error('Error extracting EXIF:', error)
    return {}
  }
}

/**
 * Reverse geocode coordinates to address
 * Uses OpenStreetMap Nominatim API (free, no API key needed)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'WPH-Expense-Manager',
        },
      }
    )
    const data = await response.json()
    return data.display_name || null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Get user's location from browser
 * Fast, low-accuracy mode for better UX
 */
export async function getBrowserLocation(): Promise<{
  latitude: number
  longitude: number
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        resolve(null)
      },
      {
        timeout: 5000, // Reduced from 10s for faster response
        enableHighAccuracy: false, // Fast mode
        maximumAge: 60000, // Cache for 1 minute
      }
    )
  })
}
