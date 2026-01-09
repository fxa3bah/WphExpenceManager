'use client'

import { useState } from 'react'
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

type Props = {
  expenses: Expense[]
  trips: Trip[]
}

export default function ExpenseTable({ expenses, trips }: Props) {
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set())

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips)
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId)
    } else {
      newExpanded.add(tripId)
    }
    setExpandedTrips(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
      case 'pending':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
      case 'rejected':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      default: // draft
        return 'bg-gray-50 dark:bg-gray-700/20 text-gray-700 dark:text-gray-300'
    }
  }

  const getRowColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'hover:bg-green-50/50 dark:hover:bg-green-900/10'
      case 'pending':
        return 'hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
      case 'rejected':
        return 'hover:bg-red-50/50 dark:hover:bg-red-900/10'
      default:
        return 'hover:bg-gray-50 dark:hover:bg-gray-800'
    }
  }

  // Group expenses by trip
  const expensesByTrip = expenses.reduce((acc, expense) => {
    const key = expense.trip_id || 'no-trip'
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  // Sort trips by start date
  const sortedTripIds = Object.keys(expensesByTrip).sort((a, b) => {
    if (a === 'no-trip') return 1
    if (b === 'no-trip') return -1
    const tripA = trips.find(t => t.id === a)
    const tripB = trips.find(t => t.id === b)
    return new Date(tripB?.start_date || 0).getTime() - new Date(tripA?.start_date || 0).getTime()
  })

  const renderExpenseRow = (expense: Expense) => (
    <tr key={expense.id} className={`transition ${getRowColor(expense.status)}`}>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        {new Date(expense.expense_date).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="font-medium">
          {expense.merchant_name || expense.category}
        </div>
        {expense.description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {expense.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold">
        {expense.currency} {parseFloat(expense.amount).toFixed(2)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {expense.approver?.full_name ? (
          <div>
            <div className="font-medium">{expense.approver.full_name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {expense.approver.email}
            </div>
          </div>
        ) : expense.employee?.manager?.full_name ? (
          <div className="text-gray-600 dark:text-gray-400">
            <div>{expense.employee.manager.full_name}</div>
            <div className="text-xs">(Pending)</div>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs">
            No manager assigned
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        {expense.approved_at ? (
          new Date(expense.approved_at).toLocaleDateString()
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
        <Link
          href={`/expenses/${expense.id}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          View
        </Link>
      </td>
    </tr>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Merchant/Category
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Approver
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Approved Date
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTripIds.map((tripId) => {
              const trip = trips.find(t => t.id === tripId)
              const tripExpenses = expensesByTrip[tripId]
              const isExpanded = expandedTrips.has(tripId)
              const tripTotal = tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

              return (
                <tbody key={tripId} className="border-t-2 border-gray-300 dark:border-gray-600">
                  {/* Trip Header Row */}
                  <tr
                    className="bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
                    onClick={() => trip && toggleTrip(tripId)}
                  >
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {trip && (
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            <span className="font-semibold text-blue-900 dark:text-blue-100">
                              {trip ? trip.trip_name : 'Individual Expenses (No Trip)'}
                            </span>
                            {trip && trip.destination && (
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                • {trip.destination}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {tripExpenses.length} expense{tripExpenses.length !== 1 ? 's' : ''}
                          </span>
                          <span className="font-semibold text-blue-900 dark:text-blue-100">
                            Total: ${tripTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Expense Rows (Expandable) */}
                  {(!trip || isExpanded) && tripExpenses.map(renderExpenseRow)}
                </tbody>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y-2 divide-gray-300 dark:divide-gray-600">
        {sortedTripIds.map((tripId) => {
          const trip = trips.find(t => t.id === tripId)
          const tripExpenses = expensesByTrip[tripId]
          const isExpanded = expandedTrips.has(tripId)
          const tripTotal = tripExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

          return (
            <div key={tripId} className="border-b border-gray-200 dark:border-gray-700">
              {/* Trip Header */}
              <div
                className="bg-blue-50 dark:bg-blue-900/20 p-4 cursor-pointer"
                onClick={() => trip && toggleTrip(tripId)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    {trip && (
                      <svg
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-blue-100">
                        {trip ? trip.trip_name : 'Individual Expenses'}
                      </div>
                      {trip && trip.destination && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {trip.destination}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      ${tripTotal.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {tripExpenses.length} item{tripExpenses.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Cards */}
              {(!trip || isExpanded) && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tripExpenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/expenses/${expense.id}`}
                      className={`block p-4 transition ${getRowColor(expense.status)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-base">
                            {expense.merchant_name || expense.category}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(expense.expense_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {expense.currency} {parseFloat(expense.amount).toFixed(2)}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                            {expense.status}
                          </span>
                        </div>
                      </div>

                      {(expense.approver?.full_name || expense.employee?.manager?.full_name) && (
                        <div className="text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-gray-600 dark:text-gray-400">Approver: </span>
                          <span className="font-medium">
                            {expense.approver?.full_name || expense.employee?.manager?.full_name}
                          </span>
                          {expense.approved_at && (
                            <span className="text-gray-500 dark:text-gray-500 ml-2">
                              • {new Date(expense.approved_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
