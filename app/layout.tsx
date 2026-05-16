import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Footer } from "@/components/ui/footer";
import { Header } from "@/components/ui/header";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cuidar-link.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CuidarLink | Cuidado domiciliar acessivel",
    template: "%s | CuidarLink"
  },
  description: "Conecte pacientes PCD a cuidadores, tecnicos de enfermagem, enfermeiros e fisioterapeutas proximos.",
  applicationName: "CuidarLink",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: appUrl,
    siteName: "CuidarLink",
    title: "CuidarLink | Cuidado domiciliar acessivel",
    description: "Busque profissionais de cuidado domiciliar por proximidade, disponibilidade, documentos e perfil de atendimento."
  },
  twitter: {
    card: "summary",
    title: "CuidarLink | Cuidado domiciliar acessivel",
    description: "Cuidado domiciliar com busca, documentos, mensagens e solicitacoes registradas."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <div className="app-shell">
          <Header />
          <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
