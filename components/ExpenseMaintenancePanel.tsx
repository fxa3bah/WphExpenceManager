'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ExpenseTable from '@/components/ExpenseTable'

type Expense = {
  id: string
  expense_date: string
  merchant_name: string | null
  category: string
  description: string | null
  currency: string
  amount: string
  status: string
  approved_at: string | null
  trip_id: string | null
  employee: {
    full_name: string
    email: string
    manager_id: string | null
    manager: {
      full_name: string
    } | null
  } | null
  approver: {
    full_name: string
    email: string
  } | null
}

type Trip = {
  id: string
  trip_name: string
  destination: string | null
  start_date: string
  end_date: string | null
  status: string
}

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

interface ExpenseMaintenancePanelProps {
  initialExpenses: Expense[]
  trips: Trip[]
}

export default function ExpenseMaintenancePanel({
  initialExpenses,
  trips,
}: ExpenseMaintenancePanelProps) {
  const supabase = createClient()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTripId, setBulkTripId] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedList = useMemo(() => Array.from(selectedIds), [selectedIds])

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set())
      setBulkTripId('')
      setBulkCategory('')
      setError(null)
      setSuccess(null)
    }
    setSelectionMode((prev) => !prev)
  }

  const handleToggleSelect = (expenseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(expenseId)) {
        next.delete(expenseId)
      } else {
        next.add(expenseId)
      }
      return next
    })
  }

  const handleToggleSelectAll = (expenseIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const shouldSelectAll = expenseIds.some((id) => !next.has(id))
      if (shouldSelectAll) {
        expenseIds.forEach((id) => next.add(id))
      } else {
        expenseIds.forEach((id) => next.delete(id))
      }
      return next
    })
  }

  const handleDelete = async (expenseId: string) => {
    const expense = expenses.find((item) => item.id === expenseId)
    if (!expense) return
    if (expense.status !== 'draft') {
      setError('Only draft expenses can be deleted.')
      return
    }
    if (!window.confirm('Delete this draft expense?')) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setExpenses((prev) => prev.filter((item) => item.id !== expenseId))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
      setSuccess('Expense deleted.')
      router.refresh()
    }

    setLoading(false)
  }

  const handleBulkUpdate = async () => {
    if (selectedList.length === 0) {
      setError('Select at least one expense to update.')
      return
    }

    const updates: Record<string, string | null> = {}

    if (bulkTripId) {
      updates.trip_id = bulkTripId === 'none' ? null : bulkTripId
    }

    if (bulkCategory) {
      updates.category = bulkCategory
    }

    if (Object.keys(updates).length === 0) {
      setError('Choose a trip or category update to apply.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: updateError } = await supabase
      .from('expenses')
      .update(updates)
      .in('id', selectedList)

    if (updateError) {
      setError(updateError.message)
    } else {
      setExpenses((prev) =>
        prev.map((expense) =>
          selectedIds.has(expense.id)
            ? {
                ...expense,
                trip_id: updates.trip_id !== undefined ? updates.trip_id : expense.trip_id,
                category: updates.category ?? expense.category,
              }
            : expense
        )
      )
      setSuccess('Bulk updates applied.')
      router.refresh()
    }

    setLoading(false)
  }

  const handleBulkDelete = async () => {
    if (selectedList.length === 0) {
      setError('Select at least one expense to delete.')
      return
    }

    const nonDraft = expenses.filter(
      (expense) => selectedIds.has(expense.id) && expense.status !== 'draft'
    )

    if (nonDraft.length > 0) {
      setError('Only draft expenses can be deleted in bulk.')
      return
    }

    if (!window.confirm(`Delete ${selectedList.length} draft expense(s)?`)) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .in('id', selectedList)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setExpenses((prev) => prev.filter((expense) => !selectedIds.has(expense.id)))
      setSelectedIds(new Set())
      setSuccess('Selected expenses deleted.')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectionMode ? (
            <span>{selectedList.length} selected</span>
          ) : (
            <span>Select "Mass Maintenance" to edit expenses in bulk.</span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSelectionMode}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectionMode
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {selectionMode ? 'Exit Mass Maintenance' : 'Mass Maintenance'}
        </button>
      </div>

      {selectionMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Update trip assignment</label>
              <select
                value={bulkTripId}
                onChange={(event) => setBulkTripId(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="">No trip change</option>
                <option value="none">Set to no trip</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.trip_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Update category</label>
              <select
                value={bulkCategory}
                onChange={(event) => setBulkCategory(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="">No category change</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Apply Bulk Updates
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete Selected Drafts
            </button>
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          {success && <div className="text-sm text-green-600 dark:text-green-400">{success}</div>}
        </div>
      )}

      <ExpenseTable
        expenses={expenses}
        trips={trips}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onDelete={handleDelete}
      />
    </div>
  )
}
