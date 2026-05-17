"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  RefreshCw,
  MessageCircle,
  BarChart3,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/store/layout";

const NAV_MAIN = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/followup", label: "Follow-up", icon: RefreshCw },
  { href: "/conversas", label: "Conversas", icon: MessageCircle },
];

const NAV_SECONDARY = [
  { href: "/dados", label: "Dados", icon: BarChart3 },
  { href: "/servicos", label: "Serviços", icon: Scissors },
];

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 mx-3 px-3 py-2 rounded-md text-[13px] transition-colors relative",
        isActive
          ? "bg-[rgba(184,149,90,0.12)] text-[#f0ece4]"
          : "text-[rgba(240,236,228,0.35)] hover:bg-[rgba(184,149,90,0.06)] hover:text-[rgba(240,236,228,0.7)]"
      )}
    >
      {isActive && (
        <span
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-0.5 h-[22px] rounded-r-sm"
          style={{
            background: "#b8955a",
            boxShadow: "0 0 8px rgba(184,149,90,0.4)",
          }}
        />
      )}
      <Icon
        size={15}
        className={cn("shrink-0", isActive ? "opacity-100" : "opacity-50")}
      />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useLayoutStore();

  const close = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-60 z-40 flex flex-col overflow-hidden",
          "transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: "linear-gradient(180deg, #1a1510 0%, #0f0d09 100%)",
        }}
      >
        {/* top gold line */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(184,149,90,0.6), transparent)",
          }}
        />

        {/* Logo */}
        <div className="px-7 pt-8 pb-7 border-b border-[rgba(184,149,90,0.12)] shrink-0">
          <div
            className="text-[9px] tracking-[0.25em] uppercase mb-2"
            style={{ color: "rgba(184,149,90,0.6)" }}
          >
            CRM Estético
          </div>
          <div
            className="text-[28px] font-light tracking-[0.02em] leading-none font-display"
            style={{ color: "#f0ece4" }}
          >
            Vora<em className="italic" style={{ color: "#b8955a" }}>X</em>
          </div>
          <div
            className="text-[9px] tracking-[0.18em] uppercase mt-1.5"
            style={{ color: "rgba(240,236,228,0.25)" }}
          >
            Sistema de Relacionamento
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div
            className="text-[8px] tracking-[0.2em] uppercase font-semibold px-7 pt-2 pb-1.5"
            style={{ color: "rgba(184,149,90,0.35)" }}
          >
            Principal
          </div>
          {NAV_MAIN.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={href === "/" ? pathname === "/" : pathname.startsWith(href)}
              onClick={close}
            />
          ))}

          <div
            className="text-[8px] tracking-[0.2em] uppercase font-semibold px-7 pt-5 pb-1.5"
            style={{ color: "rgba(184,149,90,0.35)" }}
          >
            Análise
          </div>
          {NAV_SECONDARY.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={pathname.startsWith(href)}
              onClick={close}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-[rgba(184,149,90,0.1)] flex items-center gap-2.5 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
            style={{
              background: "#4ade80",
              boxShadow: "0 0 8px rgba(74,222,128,0.4)",
            }}
          />
          <span
            className="text-[10px] tracking-[0.05em]"
            style={{ color: "rgba(240,236,228,0.25)" }}
          >
            Laura AI · Ativa
          </span>
        </div>
      </aside>
    </>
  );
}
