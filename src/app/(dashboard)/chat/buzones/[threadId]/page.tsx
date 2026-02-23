"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Send, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
    abierto: { label: "Abierto", badge: "text-green-700 bg-green-50 border-green-200" },
    en_proceso: { label: "En proceso", badge: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    cerrado: { label: "Cerrado", badge: "text-slate-500 bg-slate-50 border-slate-200" },
}
const STAFF_ROLES = ["admin", "dupla", "convivencia", "director", "inspector", "utp"]

interface MailboxMsg {
    id: string; sender_id: string; content: string; created_at: string
    sender?: { name: string; last_name: string | null; role: string }
}

export default function ThreadPage() {
    const params = useParams()
    const threadId = params.threadId as string
    const router = useRouter()
    const supabase = createClient()

    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
    const [thread, setThread] = useState<{ subject: string; status: string } | null>(null)
    const [messages, setMessages] = useState<MailboxMsg[]>([])
    const [text, setText] = useState("")
    const [loading, setLoading] = useState(true)
    const bottomRef = useRef<HTMLDivElement>(null)

    const loadMessages = useCallback(async () => {
        const { data } = await supabase
            .from("mailbox_messages")
            .select("*, sender:sender_id(name, last_name, role)")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true })
        setMessages((data as MailboxMsg[]) ?? [])
    }, [threadId, supabase])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data: profile } = await supabase
                .from("users").select("id, role").eq("id", user.id).single()
            setCurrentUser(profile)

            const { data: th } = await supabase
                .from("mailbox_threads").select("subject, status").eq("id", threadId).single()
            if (!th) return router.push("/chat")
            setThread(th)

            await loadMessages()
            setLoading(false)
        }
        init()

        const channel = supabase
            .channel(`thread-${threadId}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public",
                table: "mailbox_messages",
                filter: `thread_id=eq.${threadId}`,
            }, async payload => {
                const { data: sender } = await supabase
                    .from("users").select("name, last_name, role")
                    .eq("id", payload.new.sender_id).single()
                setMessages(prev => {
                    const msg = { ...payload.new, sender } as MailboxMsg
                    return prev.find(m => m.id === msg.id) ? prev : [...prev, msg]
                })
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [threadId])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = async () => {
        if (!text.trim() || !currentUser) return
        const content = text; setText("")
        await supabase.from("mailbox_messages").insert({
            thread_id: threadId, sender_id: currentUser.id, content: content.trim(),
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const updateStatus = async (newStatus: string) => {
        const { error } = await supabase
            .from("mailbox_threads").update({ status: newStatus }).eq("id", threadId)
        if (!error) {
            setThread(prev => prev ? { ...prev, status: newStatus } : prev)
            toast.success(`Hilo marcado como "${STATUS_CONFIG[newStatus]?.label}"`)
        }
    }

    const isStaff = currentUser ? STAFF_ROLES.includes(currentUser.role) : false
    const statusCfg = thread ? STATUS_CONFIG[thread.status] ?? STATUS_CONFIG.cerrado : null

    return (
        <div className="flex flex-col h-[calc(100vh-0px)] md:h-screen max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0 shadow-sm">
                <button onClick={() => router.push("/chat")}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Inbox className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                        {thread?.subject ?? "Hilo"}
                    </p>
                    {statusCfg && (
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
                            {statusCfg.label}
                        </span>
                    )}
                </div>

                {isStaff && thread && thread.status !== "cerrado" && (
                    <div className="flex gap-1.5">
                        {thread.status === "abierto" && (
                            <Button size="sm" variant="outline" className="text-[10px] h-7 px-2"
                                onClick={() => updateStatus("en_proceso")}>
                                En proceso
                            </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 text-slate-500"
                            onClick={() => updateStatus("cerrado")}>
                            Cerrar
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/50">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-sm animate-pulse">Cargando...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <p className="text-sm">Sin mensajes aún</p>
                    </div>
                ) : (
                    messages.map(msg => {
                        const isOwn = msg.sender_id === currentUser?.id
                        const senderName = msg.sender
                            ? `${msg.sender.name} ${msg.sender.last_name ?? ""}`.trim()
                            : "Usuario"
                        return (
                            <div key={msg.id} className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                                {!isOwn && <span className="text-xs text-slate-500 ml-1">{senderName}</span>}
                                <div className={cn(
                                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                    isOwn ? "bg-primary text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"
                                )}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-slate-400 mx-1">
                                    {new Date(msg.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t bg-white shrink-0">
                {thread?.status === "cerrado" ? (
                    <p className="text-xs text-center text-slate-400 py-1">Este hilo está cerrado.</p>
                ) : (
                    <div className="flex items-center gap-2">
                        <input type="text" value={text}
                            onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-slate-50" />
                        <Button onClick={handleSend} disabled={!text.trim()} size="icon" className="rounded-xl w-10 h-10 shrink-0">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
