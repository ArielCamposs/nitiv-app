"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="text-center space-y-6 max-w-md">
                {/* Icono */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-rose-50 p-6">
                        <AlertTriangle className="w-12 h-12 text-rose-400" />
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-2">
                    <h1 className="text-xl font-semibold text-slate-800">
                        Algo salió mal
                    </h1>
                    <p className="text-sm text-slate-500">
                        Ocurrió un error inesperado. Puedes intentar recargar la página.
                    </p>
                    {error.digest && (
                        <p className="text-[11px] font-mono text-slate-300">
                            {error.digest}
                        </p>
                    )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset}>
                        Reintentar
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/">Ir al inicio</Link>
                    </Button>
                </div>
            </div>
        </main>
    )
}
