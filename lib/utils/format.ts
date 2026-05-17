export function formatPhone(phone: string): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(
  dateStr: string | null,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }
): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", opts);
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.trim().split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_PALETTE: [string, string][] = [
  ["#8b5e3c", "#f5ede5"],
  ["#2d6a4f", "#d8f3dc"],
  ["#1a5276", "#e8f0fb"],
  ["#6c5ce7", "#f0edff"],
  ["#c0392b", "#fde8e8"],
  ["#b5540a", "#fef3e2"],
];

export function getAvatarColors(name: string | null): [string, string] {
  return AVATAR_PALETTE[((name || "?").charCodeAt(0)) % AVATAR_PALETTE.length];
}
