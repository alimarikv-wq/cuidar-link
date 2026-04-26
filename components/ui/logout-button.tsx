"use client";

import { LogOut } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button type="button" onClick={logout} className={`${buttonStyles("ghost")} gap-2`}>
      <LogOut aria-hidden="true" className="h-4 w-4" />
      Sair
    </button>
  );
}
