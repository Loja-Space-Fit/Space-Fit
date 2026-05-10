// Skeleton — componentes de carregamento reutilizaveis.
// Usados enquanto dados asincronos ainda nao chegaram (Suspense boundaries
// ou estados de loading em client components).
//
// Todos usam animate-pulse do Tailwind — sem dependencia externa.
// Exportados individualmente para importar so o que precisar.

// Barra de fundo cinza que pulsa — bloco basico de todos os skeletons
function Barra({ className }: { className: string }) {
  return <div className={`bg-[#2a2a2a] rounded animate-pulse ${className}`} />
}

// =============================================================================
// Skeleton de MetricCard (4 por linha no dashboard)
// =============================================================================
export function SkeletonMetricCard() {
  return (
    <div className="card-dark p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Barra className="h-3 w-24" />
        <Barra className="w-8 h-8 rounded-lg" />
      </div>
      <Barra className="h-7 w-28" />
      <Barra className="h-2.5 w-20" />
    </div>
  )
}

// =============================================================================
// Skeleton de grafico de linha (ocupa a largura total)
// =============================================================================
export function SkeletonGrafico({ altura = 280 }: { altura?: number }) {
  return (
    <div
      className="card-dark p-5 animate-pulse"
      style={{ height: altura }}
    >
      {/* Label do eixo Y simulado */}
      <div className="flex flex-col justify-between h-full pb-6 pt-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Barra className="h-2.5 w-10 shrink-0" />
            <div className="flex-1 border-b border-[#1a1a1a]" />
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Skeleton de linha de tabela (repetir N vezes)
// =============================================================================
export function SkeletonLinhaTabela() {
  return (
    <tr className="border-b border-[#1a1a1a]">
      <td className="px-5 py-3"><Barra className="h-3 w-20" /></td>
      <td className="px-5 py-3"><Barra className="h-3 w-32" /></td>
      <td className="px-5 py-3"><Barra className="h-3 w-16 ml-auto" /></td>
      <td className="px-5 py-3"><Barra className="h-5 w-20 mx-auto rounded-full" /></td>
      <td className="px-5 py-3"><Barra className="h-3 w-16 ml-auto" /></td>
    </tr>
  )
}

// =============================================================================
// Skeleton de card de produto (TopProductsList)
// =============================================================================
export function SkeletonProduto() {
  return (
    <div className="flex items-center gap-3 py-2">
      <Barra className="w-6 h-4 shrink-0" />
      <div className="flex-1">
        <Barra className="h-3 w-3/4 mb-1.5" />
        <Barra className="h-1.5 w-full rounded-full" />
      </div>
      <Barra className="h-3 w-10 shrink-0" />
    </div>
  )
}

// =============================================================================
// Skeleton de AlertCard
// =============================================================================
export function SkeletonAlerta() {
  return (
    <div className="border border-[#2a2a2a] rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <Barra className="w-4 h-4 rounded shrink-0" />
        <div className="flex-1">
          <Barra className="h-3 w-40 mb-1.5" />
          <Barra className="h-2.5 w-64" />
        </div>
      </div>
    </div>
  )
}
