import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { RolesSection } from "@/components/roles-section"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <RolesSection />
    </main>
  )
}
