"use client"

import { useState } from "react"
import { AlertCard } from "./alert-card"

type Alert = {
    id: string
    type: string
    description: string
    resolved: boolean
    created_at: string
    students: {
        name: string
        last_name: string
        courses: { name: string } | null
    } | null
}

type Props = {
    initialAlerts: Alert[]
    filterTypes?: string[]
}

export function AlertsList({ initialAlerts, filterTypes }: Props) {
    const [alerts, setAlerts] = useState<Alert[]>(
        filterTypes
            ? initialAlerts.filter((a) => filterTypes.includes(a.type))
            : initialAlerts
    )

    const handleResolved = (id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
    }

    if (alerts.length === 0) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm text-slate-400">
                    No hay alertas activas en este momento.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {alerts.map((alert) => (
                <AlertCard
                    key={alert.id}
                    alert={alert}
                    onResolved={handleResolved}
                />
            ))}
        </div>
    )
}
