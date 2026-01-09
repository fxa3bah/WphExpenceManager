import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import FAB from '@/components/FAB'
import ExpenseMaintenancePanel from '@/components/ExpenseMaintenancePanel'
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

  // Get all expenses for the user with approver information
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      employee:user_id(full_name, email, manager_id, manager:manager_id(full_name)),
      approver:approved_by(full_name, email)
    `)
    .eq('user_id', user.id)
    .order('expense_date', { ascending: false })

  // Get all trips for the user
  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Expenses</h1>
          <Link
            href="/expenses/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + New Expense
          </Link>
        </div>

        {expenses && expenses.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Tip:</span> Click on trip headers to expand/collapse expenses
            </div>
            <ExpenseMaintenancePanel initialExpenses={expenses} trips={trips || []} />
          </>
        ) : (
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
