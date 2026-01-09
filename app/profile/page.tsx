import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import LogoutButton from '@/components/LogoutButton'
import ManagerSelector from '@/components/ManagerSelector'
import Link from 'next/link'

// Disable caching for this page to ensure real-time data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*, manager:manager_id(full_name, email)')
    .eq('id', user.id)
    .single()

  // Get expense stats
  const { data: expenses } = await supabase
    .from('expenses')
    .select('status, amount')
    .eq('user_id', user.id)

  const stats = {
    total: expenses?.length || 0,
    pending: expenses?.filter(e => e.status === 'pending').length || 0,
    approved: expenses?.filter(e => e.status === 'approved').length || 0,
    totalAmount: expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                profile?.role === 'ceo' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                profile?.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                profile?.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {profile?.role === 'ceo' ? 'CEO' : profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1)}
              </span>
            </div>
          </div>

          {/* Manager Selector - Not needed for CEO */}
          {profile?.role !== 'ceo' && (
            <ManagerSelector
              userId={user.id}
              currentManagerId={profile?.manager_id || null}
              currentManagerName={profile?.manager?.full_name}
              currentManagerEmail={profile?.manager?.email}
            />
          )}

          {/* Stats */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="font-semibold mb-3">Expense Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
                <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          {(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'ceo') && (
            <>
              <Link
                href="/approvals"
                className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <div>
                      <div className="font-semibold">Pending Approvals</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Review expense submissions</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              <Link
                href="/admin"
                className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <div>
                      <div className="font-semibold">User Management</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Manage team members</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </>
          )}
        </div>

        {/* Logout */}
        <LogoutButton />
      </div>

      <BottomNav />
    </div>
  )
}
