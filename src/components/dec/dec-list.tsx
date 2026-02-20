import { DecCard } from "./dec-card"

type Props = { cases: any[] }

export function DecList({ cases }: Props) {
    if (!cases.length) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                <p className="text-sm text-slate-400">
                    No hay casos DEC registrados todavía.
                </p>
            </div>
        )
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {cases.map((dec) => (
                <DecCard key={dec.id} dec={dec} />
            ))}
        </div>
    )
}
