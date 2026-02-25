import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ALLOWED_ROLES = ["director", "inspector", "utp", "convivencia", "dupla", "docente"]

export async function POST(req: Request) {
    try {
        // 1. Verificar que quien llama es admin
        const cookieStore = await cookies()
        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
                },
            }
        )

        const { data: { user } } = await supabaseAuth.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: caller } = await supabaseAuth
            .from("users")
            .select("role, institution_id")
            .eq("id", user.id)
            .single()

        if (!caller || caller.role !== "admin") {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        // 2. Validar body
        const body = await req.json()
        const { email, password, name, last_name, role, phone } = body

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return NextResponse.json({ error: "Rol no permitido" }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
        }

        // 3. Crear en auth.users con service_role
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            if (authError.message.includes("already registered")) {
                return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
            }
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 4. Crear en public.users
        const { data: newUser, error: profileError } = await supabaseAdmin
            .from("users")
            .insert({
                id:             authUser.user.id,
                institution_id: caller.institution_id,
                role,
                name,
                last_name:      last_name ?? null,
                email,
                phone:          phone ?? null,
                active:         true,
            })
            .select("id, name, last_name, email, role, active, created_at")
            .single()

        if (profileError) {
            // Rollback: eliminar auth user si falló el perfil
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ error: "Error al crear perfil de usuario" }, { status: 500 })
        }

        return NextResponse.json({ user: newUser }, { status: 201 })

    } catch (e) {
        console.error("[create-user]", e)
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
}


// PATCH — actualizar usuario
export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: caller } = await supabase
            .from("users").select("role, institution_id").eq("id", user.id).single()

        if (!caller || caller.role !== "admin") {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        const body = await req.json()
        const { userId, name, last_name, role, phone, active } = body

        // Verificar que el usuario a editar pertenece a la misma institución
        const { data: target } = await supabase
            .from("users").select("institution_id, role").eq("id", userId).single()

        if (!target || target.institution_id !== caller.institution_id || target.role === "admin") {
            return NextResponse.json({ error: "No autorizado para editar este usuario" }, { status: 403 })
        }

        const { data: updated, error } = await supabase
            .from("users")
            .update({ name, last_name: last_name ?? null, role, phone: phone ?? null, active })
            .eq("id", userId)
            .select("id, name, last_name, email, role, active")
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 400 })

        return NextResponse.json({ user: updated })

    } catch (e) {
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}


// DELETE — desactivar usuario (soft delete)
export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => cookieStore.getAll(),
                    setAll: (c) => { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: caller } = await supabase
            .from("users").select("role, institution_id").eq("id", user.id).single()

        if (!caller || caller.role !== "admin") {
            return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
        }

        const { userId } = await req.json()
        if (userId === user.id) {
            return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
        }

        const { data: target } = await supabase
            .from("users").select("institution_id, role").eq("id", userId).single()

        if (!target || target.institution_id !== caller.institution_id || target.role === "admin") {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 })
        }

        // Soft delete — desactivar en lugar de eliminar
        await supabase.from("users").update({ active: false }).eq("id", userId)

        return NextResponse.json({ success: true })

    } catch (e) {
        return NextResponse.json({ error: "Error interno" }, { status: 500 })
    }
}
