import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users").select("role").eq("id", user.id).single()

  const homeByRole: Record<string, string> = {
    admin: "/admin",
    director: "/director",
    dupla: "/dupla",
    convivencia: "/convivencia",
    docente: "/docente",
    estudiante: "/estudiante",
    centro_alumnos: "/estudiante",
    inspector: "/inspector",
    utp: "/utp",
  }

  redirect(homeByRole[profile?.role ?? ""] ?? "/login")
}
