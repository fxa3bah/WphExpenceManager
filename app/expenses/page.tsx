import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import FAB from '@/components/FAB'
import Link from 'next/link'

export default async function ExpensesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all expenses for the user
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('expense_date', { ascending: false })

  // Group expenses by status
  const groupedExpenses = {
    draft: expenses?.filter(e => e.status === 'draft') || [],
    pending: expenses?.filter(e => e.status === 'pending') || [],
    approved: expenses?.filter(e => e.status === 'approved') || [],
    rejected: expenses?.filter(e => e.status === 'rejected') || [],
  }

  const renderExpenseCard = (expense: any) => (
    <Link
      key={expense.id}
      href={`/expenses/${expense.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{expense.merchant_name || expense.category}</div>
        <div className="text-lg font-bold">{expense.currency} {expense.amount}</div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600 dark:text-gray-400">
          {new Date(expense.expense_date).toLocaleDateString()}
        </div>
        {expense.trip_id && (
          <div className="text-blue-600 dark:text-blue-400 text-xs">
            📍 Trip
          </div>
        )}
      </div>
      {expense.description && (
        <div className="text-sm text-gray-500 dark:text-gray-500 mt-2 truncate">
          {expense.description}
        </div>
      )}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold mb-6">My Expenses</h1>

        {/* Pending */}
        {groupedExpenses.pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
              Pending Approval ({groupedExpenses.pending.length})
            </h2>
            <div className="space-y-3">
              {groupedExpenses.pending.map(renderExpenseCard)}
            </div>
          </div>
        )}

        {/* Drafts */}
        {groupedExpenses.draft.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              Drafts ({groupedExpenses.draft.length})
            </h2>
            <div className="space-y-3">
              {groupedExpenses.draft.map(renderExpenseCard)}
            </div>
          </div>
        )}

        {/* Approved */}
        {groupedExpenses.approved.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Approved ({groupedExpenses.approved.length})
            </h2>
            <div className="space-y-3">
              {groupedExpenses.approved.map(renderExpenseCard)}
            </div>
          </div>
        )}

        {/* Rejected */}
        {groupedExpenses.rejected.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              Rejected ({groupedExpenses.rejected.length})
            </h2>
            <div className="space-y-3">
              {groupedExpenses.rejected.map(renderExpenseCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!expenses || expenses.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">No expenses yet</p>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Start tracking your expenses by adding your first one</p>
            <Link href="/expenses/new" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
              Add Expense
            </Link>
          </div>
        )}
      </div>

      <FAB />
      <BottomNav />
    </div>
  )
}
