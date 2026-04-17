import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://spacefit.com.br'

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('active', true),
    supabase.from('categories').select('slug').eq('active', true),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/checkout`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = (categories || []).map(c => ({
    url: `${baseUrl}/categoria/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = (products || []).map(p => ({
    url: `${baseUrl}/produto/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
