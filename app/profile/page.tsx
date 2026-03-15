"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { getInitials, getAvatarColor } from "@/lib/avatar"
import { Pencil, Plus, Trash2, Check, X } from "lucide-react"

interface WorkExperience {
  id: string
  company: string
  title: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

interface Education {
  id: string
  school: string
  degree: string
  field: string
  startYear: string
  endYear: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  walletAddress?: string | null
  bio?: string | null
  profilePicture?: string | null
  industry?: string | null
  professionalTitle?: string | null
  skills: string
  workExperience: string
  education: string
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Edit state
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [industry, setIndustry] = useState("")
  const [professionalTitle, setProfessionalTitle] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([])
  const [education, setEducation] = useState<Education[]>([])

  const router = useRouter()

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user === null) { router.push("/login?redirect=/profile"); return }
        if (d?.user) { setUser(d.user); setLoading(false) }
      })
      .catch(() => setLoading(false))
  }, [router])

  function startEditing() {
    if (!user) return
    setName(user.name)
    setBio(user.bio ?? "")
    setIndustry(user.industry ?? "")
    setProfessionalTitle(user.professionalTitle ?? "")
    setSkills(safeParseArray<string>(user.skills))
    setWorkExperience(safeParseArray<WorkExperience>(user.workExperience))
    setEducation(safeParseArray<Education>(user.education))
    setError("")
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setError("")
  }

  async function saveProfile() {
    setSaving(true)
    setError("")
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio, industry, professionalTitle, skills, workExperience, education }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? "Failed to save")
      setSaving(false)
      return
    }
    const d = await res.json()
    setUser(d.user)
    setEditing(false)
    setSaving(false)
  }

  function addSkill() {
    const s = skillInput.trim()
    if (!s || skills.includes(s)) return
    setSkills([...skills, s])
    setSkillInput("")
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s))
  }

  function addWork() {
    setWorkExperience([...workExperience, { id: uid(), company: "", title: "", startDate: "", endDate: "", current: false, description: "" }])
  }

  function updateWork(id: string, field: keyof WorkExperience, value: string | boolean) {
    setWorkExperience(workExperience.map((w) => w.id === id ? { ...w, [field]: value } : w))
  }

  function removeWork(id: string) {
    setWorkExperience(workExperience.filter((w) => w.id !== id))
  }

  function addEdu() {
    setEducation([...education, { id: uid(), school: "", degree: "", field: "", startYear: "", endYear: "" }])
  }

  function updateEdu(id: string, field: keyof Education, value: string) {
    setEducation(education.map((e) => e.id === id ? { ...e, [field]: value } : e))
  }

  function removeEdu(id: string) {
    setEducation(education.filter((e) => e.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
          <div className="mt-4 h-4 w-64 animate-pulse rounded bg-secondary" />
        </div>
      </main>
    )
  }

  if (!user) return null

  const parsedSkills = safeParseArray<string>(user.skills)
  const parsedWork = safeParseArray<WorkExperience>(user.workExperience)
  const parsedEdu = safeParseArray<Education>(user.education)

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* Profile header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white"
                style={{ backgroundColor: getAvatarColor(user.id) }}
              >
                {getInitials(user.name)}
              </div>
            )}
            <div>
              <h1 className="font-serif text-2xl font-normal text-foreground">{user.name}</h1>
              {user.professionalTitle && (
                <p className="mt-0.5 text-base text-muted-foreground">{user.professionalTitle}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {user.industry && (
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                    {user.industry}
                  </span>
                )}
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs capitalize text-secondary-foreground">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" className="shrink-0 rounded-full px-4" onClick={startEditing}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <EditForm
            name={name} setName={setName}
            bio={bio} setBio={setBio}
            industry={industry} setIndustry={setIndustry}
            professionalTitle={professionalTitle} setProfessionalTitle={setProfessionalTitle}
            skills={skills} skillInput={skillInput} setSkillInput={setSkillInput}
            addSkill={addSkill} removeSkill={removeSkill}
            workExperience={workExperience} addWork={addWork} updateWork={updateWork} removeWork={removeWork}
            education={education} addEdu={addEdu} updateEdu={updateEdu} removeEdu={removeEdu}
            error={error} saving={saving}
            onSave={saveProfile} onCancel={cancelEditing}
          />
        ) : (
          <ViewProfile
            user={user}
            skills={parsedSkills}
            workExperience={parsedWork}
            education={parsedEdu}
          />
        )}
      </div>
    </main>
  )
}

function ViewProfile({
  user,
  skills,
  workExperience,
  education,
}: {
  user: UserProfile
  skills: string[]
  workExperience: WorkExperience[]
  education: Education[]
}) {
  const isEmpty = !user.bio && skills.length === 0 && workExperience.length === 0 && education.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <p className="text-muted-foreground">Your profile is empty. Click <strong>Edit</strong> to add your bio, skills, and experience.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {user.bio && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-medium">About</h2>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{user.bio}</p>
        </section>
      )}

      {skills.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-medium">Top Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="rounded-full border bg-card px-3 py-1 text-sm text-foreground">
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {workExperience.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-medium">Work Experience</h2>
          <div className="flex flex-col gap-5">
            {workExperience.map((w) => (
              <div key={w.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{w.title}</p>
                    <p className="text-sm text-muted-foreground">{w.company}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {w.startDate}{w.startDate && (w.current ? " — Present" : w.endDate ? ` — ${w.endDate}` : "")}
                  </span>
                </div>
                {w.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{w.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-medium">Education</h2>
          <div className="flex flex-col gap-4">
            {education.map((e) => (
              <div key={e.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{e.school}</p>
                    <p className="text-sm text-muted-foreground">
                      {[e.degree, e.field].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {e.startYear}{e.startYear && e.endYear ? ` — ${e.endYear}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EditForm({
  name, setName,
  bio, setBio,
  industry, setIndustry,
  professionalTitle, setProfessionalTitle,
  skills, skillInput, setSkillInput, addSkill, removeSkill,
  workExperience, addWork, updateWork, removeWork,
  education, addEdu, updateEdu, removeEdu,
  error, saving, onSave, onCancel,
}: {
  name: string; setName: (v: string) => void
  bio: string; setBio: (v: string) => void
  industry: string; setIndustry: (v: string) => void
  professionalTitle: string; setProfessionalTitle: (v: string) => void
  skills: string[]; skillInput: string; setSkillInput: (v: string) => void
  addSkill: () => void; removeSkill: (s: string) => void
  workExperience: WorkExperience[]; addWork: () => void
  updateWork: (id: string, field: keyof WorkExperience, value: string | boolean) => void
  removeWork: (id: string) => void
  education: Education[]; addEdu: () => void
  updateEdu: (id: string, field: keyof Education, value: string) => void
  removeEdu: (id: string) => void
  error: string; saving: boolean; onSave: () => void; onCancel: () => void
}) {
  return (
    <div className="flex flex-col gap-8">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Basic info */}
      <section>
        <h2 className="mb-4 font-serif text-lg font-medium">Basic Info</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Professional title">
            <input
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer"
              className={inputCls}
            />
          </Field>
          <Field label="Industry">
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Software, Finance, Design"
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Bio */}
      <section>
        <h2 className="mb-4 font-serif text-lg font-medium">About</h2>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Write a short bio about yourself..."
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-xs text-muted-foreground">{bio.length}/1000</p>
      </section>

      {/* Skills */}
      <section>
        <h2 className="mb-4 font-serif text-lg font-medium">Top Skills</h2>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}
            placeholder="Add a skill and press Enter"
            className={`${inputCls} flex-1`}
          />
          <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={addSkill}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm text-foreground">
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Work experience */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium">Work Experience</h2>
          <Button type="button" size="sm" variant="outline" className="rounded-full px-4" onClick={addWork}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {workExperience.length === 0 ? (
          <p className="text-sm text-muted-foreground">No work experience added yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {workExperience.map((w) => (
              <div key={w.id} className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Position</p>
                  <button
                    type="button"
                    onClick={() => removeWork(w.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Job title">
                    <input value={w.title} onChange={(e) => updateWork(w.id, "title", e.target.value)} placeholder="Software Engineer" className={inputCls} />
                  </Field>
                  <Field label="Company">
                    <input value={w.company} onChange={(e) => updateWork(w.id, "company", e.target.value)} placeholder="Acme Corp" className={inputCls} />
                  </Field>
                  <Field label="Start date">
                    <input value={w.startDate} onChange={(e) => updateWork(w.id, "startDate", e.target.value)} placeholder="Jan 2022" className={inputCls} />
                  </Field>
                  <Field label="End date">
                    <input value={w.endDate} onChange={(e) => updateWork(w.id, "endDate", e.target.value)} placeholder="Dec 2023" disabled={w.current} className={`${inputCls} disabled:opacity-50`} />
                  </Field>
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={w.current}
                    onChange={(e) => updateWork(w.id, "current", e.target.checked)}
                    className="rounded"
                  />
                  Currently working here
                </label>
                <div className="mt-3">
                  <Field label="Description">
                    <textarea
                      value={w.description}
                      onChange={(e) => updateWork(w.id, "description", e.target.value)}
                      rows={3}
                      placeholder="Describe your responsibilities and achievements..."
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Education */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium">Education</h2>
          <Button type="button" size="sm" variant="outline" className="rounded-full px-4" onClick={addEdu}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground">No education added yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {education.map((e) => (
              <div key={e.id} className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Degree</p>
                  <button
                    type="button"
                    onClick={() => removeEdu(e.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="School">
                    <input value={e.school} onChange={(ev) => updateEdu(e.id, "school", ev.target.value)} placeholder="MIT" className={inputCls} />
                  </Field>
                  <Field label="Degree">
                    <input value={e.degree} onChange={(ev) => updateEdu(e.id, "degree", ev.target.value)} placeholder="B.S., M.S., Ph.D." className={inputCls} />
                  </Field>
                  <Field label="Field of study">
                    <input value={e.field} onChange={(ev) => updateEdu(e.id, "field", ev.target.value)} placeholder="Computer Science" className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start year">
                      <input value={e.startYear} onChange={(ev) => updateEdu(e.id, "startYear", ev.target.value)} placeholder="2018" className={inputCls} />
                    </Field>
                    <Field label="End year">
                      <input value={e.endYear} onChange={(ev) => updateEdu(e.id, "endYear", ev.target.value)} placeholder="2022" className={inputCls} />
                    </Field>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t pt-6">
        <Button className="rounded-full px-6" onClick={onSave} disabled={saving}>
          <Check className="mr-1.5 h-4 w-4" />
          {saving ? "Saving…" : "Save profile"}
        </Button>
        <Button variant="outline" className="rounded-full px-5" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function safeParseArray<T>(json: string): T[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const inputCls =
  "h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
