import Link from "next/link";
import { HeartHandshake } from "lucide-react";

const footerLinks = [
  { href: "/seguranca", label: "Seguranca" },
  { href: "/pricing", label: "Planos" },
  { href: "/terms", label: "Termos" },
  { href: "/privacy", label: "Privacidade" },
  { href: "/cookies", label: "Cookies" }
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-700 text-white">
            <HeartHandshake aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-950">CuidarLink</p>
            <p>Cuidado domiciliar acessivel e documentado.</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-slate-700 hover:text-emerald-700">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
