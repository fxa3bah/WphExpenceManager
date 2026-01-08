export interface OCRResult {
  text: string
  confidence: number
  amount?: number
  date?: string
  merchantName?: string
}

export function parseOCRText(text: string): Partial<OCRResult> {
  const result: Partial<OCRResult> = {}

  // Extract amount (currency symbols + numbers)
  const amountRegex = /(?:[$£€¥₹])\s*(\d+(?:[,.]\d{2})?)|(\d+(?:[,.]\d{2})?)\s*(?:USD|EUR|GBP|INR)/gi
  const amountMatch = text.match(amountRegex)
  if (amountMatch) {
    const numMatch = amountMatch[0].match(/\d+(?:[,.]\d{2})?/)
    if (numMatch) {
      result.amount = parseFloat(numMatch[0].replace(',', '.'))
    }
  }

  // Extract date (common formats)
  const dateRegex = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{4}[-/]\d{1,2}[-/]\d{1,2})|([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/gi
  const dateMatch = text.match(dateRegex)
  if (dateMatch) {
    result.date = dateMatch[0]
  }

  // Extract merchant name (usually first non-address line)
  const lines = text.split('\n').filter(line => line.trim().length > 0)
  if (lines.length > 0) {
    // Skip lines that look like addresses or phone numbers
    for (const line of lines) {
      if (!line.match(/\d{3,}/) && line.length > 2 && line.length < 50) {
        result.merchantName = line.trim()
        break
      }
    }
  }

  return result
}

export async function runOCR(imageUrl: string): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/ocr-worker.js')

    worker.postMessage({ imageUrl })

    worker.addEventListener('message', (e) => {
      const { success, text, confidence, error } = e.data

      if (success) {
        const parsed = parseOCRText(text)
        resolve({
          text,
          confidence,
          ...parsed,
        })
      } else {
        reject(new Error(error || 'OCR failed'))
      }

      worker.terminate()
    })

    worker.addEventListener('error', (error) => {
      reject(error)
      worker.terminate()
    })
  })
}
