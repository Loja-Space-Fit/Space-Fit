import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Lock } from 'lucide-react'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'

  return (
    <footer className="bg-[#0a0a0a]">
      {/* Faixa motivacional */}
      <div className="bg-[#0d0d0d] border-y border-[#1a1a1a] py-3 overflow-hidden">
        <div className="flex items-center gap-8 animate-[marquee_30s_linear_infinite] whitespace-nowrap w-max">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="flex items-center gap-6 text-[#2a2a2a] text-xs font-black uppercase tracking-[0.3em]">
              <span className="text-[#b2ea0f]/40">◆</span>
              <span>Discipline</span>
              <span className="text-[#b2ea0f]/40">◆</span>
              <span>Energy</span>
              <span className="text-[#b2ea0f]/40">◆</span>
              <span>Results</span>
              <span className="text-[#b2ea0f]/40">◆</span>
              <span>Space Fit</span>
            </span>
          ))}
        </div>
      </div>

      {/* Linha de destaque verde no topo */}
      <div className="h-[2px] bg-gradient-to-r from-[#b2ea0f] via-[#b2ea0f]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Marca */}
        <div className="md:col-span-2">
          <div className="mb-5">
            <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-16 md:h-20 w-auto" />
          </div>
          <p className="text-[#6b7280] text-sm leading-relaxed max-w-xs mb-6">
            A melhor loja fitness do Brasil. Roupas, suplementos e acessórios
            para você treinar mais forte e alcançar seus resultados.
          </p>

          <div className="space-y-2.5">
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors group"
            >
              <span className="w-7 h-7 rounded-lg bg-[#b2ea0f]/10 flex items-center justify-center group-hover:bg-[#b2ea0f]/20 transition-colors">
                <Phone className="w-3.5 h-3.5 text-[#b2ea0f]" />
              </span>
              (34) 99885-3794
            </a>
            <a
              href="mailto:spacefitacademias@gmail.com"
              className="flex items-center gap-2.5 text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors group"
            >
              <span className="w-7 h-7 rounded-lg bg-[#b2ea0f]/10 flex items-center justify-center group-hover:bg-[#b2ea0f]/20 transition-colors">
                <Mail className="w-3.5 h-3.5 text-[#b2ea0f]" />
              </span>
              spacefitacademias@gmail.com
            </a>
            <a
              href="https://instagram.com/spacefitacademia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors group"
            >
              <span className="w-7 h-7 rounded-lg bg-[#b2ea0f]/10 flex items-center justify-center group-hover:bg-[#b2ea0f]/20 transition-colors">
                <InstagramIcon className="w-3.5 h-3.5 text-[#b2ea0f]" />
              </span>
              @spacefitacademia
            </a>
            <div className="flex items-start gap-2.5 text-sm text-[#6b7280]">
              <span className="w-7 h-7 rounded-lg bg-[#b2ea0f]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#b2ea0f]" />
              </span>
              <span>Conceição das Alagoas, Minas Gerais, Brasil</span>
            </div>
          </div>
        </div>

        {/* Links da loja */}
        <div>
          <h3 className="text-white font-black mb-5 text-xs uppercase tracking-[0.2em]">Loja</h3>
          <ul className="space-y-2.5">
            {[
              { href: '/categoria/roupas',      label: 'Roupas' },
              { href: '/categoria/suplementos', label: 'Suplementos' },
              { href: '/categoria/acessorios',  label: 'Acessórios' },
              { href: '/kits',                  label: 'Kits' },
              { href: '/ofertas',               label: 'Ofertas' },
            ].map(link => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-[#6b7280] hover:text-[#b2ea0f] transition-colors hover:translate-x-0.5 inline-block">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Informações */}
        <div>
          <h3 className="text-white font-black mb-5 text-xs uppercase tracking-[0.2em]">Atendimento</h3>
          <ul className="space-y-2.5">
            {[
              { label: 'Fale Conosco',          text: 'Olá! Preciso de ajuda.' },
              { label: 'Entregas e Prazos',      text: 'Olá! Quero saber sobre entregas.' },
              { label: 'Trocas e Devoluções',    text: 'Olá! Quero fazer uma troca.' },
            ].map(({ label, text }) => (
              <li key={label}>
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#6b7280] hover:text-[#b2ea0f] transition-colors hover:translate-x-0.5 inline-block"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>

          {/* Social */}
          <div className="mt-8">
            <h3 className="text-white font-black mb-4 text-xs uppercase tracking-[0.2em]">Redes Sociais</h3>
            <a
              href="https://instagram.com/spacefitacademia"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-[#833ab4]/20 via-[#fd1d1d]/20 to-[#fcb045]/20 border border-white/10 hover:border-[#b2ea0f]/40 text-[#9ca3af] hover:text-white transition-all text-xs font-bold"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
              Instagram
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1a1a1a] py-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#4b5563] text-center sm:text-left">
            © {new Date().getFullYear()} Space Fit. Todos os direitos reservados. Proteção de dados (LGPD).
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[#4b5563]">
            <Lock className="w-3 h-3 text-[#b2ea0f]" />
            Pagamento 100% seguro
          </div>
        </div>
      </div>
    </footer>
  )
}
