"use client"
import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useChat } from "@/hooks/useChat"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const AVAILABILITY_DOT: Record<string, string> = {
    disponible: "bg-green-500", en_clase: "bg-blue-500",
    en_reunion: "bg-yellow-500", ausente: "bg-slate-400",
}
const ROLE_LABEL: Record<string, string> = {
    admin: "Administrador", director: "Director", inspector: "Inspector",
    utp: "UTP", convivencia: "Convivencia", dupla: "Dupla", docente: "Docente",
}

export default function ConversationPage() {
    const params = useParams()
    const conversationId = params.conversationId as string
    const router = useRouter()
    const supabase = createClient()

    const [currentUserId, setCurrentUserId] = useState("")
    const [otherUser, setOtherUser] = useState<{ id: string; name: string; last_name: string | null; role: string } | null>(null)
    const [availability, setAvailability] = useState<string | null>(null)
    const [text, setText] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const { messages, loading, sendMessage } = useChat(conversationId)
    const { markAsRead } = useUnreadCount(currentUserId)

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")
            setCurrentUserId(user.id)

            const { data: conv } = await supabase
                .from("conversations").select("user_a, user_b").eq("id", conversationId).single()
            if (!conv) return router.push("/chat")

            const otherId = conv.user_a === user.id ? conv.user_b : conv.user_a

            const { data: other } = await supabase
                .from("users").select("id, name, last_name, role").eq("id", otherId).single()
            setOtherUser(other)

            const { data: avail } = await supabase
                .from("user_availability").select("status").eq("user_id", otherId).maybeSingle()
            if (avail) setAvailability(avail.status)

            markAsRead(conversationId)
        }
        init()
    }, [conversationId])

    useEffect(() => {
        if (!otherUser?.id) return
        const channel = supabase
            .channel(`avail-${otherUser.id}`)
            .on("postgres_changes", {
                event: "*", schema: "public", table: "user_availability",
                filter: `user_id=eq.${otherUser.id}`,
            }, payload => { setAvailability((payload.new as any)?.status ?? null) })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [otherUser?.id])

    const handleSend = async () => {
        if (!text.trim() || !currentUserId) return
        const content = text; setText("")
        await sendMessage(content, currentUserId)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const otherName = otherUser
        ? otherUser.last_name ? `${otherUser.name} ${otherUser.last_name}` : otherUser.name
        : "Chat"
    const dotColor = availability ? AVAILABILITY_DOT[availability] : null

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0 shadow-sm">
                <button onClick={() => router.push("/chat")}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {otherName[0]?.toUpperCase()}
                    </div>
                    {dotColor && (
                        <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", dotColor)} />
                    )}
                </div>
                <div>
                    <p className="font-semibold text-slate-800 text-sm leading-tight">{otherName}</p>
                    {otherUser && (
                        <p className="text-xs text-slate-400">{ROLE_LABEL[otherUser.role] ?? otherUser.role}</p>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
                <ChatWindow messages={messages} currentUserId={currentUserId} loading={loading} />
            </div>

            <div className="px-4 py-3 border-t bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <input ref={inputRef} type="text" value={text}
                        onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-slate-50" />
                    <Button onClick={handleSend} disabled={!text.trim()} size="icon" className="rounded-xl w-10 h-10 shrink-0">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
