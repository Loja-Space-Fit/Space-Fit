// loading.tsx — skeleton da página de categoria.
// Mostrado pelo Next.js enquanto o servidor busca os dados iniciais.

export default function CategoriaLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      {/* Título */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-64 bg-[#1a1a1a] rounded-xl" />
        <div className="h-4 w-40 bg-[#1a1a1a] rounded-lg" />
      </div>

      {/* Barra de filtros */}
      <div className="flex gap-3 mb-8">
        <div className="flex-1 h-12 bg-[#111111] border border-[#2a2a2a] rounded-xl" />
        <div className="w-40 h-12 bg-[#111111] border border-[#2a2a2a] rounded-xl" />
      </div>

      {/* Grid de produtos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <div className="aspect-square bg-[#1a1a1a]" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-[#1a1a1a] rounded w-3/4" />
              <div className="h-4 bg-[#1a1a1a] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
