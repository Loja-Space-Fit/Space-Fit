import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/store/CartDrawer";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Space Fit — Loja Fitness",
    template: "%s | Space Fit",
  },
  description:
    "A melhor academia de Conceição das Alagoas, MG. Roupas, suplementos e acessórios para sua academia. Space Fit — Discipline, Energy, Results.",
  keywords: ["academia", "fitness", "suplementos", "roupas fitness", "Space Fit", "musculação", "Conceição das Alagoas"],
  openGraph: {
    title: "Space Fit — Loja Fitness",
    description: "Roupas, suplementos e acessórios fitness. Compre online com segurança.",
    type: "website",
    locale: "pt_BR",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${orbitron.variable} ${rajdhani.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white">
        <AuthProvider>
          <FavoritesProvider>
          <CartProvider>
          <Header />
          <CartDrawer />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
        </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
