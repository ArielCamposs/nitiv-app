import { redirect } from "next/navigation"

// DEC es privado para roles dupla/convivencia — el admin no tiene acceso
export default async function AdminDecPage() {
    redirect("/admin")
}
