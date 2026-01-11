'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ReceiptUpload from '@/components/ReceiptUpload'
import type { OCRResult } from '@/lib/utils/ocr'
import { format } from 'date-fns'

// Categories matching T&E Form format
const EXPENSE_CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Entertainment',
  'Hotel',
  'Airline/Train Ticket',
  'Tips (other than meals)',
  'Communications',
  'Transportation',
  'Rental Car',
  'Parking and Tolls',
  'Personal Car - Mileage',
  'Other Travel Expenses',
  'Other',
]

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

export default function NewExpensePage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [category, setCategory] = useState('')
  const [entertainmentPeopleCount, setEntertainmentPeopleCount] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [location, setLocation] = useState('')
  const [gpsCoordinates, setGpsCoordinates] = useState<any>(null)
  const [ocrData, setOcrData] = useState<any>(null)
  const [tripId, setTripId] = useState<string>('')
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUserId(user.id)

      // Fetch user profile to get email
      const { data: profile } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserEmail(profile.email)
      }

      loadTrips(user.id)
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (category !== 'Entertainment') {
      setEntertainmentPeopleCount('')
    }
  }, [category])

  async function loadTrips(userId: string) {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) setTrips(data)
  }

  const handleReceiptUpload = (data: {
    file: File
    ocrResult: OCRResult
    location?: string
    gpsCoordinates?: { latitude: number; longitude: number }
  }) => {
    setReceiptFile(data.file)
    setOcrData(data.ocrResult)

    // Auto-populate form fields from OCR
    if (data.ocrResult.amount) {
      setAmount(data.ocrResult.amount.toString())
    }
    if (data.ocrResult.merchantName) {
      setMerchantName(data.ocrResult.merchantName)
    }
    if (data.ocrResult.date) {
      try {
        const parsedDate = new Date(data.ocrResult.date)
        if (!isNaN(parsedDate.getTime())) {
          setExpenseDate(format(parsedDate, 'yyyy-MM-dd'))
        }
      } catch {
        // Keep default date
      }
    }
    if (data.location) {
      setLocation(data.location)
    }
    if (data.gpsCoordinates) {
      setGpsCoordinates(data.gpsCoordinates)
    }
  }

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    setError(null)

    try {
      let receiptUrl: string | null = null

      // Upload receipt if exists
      if (receiptFile) {
        const fileName = `${userId}/${Date.now()}.jpg`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName)

        receiptUrl = publicUrl
      }

      // Determine status based on user role
      // CEO (Jonathan Storie) expenses are automatically approved
      const isCEO = userEmail?.toLowerCase() === 'jonathan.storie@wphome.com'
      let expenseStatus = 'pending'

      if (isDraft) {
        expenseStatus = 'draft'
      } else if (isCEO) {
        expenseStatus = 'approved'
      }

      // Create expense
      const expenseData = {
        user_id: userId,
        trip_id: tripId || null,
        amount: parseFloat(amount),
        currency,
        category,
        entertainment_people_count: category === 'Entertainment' && entertainmentPeopleCount ? parseInt(entertainmentPeopleCount) : null,
        merchant_name: merchantName || null,
        description: description || null,
        expense_date: expenseDate,
        receipt_url: receiptUrl,
        location: location || null,
        gps_coordinates: gpsCoordinates || null,
        ocr_data: ocrData || null,
        status: expenseStatus,
        submitted_at: isDraft ? null : new Date().toISOString(),
        approved_at: isCEO && !isDraft ? new Date().toISOString() : null,
        approved_by: isCEO && !isDraft ? userId : null,
      }

      const { data: insertedExpense, error: insertError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(insertError.message || 'Failed to save expense')
      }

      if (!insertedExpense) {
        throw new Error('Expense was not created. Please check your permissions.')
      }

      // Wait a moment to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 300))

      router.push('/expenses')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold mb-6">New Expense</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Receipt Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Receipt</label>
              <ReceiptUpload onUploadComplete={handleReceiptUpload} />
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium mb-2">
                  Amount *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium mb-2">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              >
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Entertainment People Count - Only show for Entertainment category */}
            {category === 'Entertainment' && (
              <div>
                <label htmlFor="entertainmentPeopleCount" className="block text-sm font-medium mb-2">
                  Number of People Entertained *
                </label>
                <input
                  id="entertainmentPeopleCount"
                  type="number"
                  min="1"
                  value={entertainmentPeopleCount}
                  onChange={(e) => setEntertainmentPeopleCount(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                  placeholder="e.g., 4"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter the number of people who were entertained
                </p>
              </div>
            )}

            {/* Merchant Name */}
            <div>
              <label htmlFor="merchantName" className="block text-sm font-medium mb-2">
                Merchant Name
              </label>
              <input
                id="merchantName"
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                placeholder="e.g., Starbucks"
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="expenseDate" className="block text-sm font-medium mb-2">
                Date *
              </label>
              <input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              />
            </div>

            {/* Trip (Optional) */}
            {trips.length > 0 && (
              <div>
                <label htmlFor="trip" className="block text-sm font-medium mb-2">
                  Link to Trip (Optional)
                </label>
                <select
                  id="trip"
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                >
                  <option value="">No trip</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Location */}
            {location && (
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                placeholder="Add notes about this expense"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
                className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition font-medium"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
