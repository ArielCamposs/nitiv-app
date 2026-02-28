"use client"

import { useEffect, useRef } from "react"
import { ChatMessage } from "@/hooks/useChat"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ChatWindowProps {
    messages: ChatMessage[]
    currentUserId: string
    loading?: boolean
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
    })
}

function getSenderName(msg: ChatMessage) {
    if (!msg.sender) return "Usuario"
    const { name, last_name } = msg.sender
    return last_name ? `${name} ${last_name}` : name
}

export function ChatWindow({ messages, currentUserId, loading }: ChatWindowProps) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400">
                <p className="text-sm animate-pulse">Cargando mensajes...</p>
            </div>
        )
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <p className="text-3xl mb-2">💬</p>
                    <p className="text-sm">Sé el primero en escribir</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUserId

                if (msg.meta?.type === "notification") {
                    return (
                        <div
                            key={msg.id}
                            className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}
                        >
                            {!isOwn && (
                                <span className="text-xs text-slate-500 ml-1">{getSenderName(msg)}</span>
                            )}
                            <div
                                className={cn(
                                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                    isOwn
                                        ? "bg-primary text-white rounded-tr-sm"
                                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
                                )}
                            >
                                <p className={cn(
                                    "text-xs font-semibold",
                                    isOwn ? "text-white" : "text-slate-700"
                                )}>
                                    {msg.meta.title}
                                </p>
                                <p className={cn(
                                    "text-xs mt-1",
                                    isOwn ? "text-white/90" : "text-slate-500"
                                )}>
                                    {msg.meta.message}
                                </p>
                                {msg.meta?.related_url && (
                                    <button
                                        onClick={() => router.push(msg.meta!.related_url)}
                                        className={cn(
                                            "mt-2 text-[11px] font-semibold hover:underline block w-full text-left",
                                            isOwn ? "text-white underline" : "text-primary"
                                        )}
                                    >
                                        Ver detalle
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 mx-1">
                                {formatTime(msg.created_at)}
                            </span>
                        </div>
                    )
                }

                return (
                    <div
                        key={msg.id}
                        className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}
                    >
                        {!isOwn && (
                            <span className="text-xs text-slate-500 ml-1">{getSenderName(msg)}</span>
                        )}
                        <div
                            className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                isOwn
                                    ? "bg-primary text-white rounded-tr-sm"
                                    : "bg-slate-100 text-slate-800 rounded-tl-sm"
                            )}
                        >
                            {msg.content}
                        </div>
                        <span className="text-[10px] text-slate-400 mx-1">
                            {formatTime(msg.created_at)}
                        </span>
                    </div>
                )
            })}
            <div ref={bottomRef} />
        </div>
    )
}
