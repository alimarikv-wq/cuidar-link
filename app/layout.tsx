import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Header } from "@/components/ui/header";

export const metadata: Metadata = {
  title: "CuidarLink",
  description: "Conecte pacientes PCD a cuidadores, tecnicos de enfermagem e fisioterapeutas proximos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <div className="app-shell">
          <Header />
          <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
