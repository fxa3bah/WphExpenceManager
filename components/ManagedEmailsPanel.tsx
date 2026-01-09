'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Manager {
  id: string
  full_name: string
  email: string
  role: string
}

interface ManagedEmail {
  id: string
  email: string
  manager_id: string
}

interface ManagedEmailsPanelProps {
  currentUserId: string
  isAdmin: boolean
  managers: Manager[]
}

const EMAIL_DOMAIN = '@wphome.com'

export default function ManagedEmailsPanel({
  currentUserId,
  isAdmin,
  managers,
}: ManagedEmailsPanelProps) {
  const supabase = createClient()
  const availableManagers = useMemo(
    () => managers.filter((manager) => manager.role === 'manager' || manager.role === 'admin'),
    [managers]
  )
  const initialManagerId =
    (isAdmin ? availableManagers[0]?.id : currentUserId) || currentUserId

  const [selectedManagerId, setSelectedManagerId] = useState(initialManagerId)
  const [managedEmails, setManagedEmails] = useState<ManagedEmail[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedManager = availableManagers.find((manager) => manager.id === selectedManagerId)

  const loadManagedEmails = async (managerId: string) => {
    setLoading(true)
    setError(null)
    setFeedback(null)
    const { data, error: loadError } = await supabase
      .from('manager_allowed_emails')
      .select('id, email, manager_id')
      .eq('manager_id', managerId)
      .order('email')

    if (loadError) {
      setError(loadError.message)
    } else {
      setManagedEmails(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!selectedManagerId) return
    loadManagedEmails(selectedManagerId)
  }, [selectedManagerId])

  const handleAddEmails = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setFeedback(null)

    const emails = inputValue
      .split(/[\n,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)

    if (emails.length === 0) {
      setError('Enter at least one email address.')
      return
    }

    const invalidEmails = emails.filter(
      (email) => !new RegExp(`^[^@\\s]+${EMAIL_DOMAIN.replace('.', '\\.')}$`, 'i').test(email)
    )

    if (invalidEmails.length > 0) {
      setError(`Only ${EMAIL_DOMAIN} email addresses are allowed.`)
      return
    }

    const existingEmails = new Set(managedEmails.map((email) => email.email.toLowerCase()))
    const newEmails = emails.filter((email) => !existingEmails.has(email))

    if (newEmails.length === 0) {
      setError('All of those emails are already assigned.')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase
      .from('manager_allowed_emails')
      .insert(newEmails.map((email) => ({ email, manager_id: selectedManagerId })))

    if (insertError) {
      setError(insertError.message)
    } else {
      setInputValue('')
      setFeedback(`Added ${newEmails.length} email${newEmails.length > 1 ? 's' : ''}.`)
      await loadManagedEmails(selectedManagerId)
    }

    setLoading(false)
  }

  const handleRemove = async (id: string) => {
    setError(null)
    setFeedback(null)
    setLoading(true)

    const { error: deleteError } = await supabase
      .from('manager_allowed_emails')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
    } else {
      setManagedEmails((prev) => prev.filter((email) => email.id !== id))
    }

    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Managed @wphome.com Emails</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add email addresses that should automatically report to this manager when they sign up.
          </p>
        </div>
        {isAdmin && availableManagers.length > 0 && (
          <div className="min-w-[220px]">
            <label className="block text-xs text-gray-500 mb-1">Select manager</label>
            <select
              value={selectedManagerId}
              onChange={(event) => setSelectedManagerId(event.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
            >
              {availableManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name} ({manager.email})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedManager && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Managing for: <span className="font-medium">{selectedManager.full_name}</span>
        </div>
      )}

      <form onSubmit={handleAddEmails} className="mt-4 space-y-3">
        <label className="block text-sm font-medium" htmlFor="managed-emails">
          Add email addresses (comma or line separated)
        </label>
        <textarea
          id="managed-emails"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700"
          placeholder={`name${EMAIL_DOMAIN}\nteam${EMAIL_DOMAIN}`}
        />
        <button
          type="submit"
          disabled={loading || !selectedManagerId}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Add Emails'}
        </button>
      </form>

      {error && (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
      {feedback && (
        <div className="mt-3 text-sm text-green-600 dark:text-green-400">{feedback}</div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2">Currently assigned</h3>
        {managedEmails.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No managed emails yet.</p>
        ) : (
          <ul className="space-y-2">
            {managedEmails.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm"
              >
                <span>{entry.email}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(entry.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={loading}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
