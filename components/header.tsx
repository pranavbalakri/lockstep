"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, X, ChevronDown } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { getInitials, getAvatarColor } from "@/lib/avatar"

interface SessionUser {
  id: string
  name: string
  email: string
  role: string
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setUser(null)
    setDropdownOpen(false)
    router.push("/")
    router.refresh()
  }

  return (
    <header className="bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="font-serif text-3xl font-semibold text-primary">L</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-10 md:flex">
          <Link href="/roles" className="text-sm text-foreground transition-colors hover:text-foreground/70">
            Roles
          </Link>
          <Link href="/research" className="text-sm text-foreground transition-colors hover:text-foreground/70">
            Research
          </Link>
          <Link href="/enterprise" className="text-sm text-foreground transition-colors hover:text-foreground/70">
            Enterprise
          </Link>
          <Link href="/blog" className="text-sm text-foreground transition-colors hover:text-foreground/70">
            Blog
          </Link>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden items-center md:flex">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm transition-colors hover:bg-secondary"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: getAvatarColor(user.id) }}
                >
                  {getInitials(user.name)}
                </span>
                <span className="text-sm text-foreground">{user.name.split(" ")[0]}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border bg-card shadow-md">
                  <div className="p-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" className="rounded-full px-5 text-sm font-normal">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-background px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="/roles" className="text-sm text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Roles
            </Link>
            <Link href="/research" className="text-sm text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Research
            </Link>
            <Link href="/enterprise" className="text-sm text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Enterprise
            </Link>
            <Link href="/blog" className="text-sm text-foreground" onClick={() => setMobileMenuOpen(false)}>
              Blog
            </Link>
            <div className="border-t pt-4">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-foreground"
                  >
                    Dashboard
                  </Link>
                  <button onClick={logout} className="text-left text-sm text-foreground">
                    Log out
                  </button>
                </div>
              ) : (
                <Button asChild variant="outline" size="sm" className="w-full rounded-full text-sm font-normal">
                  <Link href="/login">Log in</Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
