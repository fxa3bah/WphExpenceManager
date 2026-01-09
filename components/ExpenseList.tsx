'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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

interface ExpenseListProps {
  initialExpenses: Expense[]
  trips: Trip[]
}

const EXPENSE_CATEGORIES = [
  'Breakfast', 'Lunch', 'Dinner', 'Entertainment', 'Hotel',
  'Airline/Train Ticket', 'Tips (other than meals)', 'Communications',
  'Transportation', 'Rental Car', 'Parking and Tolls',
  'Personal Car - Mileage', 'Other Travel Expenses', 'Other',
]

export default function ExpenseList({ initialExpenses, trips }: ExpenseListProps) {
  const supabase = createClient()
  const router = useRouter()

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Bulk action states
  const [bulkTripId, setBulkTripId] = useState('')
  const [bulkCategory, setBulkCategory] = useState('')

  // Filter expenses by status
  const filteredExpenses = useMemo(() => {
    if (filterStatus === 'all') return expenses
    return expenses.filter(e => e.status === filterStatus)
  }, [expenses, filterStatus])

  // Count by status
  const counts = useMemo(() => {
    return {
      all: expenses.length,
      draft: expenses.filter(e => e.status === 'draft').length,
      pending: expenses.filter(e => e.status === 'pending').length,
      approved: expenses.filter(e => e.status === 'approved').length,
      rejected: expenses.filter(e => e.status === 'rejected').length,
    }
  }, [expenses])

  const selectedExpenses = Array.from(selectedIds)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredExpenses.map(e => e.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setBulkTripId('')
    setBulkCategory('')
  }

  const handleDelete = async (id: string) => {
    const expense = expenses.find(e => e.id === id)
    if (!expense) return

    if (!confirm('Delete this expense?')) return

    setLoading(true)
    const { error } = await supabase.from('expenses').delete().eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setMessage({ type: 'success', text: 'Expense deleted' })
      router.refresh()
    }
    setLoading(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleBulkUpdate = async () => {
    if (selectedExpenses.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one expense' })
      return
    }

    const updates: Record<string, any> = {}
    if (bulkTripId) updates.trip_id = bulkTripId === 'none' ? null : bulkTripId
    if (bulkCategory) updates.category = bulkCategory

    if (Object.keys(updates).length === 0) {
      setMessage({ type: 'error', text: 'Select a trip or category to update' })
      return
    }

    setLoading(true)
    const { error } = await supabase.from('expenses').update(updates).in('id', selectedExpenses)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setExpenses(prev => prev.map(e =>
        selectedIds.has(e.id) ? { ...e, ...updates } : e
      ))
      setMessage({ type: 'success', text: `Updated ${selectedExpenses.length} expense(s)` })
      clearSelection()
      router.refresh()
    }
    setLoading(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const handleBulkDelete = async () => {
    if (selectedExpenses.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one expense' })
      return
    }

    if (!confirm(`Delete ${selectedExpenses.length} expense(s)?`)) return

    setLoading(true)
    const { error } = await supabase.from('expenses').delete().in('id', selectedExpenses)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setExpenses(prev => prev.filter(e => !selectedIds.has(e.id)))
      setSelectedIds(new Set())
      setMessage({ type: 'success', text: `Deleted ${selectedExpenses.length} expense(s)` })
      router.refresh()
    }
    setLoading(false)
    setTimeout(() => setMessage(null), 3000)
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                filterStatus === key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {label} ({counts[key as keyof typeof counts]})
            </button>
          ))}
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-blue-500 dark:border-blue-400 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {selectedIds.size} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={bulkTripId}
                onChange={(e) => setBulkTripId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="">Assign to trip...</option>
                <option value="none">Remove from trip</option>
                {trips.map(trip => (
                  <option key={trip.id} value={trip.id}>{trip.trip_name}</option>
                ))}
              </select>

              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
              >
                <option value="">Change category...</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBulkUpdate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                Update
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
                  onChange={selectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Approver</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.map(expense => (
              <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(expense.id)}
                    onChange={() => toggleSelect(expense.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {expense.merchant_name || expense.category}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                    {expense.category}{expense.description && ` • ${expense.description}`}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
                  {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(expense.status)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {expense.approver ? (
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{expense.approver.full_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {expense.approved_at && new Date(expense.approved_at).toLocaleDateString()}
                      </div>
                    </div>
                  ) : expense.employee?.manager?.full_name ? (
                    <div className="text-gray-600 dark:text-gray-400 text-xs">
                      {expense.employee.manager.full_name}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/expenses/${expense.id}`}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    <Link
                      href={`/expenses/${expense.id}/edit`}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredExpenses.map(expense => (
          <div key={expense.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.has(expense.id)}
                  onChange={() => toggleSelect(expense.id)}
                  className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {expense.merchant_name || expense.category}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                </div>
                <div className="mt-1">{getStatusBadge(expense.status)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Link href={`/expenses/${expense.id}`} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg">
                  View
                </Link>
                <Link href={`/expenses/${expense.id}/edit`} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg">
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExpenses.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No {filterStatus !== 'all' && filterStatus} expenses found
          </p>
        </div>
      )}
    </div>
  )
}
