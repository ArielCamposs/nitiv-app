import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_REDIRECTS: Record<string, string> = {
    admin: '/admin',
    director: '/director',
    inspector: '/inspector',
    utp: '/utp',
    convivencia: '/convivencia',
    dupla: '/dupla',
    docente: '/docente',
    estudiante: '/estudiante',
    centro_alumnos: '/estudiante',
}

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANTE: getUser valida el token en el servidor de Supabase
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // 1. Si NO está autenticado y NO está en /login → Redirigir a /login
    if (!user && !pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. Si SÍ está autenticado y (está en /login O está en /) → Consultar rol y redirigir
    if (user && (pathname === '/login' || pathname === '/')) {
        try {
            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single()

            const role = profile?.role || 'estudiante' // Fallback a estudiante
            const destination = ROLE_REDIRECTS[role] || '/estudiante'

            // Avoid infinite redirect if destination is same as root (unlikely given ROLE_REDIRECTS)
            if (pathname !== destination) {
                const url = request.nextUrl.clone()
                url.pathname = destination
                return NextResponse.redirect(url)
            }
        } catch (error) {
            console.error('Error fetching user role:', error)
            // En caso de error, fallback a /estudiante
            const url = request.nextUrl.clone()
            url.pathname = '/estudiante'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
