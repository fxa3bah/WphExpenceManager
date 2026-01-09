import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ApprovalList from '@/components/ApprovalList'
import BottomNav from '@/components/BottomNav'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ApprovalsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('*, manager:manager_id(full_name, email)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/dashboard')
  }

  // Only managers, admins, and CEO can access this page
  if (profile.role !== 'manager' && profile.role !== 'admin' && profile.role !== 'ceo') {
    redirect('/dashboard')
  }

  // Get pending expenses based on role
  let pendingExpenses: any[] = []

  if (profile.role === 'manager') {
    // For managers: get pending expenses from direct reports only
    const { data: reports } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('manager_id', user.id)

    const reportIds = reports?.map(r => r.id) || []

    if (reportIds.length > 0) {
      const { data } = await supabase
        .from('expenses')
        .select('*, users:user_id(full_name, email, role)')
        .eq('status', 'pending')
        .in('user_id', reportIds)
        .order('submitted_at', { ascending: true })

      pendingExpenses = data || []
    }
  } else {
    // For admins and CEO: get all pending expenses
    const { data } = await supabase
      .from('expenses')
      .select('*, users:user_id(full_name, email, role)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })

    pendingExpenses = data || []
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pending Approvals</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {profile.role === 'ceo'
              ? 'CEO - Review and approve all company expenses'
              : profile.role === 'admin'
              ? 'Admin - Review and approve all pending expenses'
              : `Manager - Review expenses from your ${pendingExpenses.length} direct reports`}
          </p>
        </div>

        {/* Pending Count Badge */}
        {pendingExpenses.length > 0 && (
          <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 rounded-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="font-semibold text-orange-900 dark:text-orange-200">
                  {pendingExpenses.length} {pendingExpenses.length === 1 ? 'expense' : 'expenses'} awaiting your approval
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  Please review and take action on pending submissions
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval List */}
        <ApprovalList
          initialExpenses={pendingExpenses}
          userRole={profile.role}
          userId={user.id}
        />
      </div>

      <BottomNav />
    </div>
  )
}
