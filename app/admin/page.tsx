import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import ManagerAssignment from '@/components/ManagerAssignment'
import ManagedEmailsPanel from '@/components/ManagedEmailsPanel'
import Link from 'next/link'

export default async function AdminPage() {
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

  // Check if user is admin or manager
  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    redirect('/dashboard')
  }

  // Get all users with their expense stats
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      manager:manager_id(full_name),
      expenses(id, status, amount, submitted_at)
    `)
    .order('full_name')

  // Get all potential managers (managers and admins)
  const { data: managers } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .in('role', ['manager', 'admin'])
    .order('full_name')

  // Calculate stats for each user
  const usersWithStats = users?.map(u => {
    const expenses = u.expenses || []
    return {
      ...u,
      stats: {
        total: expenses.length,
        pending: expenses.filter((e: any) => e.status === 'pending').length,
        approved: expenses.filter((e: any) => e.status === 'approved').length,
        rejected: expenses.filter((e: any) => e.status === 'rejected').length,
        totalAmount: expenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0),
      }
    }
  })

  // Calculate overall stats
  const overallStats = {
    totalUsers: users?.length || 0,
    totalManagers: users?.filter(u => u.role === 'manager').length || 0,
    totalEmployees: users?.filter(u => u.role === 'employee').length || 0,
    totalAdmins: users?.filter(u => u.role === 'admin').length || 0,
    totalPendingExpenses: usersWithStats?.reduce((sum, u) => sum + u.stats.pending, 0) || 0,
    totalApprovedExpenses: usersWithStats?.reduce((sum, u) => sum + u.stats.approved, 0) || 0,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Management & Approval Workflow</h1>
          <Link
            href="/dashboard"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Users</div>
            <div className="text-2xl font-bold">{overallStats.totalUsers}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg shadow p-4">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Admins</div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{overallStats.totalAdmins}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-4">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Managers</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{overallStats.totalManagers}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/20 rounded-lg shadow p-4">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Employees</div>
            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{overallStats.totalEmployees}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow p-4">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Pending</div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{overallStats.totalPendingExpenses}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{overallStats.totalApprovedExpenses}</div>
          </div>
        </div>

        <div className="mb-6">
          <ManagedEmailsPanel
            currentUserId={user.id}
            isAdmin={profile?.role === 'admin'}
            managers={managers || []}
          />
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Expenses
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">
                    Pending
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {usersWithStats?.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{u.full_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ManagerAssignment
                        userId={u.id}
                        currentManagerId={u.manager_id}
                        managers={managers || []}
                        isAdmin={profile?.role === 'admin'}
                        userRole={u.role}
                      />
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold">
                      {u.stats.total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.stats.pending > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-bold">
                          {u.stats.pending}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.stats.approved > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-bold">
                          {u.stats.approved}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.stats.rejected > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-bold">
                          {u.stats.rejected}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">
                      ${u.stats.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.stats.pending > 0 && (
                        <Link
                          href={`/expenses?user=${u.id}&status=pending`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          Review →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-orange-500 rounded-full"></span>
              <span>Pending - Awaiting approval</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Approved - Expense approved</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
              <span>Rejected - Expense rejected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-gray-400 rounded-full"></span>
              <span>Draft - Not submitted</span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
