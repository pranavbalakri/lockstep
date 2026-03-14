import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"

interface RoleCardProps {
  id: string
  title: string
  rate: string
  hiredCount: number
  avatars: { initials: string; color: string }[]
}

export function RoleCard({ id, title, rate, hiredCount, avatars }: RoleCardProps) {
  return (
    <div className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="mb-6">
        <Link href={`/gig/${id}`}>
          <h3 className="mb-1 font-medium text-card-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer">{title}</h3>
        </Link>
        <p className="text-sm text-muted-foreground">{rate}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {avatars.slice(0, 3).map((avatar, i) => (
              <Avatar key={i} className="h-7 w-7 border-2 border-card">
                <AvatarFallback
                  className="text-[10px] font-medium text-white"
                  style={{ backgroundColor: avatar.color }}
                >
                  {avatar.initials}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{hiredCount} requests</span>
        </div>

        <Link
          href={`/gig/${id}`}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Request
        </Link>
      </div>
    </div>
  )
}
