'use client'

import { useTransition } from 'react'
import { logout } from '@/app/auth/login/actions'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Logging out...' : 'Logout'}
    </button>
  )
}
