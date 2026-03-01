import { redirect } from "next/navigation"

// El historial emocional de estudiantes es privado — el admin no tiene acceso
export default async function AdminHistorialPage() {
    redirect("/admin")
}
