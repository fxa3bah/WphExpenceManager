'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteExpense } from '@/app/expenses/actions'
import { format } from 'date-fns'

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

export default function EditExpensePage() {
  const params = useParams<{ id: string }>()
  const expenseId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id), [params])
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [trips, setTrips] = useState<any[]>([])
  const [status, setStatus] = useState<string>('draft')

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [category, setCategory] = useState('')
  const [merchantName, setMerchantName] = useState('')
  const [description, setDescription] = useState('')
  const [entertainmentPeopleCount, setEntertainmentPeopleCount] = useState('')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [tripId, setTripId] = useState('')

  useEffect(() => {
    async function loadExpense() {
      if (!expenseId) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single()

      if (expenseError || !expense) {
        setError(expenseError?.message || 'Unable to load expense.')
        setLoading(false)
        return
      }

      setAmount(expense.amount?.toString() || '')
      setCurrency(expense.currency || 'USD')
      setCategory(expense.category || '')
      setMerchantName(expense.merchant_name || '')
      setDescription(expense.description || '')
      setEntertainmentPeopleCount(expense.entertainment_people_count?.toString() || '')
      setExpenseDate(expense.expense_date || format(new Date(), 'yyyy-MM-dd'))
      setTripId(expense.trip_id || '')
      setStatus(expense.status || 'draft')

      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (tripData) setTrips(tripData)
      setLoading(false)
    }

    loadExpense()
  }, [expenseId, router, supabase])

  useEffect(() => {
    if (category !== 'Entertainment') {
      setEntertainmentPeopleCount('')
    }
  }, [category])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!expenseId) return

    if (category === 'Entertainment' && !entertainmentPeopleCount) {
      setError('Enter the number of people entertained.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(amount),
        currency,
        category,
        merchant_name: merchantName || null,
        description: description || null,
        entertainment_people_count:
          category === 'Entertainment' && entertainmentPeopleCount
            ? parseInt(entertainmentPeopleCount, 10)
            : null,
        expense_date: expenseDate,
        trip_id: tripId || null,
      })
      .eq('id', expenseId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Expense updated.')
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!expenseId || !window.confirm('Delete this expense permanently?')) return

    setSaving(true)
    setError(null)

    const result = await deleteExpense(expenseId)

    if (result.error) {
      setError(result.error)
      setSaving(false)
      return
    }

    router.push('/expenses')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading expense...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Expense</h1>
            <button
              type="button"
              onClick={() => router.push(`/expenses/${expenseId}`)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to Details
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
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
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium mb-2">
                  Currency *
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
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

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-2">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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

            <div>
              <label htmlFor="merchantName" className="block text-sm font-medium mb-2">
                Merchant Name
              </label>
              <input
                id="merchantName"
                type="text"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              />
            </div>

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
                  onChange={(event) => setEntertainmentPeopleCount(event.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
                />
              </div>
            )}

            <div>
              <label htmlFor="expenseDate" className="block text-sm font-medium mb-2">
                Date *
              </label>
              <input
                id="expenseDate"
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              />
            </div>

            {trips.length > 0 && (
              <div>
                <label htmlFor="trip" className="block text-sm font-medium mb-2">
                  Link to Trip (Optional)
                </label>
                <select
                  id="trip"
                  value={tripId}
                  onChange={(event) => setTripId(event.target.value)}
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

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium"
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
