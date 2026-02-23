"use client"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import { usePresence } from "@/hooks/usePresence"
import { ContactList } from "@/components/chat/ContactList"
import { AvailabilitySelector } from "@/components/chat/AvailabilitySelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { MessageSquare, Inbox, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const BLOCKED_ROLES = ["estudiante", "centro_alumnos"]
const STAFF_ROLES = ["admin", "dupla", "convivencia", "director", "inspector", "utp"]

const STATUS_BADGE: Record<string, string> = {
    abierto: "text-green-700 bg-green-50 border-green-200",
    en_proceso: "text-yellow-700 bg-yellow-50 border-yellow-200",
    cerrado: "text-slate-500 bg-slate-50 border-slate-200",
}
const STATUS_LABEL: Record<string, string> = {
    abierto: "Abierto", en_proceso: "En proceso", cerrado: "Cerrado",
}

interface UserProfile {
    id: string; name: string; last_name: string | null
    role: string; conversationId?: string; availability?: string | null
}

interface MailboxThread { id: string; subject: string; status: string; created_at: string }
interface Mailbox { id: string; name: string; target_role: string; threads: MailboxThread[] }

export default function ChatPage() {
    const supabase = createClient()
    const router = useRouter()

    const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
    const [contacts, setContacts] = useState<UserProfile[]>([])
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
    const [institutionId, setInstitutionId] = useState("")
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    // Filtro por nombre
    const filteredContacts = search.trim()
        ? contacts.filter(c =>
            `${c.name} ${c.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase())
        )
        : contacts

    const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null)
    const [newThreadSubject, setNewThreadSubject] = useState("")
    const [newThreadContent, setNewThreadContent] = useState("")

    const { unreadMap, totalUnread, markAsRead } = useUnreadCount(currentUser?.id ?? "")
    const { isOnline } = usePresence(currentUser?.id ?? "", institutionId)

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return router.push("/login")

            const { data: profile } = await supabase
                .from("users").select("id, name, last_name, role, institution_id")
                .eq("id", user.id).single()

            if (!profile || BLOCKED_ROLES.includes(profile.role)) return router.push("/")
            setCurrentUser({ id: user.id, role: profile.role })
            setInstitutionId(profile.institution_id)

            // ── Contactos ──
            const { data: users } = await supabase
                .from("users").select("id, name, last_name, role")
                .not("role", "in", `(${BLOCKED_ROLES.join(",")})`)
                .neq("id", user.id).eq("active", true).order("name")

            const { data: convs } = await supabase
                .from("conversations").select("id, user_a, user_b")
                .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

            const userIds = (users ?? []).map(u => u.id)
            const { data: avail } = userIds.length > 0
                ? await supabase.from("user_availability").select("user_id, status").in("user_id", userIds)
                : { data: [] }

            const availMap: Record<string, string> = {}
            avail?.forEach(a => { availMap[a.user_id] = a.status })

            setContacts((users ?? []).map(u => {
                const conv = convs?.find(c =>
                    (c.user_a === user.id && c.user_b === u.id) ||
                    (c.user_b === user.id && c.user_a === u.id)
                )
                return { ...u, conversationId: conv?.id, availability: availMap[u.id] ?? null }
            }))



            // ── Buzones ──
            const { data: mboxes } = await supabase
                .from("service_mailboxes").select("id, name, target_role")
                .eq("institution_id", profile.institution_id)

            if (mboxes && mboxes.length > 0) {
                const mboxIds = mboxes.map(m => m.id)
                const { data: threads } = await supabase
                    .from("mailbox_threads")
                    .select("id, mailbox_id, subject, status, created_at")
                    .in("mailbox_id", mboxIds)
                    .order("created_at", { ascending: false })
                setMailboxes(mboxes.map(m => ({
                    ...m,
                    threads: (threads ?? []).filter(t => t.mailbox_id === m.id),
                })))
            }

            setLoading(false)
        }
        load()
    }, [])

    const openChat = async (contactId: string) => {
        if (!currentUser) return
        const { data: existing } = await supabase
            .from("conversations").select("id")
            .or(`and(user_a.eq.${currentUser.id},user_b.eq.${contactId}),and(user_a.eq.${contactId},user_b.eq.${currentUser.id})`)
            .maybeSingle()
        if (existing) { markAsRead(existing.id); return router.push(`/chat/${existing.id}`) }
        const { data: newConv } = await supabase
            .from("conversations").insert({ user_a: currentUser.id, user_b: contactId })
            .select("id").single()
        if (newConv) router.push(`/chat/${newConv.id}`)
    }


    const handleCreateThread = async (mailboxId: string) => {
        if (!newThreadSubject.trim() || !newThreadContent.trim() || !currentUser) return
        const { data: thread } = await supabase
            .from("mailbox_threads")
            .insert({ mailbox_id: mailboxId, created_by: currentUser.id, subject: newThreadSubject.trim() })
            .select("id").single()
        if (!thread) return
        await supabase.from("mailbox_messages").insert({
            thread_id: thread.id, sender_id: currentUser.id, content: newThreadContent.trim(),
        })
        setActiveMailboxId(null); setNewThreadSubject(""); setNewThreadContent("")
        router.push(`/chat/buzones/${thread.id}`)
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Chat interno
                            {totalUnread > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold">
                                    {totalUnread > 9 ? "9+" : totalUnread}
                                </span>
                            )}
                        </h1>
                        <p className="text-xs text-slate-400">Mensajes con el equipo</p>
                    </div>
                </div>
                {currentUser && <AvailabilitySelector userId={currentUser.id} />}
            </div>

            <Tabs defaultValue="mensajes" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="mensajes" className="text-xs gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Mensajes
                    </TabsTrigger>
                    <TabsTrigger value="buzones" className="text-xs gap-1.5">
                        <Inbox className="w-3.5 h-3.5" /> Buzones
                    </TabsTrigger>
                </TabsList>

                {/* ── Mensajes ── */}
                <TabsContent value="mensajes" className="space-y-3">
                    {!loading && (
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre..."
                                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                        </div>
                    )}
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <ContactList
                                contacts={filteredContacts}
                                currentUserId={currentUser?.id ?? ""}
                                onOpenChat={openChat}
                                unreadMap={unreadMap}
                                isOnline={isOnline}
                            />
                        </div>
                    )}
                </TabsContent>



                {/* ── Buzones ── */}
                <TabsContent value="buzones" className="space-y-4">
                    {mailboxes.length === 0 ? (
                        <div className="py-10 text-center text-slate-400">
                            <Inbox className="w-6 h-6 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No hay buzones configurados</p>
                            {currentUser?.role === "admin" && (
                                <p className="text-xs mt-1 text-indigo-500">Activa el seed de buzones en Supabase</p>
                            )}
                        </div>
                    ) : (
                        mailboxes.map(mailbox => (
                            <div key={mailbox.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-700">{mailbox.name}</h3>
                                    <Button size="sm" variant="outline" className="text-xs gap-1 h-7 px-2"
                                        onClick={() => setActiveMailboxId(activeMailboxId === mailbox.id ? null : mailbox.id)}>
                                        <Plus className="w-3 h-3" /> Nuevo hilo
                                    </Button>
                                </div>

                                {activeMailboxId === mailbox.id && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                                        <input value={newThreadSubject} onChange={e => setNewThreadSubject(e.target.value)}
                                            placeholder="Asunto"
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                                        <textarea value={newThreadContent} onChange={e => setNewThreadContent(e.target.value)}
                                            placeholder="Mensaje inicial..." rows={2}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveMailboxId(null)}>Cancelar</Button>
                                            <Button size="sm" className="text-xs"
                                                onClick={() => handleCreateThread(mailbox.id)}
                                                disabled={!newThreadSubject.trim() || !newThreadContent.trim()}>
                                                Enviar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {mailbox.threads.length === 0 ? (
                                    <p className="text-xs text-slate-400 py-2 px-1">Sin hilos activos.</p>
                                ) : (
                                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                        {mailbox.threads.map(t => (
                                            <button key={t.id} onClick={() => router.push(`/chat/buzones/${t.id}`)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b last:border-b-0 text-left">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{t.subject}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {new Date(t.created_at).toLocaleDateString("es-CL")}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                                    STATUS_BADGE[t.status] ?? STATUS_BADGE.cerrado
                                                )}>
                                                    {STATUS_LABEL[t.status] ?? t.status}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
