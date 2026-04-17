'use client'

// Error boundary do painel admin.
// Captura erros de render em qualquer pagina do /admin sem derrubar o layout.
// O Toaster e a sidebar continuam funcionando — so o conteudo mostra o erro.

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface PropsError {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function AdminError({ error, reset }: PropsError) {
  useEffect(() => {
    // Loga no console para facilitar debug durante desenvolvimento
    console.error('[Admin Error Boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>

      <div>
        <h2 className="text-xl font-black text-white mb-2">Algo deu errado</h2>
        <p className="text-sm text-[#9ca3af] max-w-sm">
          Ocorreu um erro inesperado ao carregar esta pagina. Os dados nao foram alterados.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-red-400 mt-3 font-mono bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2 max-w-md">
            {error.message}
          </p>
        )}
      </div>

      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#b2ea0f]/30 text-white rounded-xl text-sm font-semibold transition-all"
      >
        <RefreshCcw className="w-4 h-4" />
        Tentar novamente
      </button>
    </div>
  )
}
