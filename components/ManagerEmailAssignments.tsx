'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface EmailAssignment {
  id: string
  employee_email: string
  created_at: string
  assigned_at: string | null
}

interface ManagerEmailAssignmentsProps {
  managerId: string
  managerName: string
  isAdmin: boolean
}

export default function ManagerEmailAssignments({
  managerId,
  managerName,
  isAdmin,
}: ManagerEmailAssignmentsProps) {
  const [assignments, setAssignments] = useState<EmailAssignment[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadAssignments()
  }, [managerId])

  async function loadAssignments() {
    const { data, error } = await supabase
      .from('manager_email_assignments')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })

    if (data) setAssignments(data)
    if (error) console.error('Error loading assignments:', error)
  }

  async function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate email
    const emailLower = newEmail.toLowerCase().trim()
    if (!emailLower.endsWith('@wphome.com')) {
      setError('Email must be a @wphome.com address')
      return
    }

    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('manager_email_assignments')
        .insert({
          manager_id: managerId,
          employee_email: emailLower,
        })

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          setError('This email is already assigned to a manager')
        } else {
          throw insertError
        }
        return
      }

      setSuccess(`Successfully added ${emailLower}`)
      setNewEmail('')
      loadAssignments()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to add email')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteEmail(assignmentId: string, email: string) {
    if (!confirm(`Remove ${email} from your managed list?`)) return

    try {
      const { error } = await supabase
        .from('manager_email_assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error

      setSuccess(`Removed ${email}`)
      loadAssignments()
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to remove email')
    }
  }

  const pendingAssignments = assignments.filter((a) => !a.assigned_at)
  const assignedEmails = assignments.filter((a) => a.assigned_at)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        Manage Team Email Assignments {!isAdmin && `for ${managerName}`}
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Add email addresses of employees who report to this manager. When they sign up, they'll automatically be assigned to this manager.
      </p>

      {/* Add Email Form */}
      <form onSubmit={handleAddEmail} className="mb-6">
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="employee@wphome.com"
            required
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium whitespace-nowrap"
          >
            {loading ? 'Adding...' : 'Add Email'}
          </button>
        </div>
      </form>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Pending Signups</div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {pendingAssignments.length}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1">Active Assignments</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {assignedEmails.length}
          </div>
        </div>
      </div>

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Pending Signups ({pendingAssignments.length})
          </h3>
          <div className="space-y-2">
            {pendingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium">{assignment.employee_email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Added {new Date(assignment.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEmail(assignment.id, assignment.employee_email)}
                  className="text-xs px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Emails */}
      {assignedEmails.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Active Assignments ({assignedEmails.length})
          </h3>
          <div className="space-y-2">
            {assignedEmails.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium">{assignment.employee_email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Signed up {new Date(assignment.assigned_at!).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-xs px-3 py-1 bg-green-600 text-white rounded">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No email assignments yet.</p>
          <p className="text-xs mt-1">Add email addresses above to get started.</p>
        </div>
      )}
    </div>
  )
}
