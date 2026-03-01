import { redirect } from "next/navigation"

// Modo Pulso solo puede ser activado por roles dupla/convivencia — el admin no tiene acceso
export default async function AdminPulsoPage() {
    redirect("/admin")
}
