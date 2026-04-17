// loading.tsx — skeleton do dashboard admin.
// Mostrado pelo Next.js enquanto o servidor executa as queries.

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Título */}
      <div className="h-9 w-48 bg-[#1a1a1a] rounded-xl" />

      {/* Linha de cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />
        ))}
      </div>

      {/* Alertas */}
      <div className="h-40 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />

      {/* Gráfico + Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />
        <div className="h-72 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />
      </div>

      {/* Tabela de pedidos */}
      <div className="h-64 bg-[#111111] border border-[#2a2a2a] rounded-2xl" />
    </div>
  )
}
