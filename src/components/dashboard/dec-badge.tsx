"use client"

import { useDecBadge } from "@/context/dec-badge-context"

export function DecBadge() {
    const { count } = useDecBadge()

    if (count === 0) return null

    return (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white leading-none">
            {count > 99 ? "99+" : count}
        </span>
    )
}
