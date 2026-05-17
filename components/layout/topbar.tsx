"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useLayoutStore } from "@/store/layout";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PAGE_TITLES: Record<string, string> = {
  "/": "Visão geral",
  "/clientes": "Clientes",
  "/agenda": "Agenda",
  "/followup": "Follow-up",
  "/conversas": "Conversas",
  "/dados": "Dados",
  "/servicos": "Serviços",
};

function getTitle(pathname: string): string {
  return PAGE_TITLES[pathname] ?? "VoraX";
}

export function Topbar() {
  const pathname = usePathname();
  const { toggleSidebar } = useLayoutStore();

  const dateStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <header className="h-16 border-b border-border-subtle bg-surface sticky top-0 z-10 flex items-center justify-between px-6 lg:px-10 shrink-0">
      <div className="flex items-center gap-3.5">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-surface-2 border border-border-subtle text-muted-brand hover:text-text transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={16} />
        </button>
        <h1 className="font-display text-[22px] font-normal text-text tracking-[0.02em]">
          {getTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-[11px] font-mono text-muted-brand bg-surface-2 px-3 py-1.5 rounded-full border border-border-subtle">
          {dateStr}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
