'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

type Expense = {
  id: string
  expense_date: string
  category: string
  merchant_name: string | null
  amount: string
  currency: string
  description: string | null
  status: string
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

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
}

type Props = {
  trip: Trip
  expenses: Expense[]
  profile: Profile
}

export default function TripTEForm({ trip, expenses, profile }: Props) {
  const [exporting, setExporting] = useState(false)

  // Get date range for the trip
  const startDate = new Date(trip.start_date)
  const endDate = trip.end_date ? new Date(trip.end_date) : new Date()

  // Generate all dates in the trip range
  const tripDates: Date[] = []
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    tripDates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Group expenses by date and category
  const expensesByDate: Record<string, Expense[]> = {}
  expenses.forEach((expense) => {
    const dateKey = new Date(expense.expense_date).toLocaleDateString()
    if (!expensesByDate[dateKey]) {
      expensesByDate[dateKey] = []
    }
    expensesByDate[dateKey].push(expense)
  })

  // Define category groups
  const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Entertainment']
  const travelCategories = [
    'Hotel',
    'Airline/Train Ticket',
    'Tips (other than meals)',
    'Communications',
    'Transportation',
    'Rental Car',
    'Parking and Tolls',
    'Personal Car - Mileage',
    'Other Travel Expenses'
  ]

  // Calculate totals by category and date
  const getCategoryTotal = (category: string, dateKey?: string) => {
    let filtered = expenses.filter(e => e.category === category)
    if (dateKey) {
      filtered = filtered.filter(e =>
        new Date(e.expense_date).toLocaleDateString() === dateKey
      )
    }
    return filtered.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
  }

  const getDateTotal = (dateKey: string) => {
    const dateExpenses = expensesByDate[dateKey] || []
    return dateExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)
  }

  const getMealSubtotal = (dateKey?: string) => {
    return mealCategories.reduce((sum, cat) => sum + getCategoryTotal(cat, dateKey), 0)
  }

  const getTravelSubtotal = (dateKey?: string) => {
    return travelCategories.reduce((sum, cat) => sum + getCategoryTotal(cat, dateKey), 0)
  }

  const grandTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0)

  // Export to Excel
  const handleExport = () => {
    setExporting(true)

    try {
      const wb = XLSX.utils.book_new()

      // Prepare data for Excel
      const data: any[] = []

      // Header
      data.push(['2026 - WestPoint Home LLC. T&E Form'])
      data.push([])
      data.push(['Employee Name:', profile.full_name, '', 'Email Address:', profile.email])
      data.push(['Business Purpose of Trip:', trip.trip_name])
      data.push(['Destination:', trip.destination || ''])
      data.push(['Week Ending:', endDate.toLocaleDateString()])
      data.push([])
      data.push(['Please Note: Receipts For Any Expenditures Over $25 Must Be Included With Your T&E Submission'])
      data.push([])

      // Date headers
      const dateRow = ['Weekday', ...tripDates.map(d => d.toLocaleDateString('en-US', { weekday: 'short' })), 'Totals']
      const dateValueRow = ['Date', ...tripDates.map(d => d.toLocaleDateString()), '']
      data.push(dateRow)
      data.push(dateValueRow)
      data.push([])

      // MEALS/ENTERTAINMENT SECTION
      data.push(['MEALS/ENTERTAINMENT SECTION'])

      mealCategories.forEach(category => {
        const row = [category]
        tripDates.forEach(date => {
          const dateKey = date.toLocaleDateString()
          const total = getCategoryTotal(category, dateKey)
          row.push(total > 0 ? total : '')
        })
        row.push(getCategoryTotal(category))
        data.push(row)
      })

      // Meal subtotal
      const mealSubtotalRow = ['Subtotal (Meals & Entertainment)']
      tripDates.forEach(date => {
        const total = getMealSubtotal(date.toLocaleDateString())
        mealSubtotalRow.push(total > 0 ? total : '')
      })
      mealSubtotalRow.push(getMealSubtotal())
      data.push(mealSubtotalRow)
      data.push([])

      // TRAVEL SECTION
      data.push(['TRAVEL SECTION'])

      travelCategories.forEach(category => {
        const row = [category]
        tripDates.forEach(date => {
          const dateKey = date.toLocaleDateString()
          const total = getCategoryTotal(category, dateKey)
          row.push(total > 0 ? total : '')
        })
        row.push(getCategoryTotal(category))
        data.push(row)
      })

      // Travel subtotal
      const travelSubtotalRow = ['Subtotal (Travel)']
      tripDates.forEach(date => {
        const total = getTravelSubtotal(date.toLocaleDateString())
        travelSubtotalRow.push(total > 0 ? total : '')
      })
      travelSubtotalRow.push(getTravelSubtotal())
      data.push(travelSubtotalRow)
      data.push([])

      // Daily totals
      const dailyTotalRow = ['Daily Totals:']
      tripDates.forEach(date => {
        const total = getDateTotal(date.toLocaleDateString())
        dailyTotalRow.push(total > 0 ? total : '')
      })
      dailyTotalRow.push(grandTotal)
      data.push(dailyTotalRow)
      data.push([])
      data.push(['Total Expenses Due Employee:', '', '', '', '', '', '', grandTotal])

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data)

      // Set column widths
      ws['!cols'] = [
        { wch: 30 },
        ...tripDates.map(() => ({ wch: 12 })),
        { wch: 12 }
      ]

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'T&E Summary')

      // Save file
      XLSX.writeFile(wb, `TE_${trip.trip_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Export Button */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <h2 className="text-xl font-bold">T&E Expense Summary</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Exporting...' : 'Export to Excel'}
        </button>
      </div>

      {/* T&E Form Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left font-semibold border border-gray-300 dark:border-gray-600">
                Category
              </th>
              {tripDates.map((date, idx) => (
                <th key={idx} className="px-3 py-2 text-center font-semibold border border-gray-300 dark:border-gray-600 min-w-[100px]">
                  <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-xs font-normal">{date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                </th>
              ))}
              <th className="px-4 py-2 text-right font-semibold border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
                Totals
              </th>
            </tr>
          </thead>
          <tbody>
            {/* MEALS/ENTERTAINMENT SECTION */}
            <tr className="bg-blue-100 dark:bg-blue-900/30">
              <td colSpan={tripDates.length + 2} className="px-4 py-2 font-bold border border-gray-300 dark:border-gray-600">
                MEALS/ENTERTAINMENT SECTION
              </td>
            </tr>

            {mealCategories.map((category) => {
              const categoryTotal = getCategoryTotal(category)
              if (categoryTotal === 0) return null

              return (
                <tr key={category} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">{category}</td>
                  {tripDates.map((date, idx) => {
                    const dateKey = date.toLocaleDateString()
                    const amount = getCategoryTotal(category, dateKey)
                    return (
                      <td key={idx} className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600">
                        {amount > 0 ? `$${amount.toFixed(2)}` : '-'}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right font-semibold border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
                    ${categoryTotal.toFixed(2)}
                  </td>
                </tr>
              )
            })}

            {/* Meals Subtotal */}
            <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">Subtotal (Acct. 530-003)</td>
              {tripDates.map((date, idx) => {
                const total = getMealSubtotal(date.toLocaleDateString())
                return (
                  <td key={idx} className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600">
                    {total > 0 ? `$${total.toFixed(2)}` : '-'}
                  </td>
                )
              })}
              <td className="px-4 py-2 text-right border border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/20">
                ${getMealSubtotal().toFixed(2)}
              </td>
            </tr>

            {/* TRAVEL SECTION */}
            <tr className="bg-green-100 dark:bg-green-900/30">
              <td colSpan={tripDates.length + 2} className="px-4 py-2 font-bold border border-gray-300 dark:border-gray-600">
                TRAVEL SECTION
              </td>
            </tr>

            {travelCategories.map((category) => {
              const categoryTotal = getCategoryTotal(category)
              if (categoryTotal === 0) return null

              return (
                <tr key={category} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">{category}</td>
                  {tripDates.map((date, idx) => {
                    const dateKey = date.toLocaleDateString()
                    const amount = getCategoryTotal(category, dateKey)
                    return (
                      <td key={idx} className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600">
                        {amount > 0 ? `$${amount.toFixed(2)}` : '-'}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right font-semibold border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20">
                    ${categoryTotal.toFixed(2)}
                  </td>
                </tr>
              )
            })}

            {/* Travel Subtotal */}
            <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
              <td className="px-4 py-2 border border-gray-300 dark:border-gray-600">Subtotal (Acct. 530-002)</td>
              {tripDates.map((date, idx) => {
                const total = getTravelSubtotal(date.toLocaleDateString())
                return (
                  <td key={idx} className="px-3 py-2 text-right border border-gray-300 dark:border-gray-600">
                    {total > 0 ? `$${total.toFixed(2)}` : '-'}
                  </td>
                )
              })}
              <td className="px-4 py-2 text-right border border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-900/20">
                ${getTravelSubtotal().toFixed(2)}
              </td>
            </tr>

            {/* Daily Totals */}
            <tr className="bg-yellow-100 dark:bg-yellow-900/30 font-bold text-lg">
              <td className="px-4 py-3 border border-gray-300 dark:border-gray-600">Daily Totals:</td>
              {tripDates.map((date, idx) => {
                const total = getDateTotal(date.toLocaleDateString())
                return (
                  <td key={idx} className="px-3 py-3 text-right border border-gray-300 dark:border-gray-600">
                    {total > 0 ? `$${total.toFixed(2)}` : '-'}
                  </td>
                )
              })}
              <td className="px-4 py-3 text-right border border-gray-300 dark:border-gray-600 bg-yellow-200 dark:bg-yellow-900/40">
                ${grandTotal.toFixed(2)}
              </td>
            </tr>

            {/* Grand Total Row */}
            <tr className="bg-blue-600 text-white font-bold text-xl">
              <td colSpan={tripDates.length + 1} className="px-4 py-4 text-right border border-gray-300 dark:border-gray-600">
                Total Expenses Due Employee:
              </td>
              <td className="px-4 py-4 text-right border border-gray-300 dark:border-gray-600">
                ${grandTotal.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {expenses.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No expenses found for this trip</p>
          <a
            href="/expenses/new"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Add Expense
          </a>
        </div>
      )}
    </div>
  )
}
