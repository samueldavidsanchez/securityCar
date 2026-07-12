import { redirect } from 'next/navigation'
import { VehicleProvider } from '@/components/VehicleProvider'
import { NavBar } from '@/components/layout/NavBar'
import { VehicleSwitcher } from '@/components/layout/VehicleSwitcher'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defense-in-depth: proxy already gates, but never render the shell without a user.
  if (!user) redirect('/login')

  return (
    <VehicleProvider>
      <div className="flex h-full">
        <NavBar />
        <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          <header className="flex items-center justify-between border-b border-[--color-border] bg-[--color-bg-surface] px-4 py-3">
            <VehicleSwitcher />
            <span className="text-xs text-[--color-text-muted]">{user.email}</span>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </VehicleProvider>
  )
}
