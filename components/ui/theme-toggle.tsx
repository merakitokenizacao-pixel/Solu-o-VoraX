"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[34px] h-[34px] rounded-full" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center bg-surface-2 border border-border-subtle text-muted-brand hover:bg-surface-3 hover:text-text transition-all"
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
