import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SetCatalogue } from './SetCatalogue'

export default async function AddSetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: allSets }, { data: trackedSets }] = await Promise.all([
    supabase
      .from('sets')
      .select('set_code, set_name, series_name, release_date, total_slots')
      .order('release_date', { ascending: false }),
    supabase
      .from('tracked_sets')
      .select('set_code')
      .eq('user_id', user.id),
  ])

  const initialTracked = new Set((trackedSets ?? []).map((t) => t.set_code))

  return (
    <div className="min-h-screen bg-binder-bg">
      <header className="sticky top-0 z-10 bg-binder-bg/90 backdrop-blur border-b border-white/[.06] px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Back to dashboard"
        >
          ←
        </Link>
        <h1 className="text-sm font-semibold text-text-primary">Add Set</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <SetCatalogue
          sets={allSets ?? []}
          initialTracked={initialTracked}
        />
      </main>
    </div>
  )
}
