"use client"
import { useState } from "react"
import { useAvailability, AVAILABILITY_CONFIG, AvailabilityStatus } from "@/hooks/useAvailability"
import { cn } from "@/lib/utils"

export function AvailabilitySelector({ userId }: { userId: string }) {
    const { status, updateStatus } = useAvailability(userId)
    const [open, setOpen] = useState(false)
    const cfg = AVAILABILITY_CONFIG[status]

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(p => !p)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
                <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                <span className={cfg.color}>{cfg.label}</span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 rounded-xl border border-slate-100 bg-white shadow-lg py-1 min-w-[160px]">
                        {(Object.entries(AVAILABILITY_CONFIG) as [AvailabilityStatus, typeof cfg][]).map(([key, val]) => (
                            <button
                                key={key}
                                onClick={() => { updateStatus(key); setOpen(false) }}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium hover:bg-slate-50 transition-colors",
                                    status === key ? "bg-slate-50" : ""
                                )}
                            >
                                <span className={cn("w-2 h-2 rounded-full shrink-0", val.dot)} />
                                <span className={val.color}>{val.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
