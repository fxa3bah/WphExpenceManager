'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface ApprovalListProps {
  initialExpenses: any[]
  userRole: string
  userId: string
}

export default function ApprovalList({ initialExpenses, userRole, userId }: ApprovalListProps) {
  const router = useRouter()
  const supabase = createClient()

  const [expenses, setExpenses] = useState(initialExpenses)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (expenseId: string) => {
    if (!window.confirm('Approve this expense?')) return

    setLoading(expenseId)
    setError(null)

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', expenseId)

    if (updateError) {
      setError(updateError.message)
      setLoading(null)
      return
    }

    // Remove from list
    setExpenses(expenses.filter(e => e.id !== expenseId))
    setLoading(null)
    router.refresh()
  }

  const handleReject = async (expenseId: string) => {
    const reason = window.prompt('Reason for rejection (optional):')
    if (reason === null) return // User cancelled

    setLoading(expenseId)
    setError(null)

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || 'No reason provided',
      })
      .eq('id', expenseId)

    if (updateError) {
      setError(updateError.message)
      setLoading(null)
      return
    }

    // Remove from list
    setExpenses(expenses.filter(e => e.id !== expenseId))
    setLoading(null)
    router.refresh()
  }

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">No pending approvals</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          All expenses have been reviewed
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition"
        >
          {/* Expense Details */}
          <div className="p-4">
            {/* Header: Employee name and amount */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-lg">{expense.users?.full_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {expense.users?.email}
                  {expense.users?.role && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {expense.users.role}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{expense.currency} {expense.amount}</div>
              </div>
            </div>

            {/* Expense Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Category</div>
                <div className="font-medium">{expense.category}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Date</div>
                <div className="font-medium">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </div>
              </div>
              {expense.merchant_name && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Merchant</div>
                  <div className="font-medium">{expense.merchant_name}</div>
                </div>
              )}
              {expense.submitted_at && (
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Submitted</div>
                  <div className="font-medium">
                    {new Date(expense.submitted_at).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {expense.description && (
              <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                <div className="text-gray-500 dark:text-gray-400 mb-1">Description:</div>
                <div>{expense.description}</div>
              </div>
            )}

            {/* Entertainment headcount */}
            {expense.category === 'Entertainment' && expense.entertainment_headcount && (
              <div className="mb-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">People entertained: </span>
                <span className="font-medium">{expense.entertainment_headcount}</span>
              </div>
            )}

            {/* Receipt */}
            {expense.receipt_url && (
              <div className="mb-3">
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Receipt
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t dark:border-gray-700">
              <Link
                href={`/expenses/${expense.id}`}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-center py-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium text-sm"
              >
                View Details
              </Link>
              <button
                onClick={() => handleReject(expense.id)}
                disabled={loading === expense.id}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium text-sm"
              >
                {loading === expense.id ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => handleApprove(expense.id)}
                disabled={loading === expense.id}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium text-sm"
              >
                {loading === expense.id ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
