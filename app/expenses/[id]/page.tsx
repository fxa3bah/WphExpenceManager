import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import ApprovalActions from '@/components/ApprovalActions'
import Image from 'next/image'

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { id } = await params

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

  // Get expense details
  const { data: expense } = await supabase
    .from('expenses')
    .select('*, users:user_id(full_name, email, manager_id)')
    .eq('id', id)
    .single()

  if (!expense) {
    redirect('/dashboard')
  }

  // Check if user can approve (is the manager or admin)
  const canApprove = profile?.role === 'admin' ||
    (profile?.role === 'manager' && expense.users?.manager_id === user.id)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Receipt Image */}
          {expense.receipt_url && (
            <div className="relative w-full h-64 bg-gray-100 dark:bg-gray-700">
              <Image
                src={expense.receipt_url}
                alt="Receipt"
                fill
                className="object-contain"
              />
            </div>
          )}

          {/* Expense Details */}
          <div className="p-6 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Expense Details</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                expense.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                expense.status === 'pending' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                expense.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
              </span>
            </div>

            {/* Employee Info */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Employee</div>
              <div className="font-medium">{expense.users?.full_name}</div>
              <div className="text-sm text-gray-500">{expense.users?.email}</div>
            </div>

            {/* Amount */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Amount</div>
              <div className="text-3xl font-bold">{expense.currency} {expense.amount}</div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Category</div>
                <div className="font-medium">{expense.category}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Date</div>
                <div className="font-medium">{new Date(expense.expense_date).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Merchant */}
            {expense.merchant_name && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Merchant</div>
                <div className="font-medium">{expense.merchant_name}</div>
              </div>
            )}

            {/* Location */}
            {expense.location && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Location</div>
                <div className="font-medium">{expense.location}</div>
              </div>
            )}

            {/* Description */}
            {expense.description && (
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Description</div>
                <div className="font-medium">{expense.description}</div>
              </div>
            )}

            {/* Rejection Reason */}
            {expense.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Rejection Reason</div>
                <div className="text-red-600 dark:text-red-400">{expense.rejection_reason}</div>
              </div>
            )}

            {/* Approval Info */}
            {expense.approved_at && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Approved on {new Date(expense.approved_at).toLocaleString()}
              </div>
            )}

            {/* Approval Actions */}
            {canApprove && expense.status === 'pending' && (
              <ApprovalActions expenseId={expense.id} />
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
