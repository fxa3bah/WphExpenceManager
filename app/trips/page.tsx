import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export default async function TripsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get all trips for the user
  const { data: trips } = await supabase
    .from('trips')
    .select('*, expenses(count)')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  // Group trips by status
  const activeTrips = trips?.filter(t => t.status === 'active') || []
  const completedTrips = trips?.filter(t => t.status === 'completed') || []

  const renderTripCard = (trip: any) => (
    <Link
      key={trip.id}
      href={`/trips/${trip.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-lg">{trip.trip_name}</h3>
          {trip.destination && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{trip.destination}</p>
          )}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          trip.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
          trip.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {trip.status}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600 dark:text-gray-400">
          {new Date(trip.start_date).toLocaleDateString()} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : 'Ongoing'}
        </div>
        <div className="text-blue-600 dark:text-blue-400">
          {trip.expenses?.[0]?.count || 0} expenses
        </div>
      </div>
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Trips</h1>
          <Link
            href="/trips/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + New Trip
          </Link>
        </div>

        {/* Active Trips */}
        {activeTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              Active Trips ({activeTrips.length})
            </h2>
            <div className="space-y-3">
              {activeTrips.map(renderTripCard)}
            </div>
          </div>
        )}

        {/* Completed Trips */}
        {completedTrips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Completed Trips ({completedTrips.length})
            </h2>
            <div className="space-y-3">
              {completedTrips.map(renderTripCard)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!trips || trips.length === 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">No trips yet</p>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Create a trip to group related expenses together</p>
            <Link href="/trips/new" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
              Create Trip
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
