'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Manager {
  id: string
  full_name: string
  email: string
  role: string
}

interface ManagerSelectorProps {
  userId: string
  currentManagerId: string | null
  currentManagerName?: string
  currentManagerEmail?: string
}

export default function ManagerSelector({
  userId,
  currentManagerId,
  currentManagerName,
  currentManagerEmail,
}: ManagerSelectorProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isEditing, setIsEditing] = useState(false)
  const [managerEmail, setManagerEmail] = useState('')
  const [availableManagers, setAvailableManagers] = useState<Manager[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState(currentManagerId || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isEditing) {
      loadAvailableManagers()
    }
  }, [isEditing])

  const loadAvailableManagers = async () => {
    // Load all users except the current user
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .neq('id', userId)
      .order('full_name')

    if (data) {
      setAvailableManagers(data)
    }
  }

  const handleSave = async () => {
    if (!selectedManagerId) {
      setMessage({ type: 'error', text: 'Please select a manager' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({ manager_id: selectedManagerId })
        .eq('id', userId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Manager assigned successfully!' })
      setTimeout(() => {
        router.refresh()
        setIsEditing(false)
      }, 1500)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSearchByEmail = async () => {
    if (!managerEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('email', managerEmail.toLowerCase().trim())
        .neq('id', userId)
        .single()

      if (error || !data) {
        setMessage({ type: 'error', text: 'User not found. Make sure they have signed up first.' })
        setLoading(false)
        return
      }

      setSelectedManagerId(data.id)
      setMessage({ type: 'success', text: `Found: ${data.full_name} (${data.email})` })
    } catch (error: any) {
      setMessage({ type: 'error', text: 'User not found' })
    } finally {
      setLoading(false)
    }
  }

  const filteredManagers = availableManagers.filter(m =>
    m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isEditing) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Manager Assignment</h3>
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {currentManagerId ? 'Change Manager' : 'Assign Manager'}
          </button>
        </div>

        {currentManagerName ? (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reports to</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{currentManagerName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{currentManagerEmail}</div>
          </div>
        ) : (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  No manager assigned
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Assign your manager to enable expense approval workflow
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assign Manager</h3>
        <button
          onClick={() => {
            setIsEditing(false)
            setMessage(null)
            setSelectedManagerId(currentManagerId || '')
          }}
          className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        {/* Search by Email */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Search by Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={managerEmail}
              onChange={(e) => setManagerEmail(e.target.value)}
              placeholder="manager@wphome.com"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchByEmail()}
            />
            <button
              onClick={handleSearchByEmail}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Enter your manager's email address (they must be registered)
          </p>
        </div>

        {/* OR Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">OR</span>
          </div>
        </div>

        {/* Select from List */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select from List
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name or email..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto">
            {filteredManagers.length > 0 ? (
              filteredManagers.map((manager) => (
                <label
                  key={manager.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-0"
                >
                  <input
                    type="radio"
                    name="manager"
                    value={manager.id}
                    checked={selectedManagerId === manager.id}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {manager.full_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {manager.email}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    manager.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    manager.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {manager.role}
                  </span>
                </label>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading || !selectedManagerId}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? 'Saving...' : 'Save Manager Assignment'}
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Your manager will be notified and can approve your expense submissions
        </p>
      </div>
    </div>
  )
}
