const AVATAR_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#eab308",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
]

export function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
