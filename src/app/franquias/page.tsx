import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import FranquiasClient from './FranquiasClient'

export const metadata: Metadata = {
  title: 'Franquias | Space Fit Academia',
  description: 'Conheça as unidades da Space Fit Academia. Historia, estrutura e localização de cada franquia.',
}

export default async function FranquiasPage() {
  const supabase = await createClient()

  const [{ data: regions }, { data: franchises }] = await Promise.all([
    supabase
      .from('academy_regions')
      .select('id, value, label, state, address')
      .eq('active', true)
      .order('display_order'),
    supabase
      .from('franchise_content')
      .select('region_value, history, images'),
  ])

  return (
    <FranquiasClient
      regions={(regions || []) as Array<{ id: string; value: string; label: string; state: string; address: string }>}
      franchises={(franchises || []) as Array<{ region_value: string; history: string; images: string[] }>}
    />
  )
}
