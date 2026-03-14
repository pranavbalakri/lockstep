"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          <Button variant="outline" size="sm" className="rounded-full px-5 text-sm font-normal">
            Log in
          </Button>
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
            <Link href="/roles" className="text-sm text-foreground">
              Roles
            </Link>
            <Link href="/research" className="text-sm text-foreground">
              Research
            </Link>
            <Link href="/enterprise" className="text-sm text-foreground">
              Enterprise
            </Link>
            <Link href="/blog" className="text-sm text-foreground">
              Blog
            </Link>
            <div className="border-t pt-4">
              <Button variant="outline" size="sm" className="w-full rounded-full text-sm font-normal">
                Log in
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
