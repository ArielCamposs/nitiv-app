export const dynamic = "force-dynamic"

export default function DebugPage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return (
        <div style={{ padding: 40, fontFamily: "monospace" }}>
            <h2>Variables de entorno</h2>
            <p>SUPABASE_URL: <strong>{url ?? "❌ NO DEFINIDA"}</strong></p>
            <p>SUPABASE_KEY: <strong>{key ? "✅ OK (" + key.substring(0, 20) + "...)" : "❌ NO DEFINIDA"}</strong></p>
        </div>
    )
}
