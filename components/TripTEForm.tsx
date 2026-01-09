'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [exportingPDF, setExportingPDF] = useState(false)

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
        const row: any[] = [category]
        tripDates.forEach(date => {
          const dateKey = date.toLocaleDateString()
          const total = getCategoryTotal(category, dateKey)
          row.push(total > 0 ? total : '')
        })
        row.push(getCategoryTotal(category))
        data.push(row)
      })

      // Meal subtotal
      const mealSubtotalRow: any[] = ['Subtotal (Meals & Entertainment)']
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
        const row: any[] = [category]
        tripDates.forEach(date => {
          const dateKey = date.toLocaleDateString()
          const total = getCategoryTotal(category, dateKey)
          row.push(total > 0 ? total : '')
        })
        row.push(getCategoryTotal(category))
        data.push(row)
      })

      // Travel subtotal
      const travelSubtotalRow: any[] = ['Subtotal (Travel)']
      tripDates.forEach(date => {
        const total = getTravelSubtotal(date.toLocaleDateString())
        travelSubtotalRow.push(total > 0 ? total : '')
      })
      travelSubtotalRow.push(getTravelSubtotal())
      data.push(travelSubtotalRow)
      data.push([])

      // Daily totals
      const dailyTotalRow: any[] = ['Daily Totals:']
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

  // Export to PDF with WestPoint Home branding
  const handleExportPDF = () => {
    setExportingPDF(true)

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')

      // WestPoint Home Branding - Header
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Brand colors
      const primaryBlue = [0, 71, 171] // WestPoint Home Blue
      const accentGold = [218, 165, 32] // Gold accent

      // Header Background
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
      doc.rect(0, 0, pageWidth, 35, 'F')

      // Company Name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('WESTPOINT HOME LLC', pageWidth / 2, 15, { align: 'center' })

      // Subtitle
      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.text('Travel & Entertainment Expense Report', pageWidth / 2, 25, { align: 'center' })

      // Gold accent line
      doc.setDrawColor(accentGold[0], accentGold[1], accentGold[2])
      doc.setLineWidth(2)
      doc.line(15, 32, pageWidth - 15, 32)

      // Employee Information Box
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')

      let yPos = 42

      // Info box with light background
      doc.setFillColor(240, 248, 255) // Light blue
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F')

      yPos += 5
      doc.text(`Employee Name: ${profile.full_name}`, 20, yPos)
      doc.text(`Email: ${profile.email}`, pageWidth / 2 + 10, yPos)

      yPos += 6
      doc.text(`Trip Purpose: ${trip.trip_name}`, 20, yPos)

      yPos += 6
      doc.text(`Destination: ${trip.destination || 'N/A'}`, 20, yPos)
      doc.text(`Week Ending: ${endDate.toLocaleDateString()}`, pageWidth / 2 + 10, yPos)

      yPos += 10

      // Build table data
      const tableHeaders = [
        ['Category', ...tripDates.map(d =>
          `${d.toLocaleDateString('en-US', { weekday: 'short' })}\n${d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`
        ), 'Total']
      ]

      const tableData: any[] = []

      // MEALS/ENTERTAINMENT SECTION
      tableData.push([{
        content: 'MEALS/ENTERTAINMENT SECTION',
        colSpan: tripDates.length + 2,
        styles: { fillColor: [100, 149, 237], textColor: 255, fontStyle: 'bold', halign: 'left' }
      }])

      mealCategories.forEach(category => {
        const categoryTotal = getCategoryTotal(category)
        if (categoryTotal > 0) {
          const row = [category]
          tripDates.forEach(date => {
            const dateKey = date.toLocaleDateString()
            const amount = getCategoryTotal(category, dateKey)
            row.push(amount > 0 ? `$${amount.toFixed(2)}` : '-')
          })
          row.push(`$${categoryTotal.toFixed(2)}`)
          tableData.push(row)
        }
      })

      // Meals subtotal
      const mealSubtotal = getMealSubtotal()
      const mealSubtotalRow = ['Subtotal (Acct. 530-003)']
      tripDates.forEach(date => {
        const total = getMealSubtotal(date.toLocaleDateString())
        mealSubtotalRow.push(total > 0 ? `$${total.toFixed(2)}` : '-')
      })
      mealSubtotalRow.push(`$${mealSubtotal.toFixed(2)}`)
      tableData.push([{
        content: mealSubtotalRow,
        styles: { fillColor: [230, 230, 250], fontStyle: 'bold' }
      }])

      // TRAVEL SECTION
      tableData.push([{
        content: 'TRAVEL SECTION',
        colSpan: tripDates.length + 2,
        styles: { fillColor: [60, 179, 113], textColor: 255, fontStyle: 'bold', halign: 'left' }
      }])

      travelCategories.forEach(category => {
        const categoryTotal = getCategoryTotal(category)
        if (categoryTotal > 0) {
          const row = [category]
          tripDates.forEach(date => {
            const dateKey = date.toLocaleDateString()
            const amount = getCategoryTotal(category, dateKey)
            row.push(amount > 0 ? `$${amount.toFixed(2)}` : '-')
          })
          row.push(`$${categoryTotal.toFixed(2)}`)
          tableData.push(row)
        }
      })

      // Travel subtotal
      const travelSubtotal = getTravelSubtotal()
      const travelSubtotalRow = ['Subtotal (Acct. 530-002)']
      tripDates.forEach(date => {
        const total = getTravelSubtotal(date.toLocaleDateString())
        travelSubtotalRow.push(total > 0 ? `$${total.toFixed(2)}` : '-')
      })
      travelSubtotalRow.push(`$${travelSubtotal.toFixed(2)}`)
      tableData.push([{
        content: travelSubtotalRow,
        styles: { fillColor: [230, 250, 230], fontStyle: 'bold' }
      }])

      // Daily totals
      const dailyTotalRowData = ['DAILY TOTALS']
      tripDates.forEach(date => {
        const total = getDateTotal(date.toLocaleDateString())
        dailyTotalRowData.push(total > 0 ? `$${total.toFixed(2)}` : '-')
      })
      dailyTotalRowData.push(`$${grandTotal.toFixed(2)}`)
      tableData.push([{
        content: dailyTotalRowData,
        styles: { fillColor: [255, 250, 205], fontStyle: 'bold', fontSize: 11 }
      }])

      // Generate table
      autoTable(doc, {
        startY: yPos,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'normal' },
          [tripDates.length + 1]: { fillColor: [255, 250, 240], fontStyle: 'bold', halign: 'right' }
        },
        didParseCell: (data) => {
          // Right align all number columns
          if (data.column.index > 0) {
            data.cell.styles.halign = 'right'
          }
        },
      })

      // Footer - Grand Total
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 50

      if (finalY < pageHeight - 30) {
        doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2])
        doc.roundedRect(15, finalY + 5, pageWidth - 30, 15, 2, 2, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL EXPENSES DUE EMPLOYEE:', 20, finalY + 13)
        doc.text(`$${grandTotal.toFixed(2)}`, pageWidth - 20, finalY + 13, { align: 'right' })
      }

      // Footer - Page info
      doc.setTextColor(128, 128, 128)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const footerText = `Generated on ${new Date().toLocaleDateString()} | Please attach receipts for expenses over $25`
      doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })

      // Save PDF
      doc.save(`TE_${trip.trip_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF Export error:', error)
      alert('Failed to export PDF. Please try again.')
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Export Buttons */}
      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <h2 className="text-xl font-bold">T&E Expense Summary</h2>
        <div className="flex gap-3">
          <button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {exportingPDF ? 'Exporting...' : 'Export to PDF'}
          </button>
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
