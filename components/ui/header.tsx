import Link from "next/link";
import { Bell, HeartHandshake, LogIn, PanelRightOpen, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCareNotificationCount } from "@/lib/care-in-app-notifications";
import { buttonStyles } from "@/components/ui/button";
import { LogoutButton } from "@/components/ui/logout-button";

export async function Header() {
  const user = await getCurrentUser();
  const unreadNotifications = user ? await getUnreadCareNotificationCount(user.id) : 0;

  return (
    <header className="surface sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-700 text-white">
            <HeartHandshake aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">CuidarLink</p>
            <p className="text-sm text-slate-500">Cuidado domiciliar acessivel</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/">Busca</Link>
          <Link href="/#seguranca">Seguranca</Link>
          <Link href="/register">Sou profissional</Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard#notificacoes"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label={`Notificacoes${unreadNotifications > 0 ? `: ${unreadNotifications} nao lidas` : ""}`}
              >
                <Bell aria-hidden="true" className="h-4 w-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                ) : null}
              </Link>
              <Link href="/dashboard" className={`${buttonStyles()} gap-2`}>
                <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
                Meu painel
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={`${buttonStyles("ghost")} hidden gap-2 sm:inline-flex`}>
                <LogIn aria-hidden="true" className="h-4 w-4" />
                Entrar
              </Link>
              <Link href="/register" className={`${buttonStyles("secondary")} gap-2`}>
                <UserPlus aria-hidden="true" className="h-4 w-4" />
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
