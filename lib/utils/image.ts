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

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.5, // Target: <500KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    return file
  }
}

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

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    )
    const data = await response.json()
    return data.display_name || null
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

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
        timeout: 10000,
        enableHighAccuracy: false,
      }
    )
  })
}
