import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import FAB from '@/components/FAB'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Run all queries in parallel for faster loading
  const [
    { data: profile },
    { data: expenses }
  ] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single(),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  // Get pending expenses for managers/admins (only if needed)
  let pendingApprovals: any[] = []
  if (profile?.role === 'manager' || profile?.role === 'admin') {
    if (profile.role === 'manager') {
      // For managers: get reports first, then pending expenses
      const { data: reports } = await supabase
        .from('users')
        .select('id')
        .eq('manager_id', user.id)

      const reportIds = reports?.map(r => r.id) || []
      if (reportIds.length > 0) {
        const { data } = await supabase
          .from('expenses')
          .select('*, users:user_id(full_name, email)')
          .eq('status', 'pending')
          .in('user_id', reportIds)
          .order('submitted_at', { ascending: true })

        pendingApprovals = data || []
      }
    } else {
      // For admins: get all pending
      const { data } = await supabase
        .from('expenses')
        .select('*, users:user_id(full_name, email)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })

      pendingApprovals = data || []
    }
  }

  // Calculate stats
  const totalPending = expenses?.filter(e => e.status === 'pending').length || 0
  const totalApproved = expenses?.filter(e => e.status === 'approved').length || 0
  const totalDraft = expenses?.filter(e => e.status === 'draft').length || 0
  const thisMonthTotal = expenses?.reduce((sum, e) => {
    const expenseDate = new Date(e.expense_date)
    const now = new Date()
    if (expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()) {
      return sum + parseFloat(e.amount || 0)
    }
    return sum
  }, 0) || 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {profile?.role === 'admin' ? 'Admin Dashboard' : profile?.role === 'manager' ? 'Manager Dashboard' : 'Track your expenses'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</div>
            <div className="text-2xl font-bold">${thisMonthTotal.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-orange-600">{totalPending}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-600">{totalApproved}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Drafts</div>
            <div className="text-2xl font-bold text-gray-600">{totalDraft}</div>
          </div>
        </div>

        {/* Pending Approvals for Managers/Admins */}
        {pendingApprovals.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Pending Approvals</h2>
              <Link href="/expenses?tab=approvals" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {pendingApprovals.slice(0, 5).map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{expense.users?.full_name}</div>
                    <div className="text-lg font-bold">${expense.amount}</div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {expense.category} • {expense.merchant_name || 'No merchant'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(expense.expense_date).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Expenses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Recent Expenses</h2>
            <Link href="/expenses" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          {expenses && expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{expense.merchant_name || expense.category}</div>
                    <div className="text-lg font-bold">{expense.currency} {expense.amount}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(expense.expense_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        expense.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        expense.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        expense.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">No expenses yet</p>
              <Link href="/expenses/new" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Add your first expense
              </Link>
            </div>
          )}
        </div>
      </div>

      <FAB />
      <BottomNav />
    </div>
  )
}
