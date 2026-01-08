'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Manager {
  id: string
  full_name: string
  email: string
  role: string
}

interface ManagerAssignmentProps {
  userId: string
  currentManagerId: string | null
  managers: Manager[]
  isAdmin: boolean
  userRole: string
}

export default function ManagerAssignment({
  userId,
  currentManagerId,
  managers,
  isAdmin,
  userRole,
}: ManagerAssignmentProps) {
  const [selectedManagerId, setSelectedManagerId] = useState(currentManagerId || '')
  const [updating, setUpdating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newManagerId = e.target.value || null
    setSelectedManagerId(newManagerId || '')

    if (!isAdmin) return

    setUpdating(true)

    try {
      const { error } = await supabase
        .from('users')
        .update({ manager_id: newManagerId })
        .eq('id', userId)

      if (error) throw error

      router.refresh()
    } catch (error) {
      console.error('Error updating manager:', error)
      alert('Failed to update manager')
      setSelectedManagerId(currentManagerId || '')
    } finally {
      setUpdating(false)
    }
  }

  // Don't show manager assignment for admins
  if (userRole === 'admin') {
    return <span className="text-sm text-gray-500">-</span>
  }

  if (!isAdmin) {
    return (
      <span className="text-sm">
        {managers.find(m => m.id === currentManagerId)?.full_name || 'No manager'}
      </span>
    )
  }

  return (
    <select
      value={selectedManagerId}
      onChange={handleChange}
      disabled={updating}
      className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 disabled:opacity-50"
    >
      <option value="">No manager</option>
      {managers.map((manager) => (
        <option key={manager.id} value={manager.id}>
          {manager.full_name}
        </option>
      ))}
    </select>
  )
}
