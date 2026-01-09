import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import TripTEForm from '@/components/TripTEForm'

export default async function TripDetailPage({ params }: { params: { id: string } }) {
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

  // Get trip details
  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!trip) {
    redirect('/trips')
  }

  // Get all expenses for this trip
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      *,
      approver:approved_by(full_name, email)
    `)
    .eq('trip_id', id)
    .order('expense_date', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/trips"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-2 inline-block"
            >
              ← Back to Trips
            </Link>
            <h1 className="text-3xl font-bold">{trip.trip_name}</h1>
            {trip.destination && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{trip.destination}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {new Date(trip.start_date).toLocaleDateString()} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : 'Ongoing'}
            </p>
          </div>
        </div>

        <TripTEForm
          trip={trip}
          expenses={expenses || []}
          profile={profile}
        />
      </div>

      <BottomNav />
    </div>
  )
}
