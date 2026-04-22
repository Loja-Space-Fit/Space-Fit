import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail } from 'lucide-react'

export default function Footer() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'

  return (
    <footer className="bg-[#111111] border-t border-[#2a2a2a] mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Marca */}
        <div className="md:col-span-2">
          <div className="mb-4">
            <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-36 w-auto" />
          </div>
          <p className="text-[#9ca3af] text-sm leading-relaxed max-w-xs">
            A melhor loja fitness do Brasil. Roupas, suplementos e acessórios
            para você treinar mais forte e alcançar seus resultados.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#b2ea0f] hover:text-[#c8f040] transition-colors"
            >
              <Phone className="w-4 h-4" />
              (34) 99885-3794
            </a>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-[#9ca3af]">
            <Mail className="w-4 h-4 shrink-0 text-[#b2ea0f]" />
            <a href="mailto:spacefitacademias@gmail.com" className="hover:text-[#b2ea0f] transition-colors">
              spacefitacademias@gmail.com
            </a>
          </div>
          <div className="mt-2 flex items-start gap-2 text-sm text-[#9ca3af]">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#b2ea0f]" />
            <span>Conceição das Alagoas, Minas Gerais, Brasil</span>
          </div>
        </div>

        {/* Links da loja */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Loja</h3>
          <ul className="space-y-2">
            {[
              { href: '/categoria/roupas',      label: 'Roupas' },
              { href: '/categoria/suplementos', label: 'Suplementos' },
              { href: '/categoria/acessorios',  label: 'Acessórios' },
            ].map(link => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Informações */}
        <div>
          <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Informações</h3>
          <ul className="space-y-2">
            <li>
              <a
                href={`https://wa.me/${whatsapp}?text=Olá! Preciso de ajuda com meu pedido.`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors"
              >
                Fale Conosco
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${whatsapp}?text=Olá! Quero saber sobre entregas.`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors"
              >
                Entregas e Prazos
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${whatsapp}?text=Olá! Quero fazer uma troca.`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors"
              >
                Trocas e Devoluções
              </a>
            </li>

          </ul>
        </div>
      </div>

      <div className="border-t border-[#2a2a2a] py-4 px-4">
        <p className="text-center text-xs text-[#9ca3af]">
          © {new Date().getFullYear()} Space Fit. Todos os direitos reservados. Compras com segurança e proteção de dados (LGPD).
        </p>
      </div>
    </footer>
  )
}
