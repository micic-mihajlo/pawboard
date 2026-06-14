import { useState } from 'react'
import {
  Link,
  Outlet,
  createFileRoute,
  getRouteApi,
  redirect,
} from '@tanstack/react-router'
import { Database } from 'lucide-react'
import { getAuthState } from '../features/auth/functions'
import { getSnapshot } from '../features/pawboard/functions'
import { ToastProvider } from '../components/ui/toast'
import { Sheet } from '../components/ui/sheet'
import { AppTopbar } from '../components/layout/app-topbar'
import { SidebarNav } from '../components/layout/sidebar-nav'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const auth = await getAuthState()
    if (!auth.authenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => ({ snapshot: await getSnapshot() }),
  errorComponent: DatabaseErrorScreen,
  component: AuthedLayout,
})

const route = getRouteApi('/_authed')

function AuthedLayout() {
  const { snapshot } = route.useLoaderData()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside className="no-print bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-30 hidden w-64 border-r md:block">
          <SidebarNav businessName={snapshot.settings.businessName} />
        </aside>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SidebarNav
            businessName={snapshot.settings.businessName}
            onNavigate={() => setNavOpen(false)}
          />
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col md:pl-64">
          <AppTopbar snapshot={snapshot} onOpenNav={() => setNavOpen(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

function DatabaseErrorScreen({ error }: { error: Error }) {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="bg-card w-full max-w-lg space-y-4 rounded-xl border p-8 text-center shadow-sm">
        <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
          <Database size={22} />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Database not ready</h1>
          <p className="text-muted-foreground text-sm">{error.message}</p>
        </div>
        <div className="bg-muted text-muted-foreground rounded-lg p-4 text-left font-mono text-xs leading-relaxed">
          docker compose up -d
          <br />
          npm run db:migrate
          <br />
          npm run db:seed
        </div>
        <Link
          to="/"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          Retry
        </Link>
      </div>
    </div>
  )
}
