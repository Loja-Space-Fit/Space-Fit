import AdminSidebar from '@/components/admin/AdminSidebar'
import { Toaster }    from 'react-hot-toast'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect }    from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Admin — Space Fit', template: '%s | Admin Space Fit' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Valida autenticacao: usa o client do usuario para obter a sessao,
  // e o service client (bypassa RLS) para ler is_admin do perfil.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Service client bypassa RLS — necessario caso a policy de profiles
  // nao permita que o usuario leia sua propria coluna is_admin.
  const service = createServiceClient()
  const { data: perfil } = await service
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) redirect('/')

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <AdminSidebar />
      <main className="flex-1 lg:pt-0 pt-14 overflow-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111111',
            color:      '#f9fafb',
            border:     '1px solid #2a2a2a',
            borderRadius: '12px',
            fontSize:   '14px',
          },
          success: { iconTheme: { primary: '#b2ea0f', secondary: '#000' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#000' } },
        }}
      />
    </div>
  )
}
