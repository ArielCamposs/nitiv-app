"use client"

import { useEffect } from "react"
import { useDecBadge } from "@/context/dec-badge-context"

export function MarkDecSeen() {
    const { markAsSeen } = useDecBadge()

    useEffect(() => {
        markAsSeen()
    }, [])

    return null
}
