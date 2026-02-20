import { cn } from "@/lib/utils"

interface UnreadBadgeProps {
    count: number
    className?: string
}

export function UnreadBadge({ count, className }: UnreadBadgeProps) {
    if (count <= 0) return null

    return (
        <span
            className={cn(
                "min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none",
                className
            )}
        >
            {count > 9 ? "9+" : count}
        </span>
    )
}
