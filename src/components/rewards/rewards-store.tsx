"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type RewardsStoreProps = {
    studentId: string
    availablePoints: number
}

type Cosmetic = {
    id: string
    name: string
    type: string
    cost_points: number
    image_url: string | null
}

type OwnedCosmetic = {
    cosmetic_id: string
    equipped: boolean
}

export function RewardsStore({ studentId, availablePoints }: RewardsStoreProps) {
    const supabase = createClient()
    const [cosmetics, setCosmetics] = useState<Cosmetic[]>([])
    const [owned, setOwned] = useState<OwnedCosmetic[]>([])
    const [loadingId, setLoadingId] = useState<string | null>(null)

    useEffect(() => {
        const loadData = async () => {
            const { data: cosmeticsData } = await supabase
                .from("cosmetics")
                .select("id, name, type, cost_points, image_url")
                .eq("active", true)

            const { data: ownedData } = await supabase
                .from("student_cosmetics")
                .select("cosmetic_id, equipped")
                .eq("student_id", studentId)

            setCosmetics(cosmeticsData ?? [])
            setOwned(ownedData ?? [])
        }

        void loadData()
    }, [supabase, studentId])

    const isOwned = (cosmeticId: string) =>
        owned.some((o) => o.cosmetic_id === cosmeticId)

    const isEquipped = (cosmeticId: string) =>
        owned.some((o) => o.cosmetic_id === cosmeticId && o.equipped)

    const handleBuy = async (cosmetic: Cosmetic) => {
        if (cosmetic.cost_points > availablePoints) {
            toast.error("No tienes suficientes puntos para esta recompensa.")
            return
        }

        setLoadingId(cosmetic.id)

        try {
            const { error } = await supabase.from("student_cosmetics").insert({
                student_id: studentId,
                cosmetic_id: cosmetic.id,
                equipped: false,
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo canjear la recompensa.")
                return
            }

            setOwned((prev) => [
                ...prev,
                { cosmetic_id: cosmetic.id, equipped: false },
            ])

            toast.success("Recompensa canjeada. Pronto podrás equiparla en tu perfil.")
        } finally {
            setLoadingId(null)
        }
    }

    const handleEquip = async (cosmetic: Cosmetic) => {
        setLoadingId(cosmetic.id)

        try {
            // Poner todos en unequipped y este en equipped = true
            const { error } = await supabase.rpc("equip_cosmetic", {
                p_student_id: studentId,
                p_cosmetic_id: cosmetic.id,
            })

            if (error) {
                console.error(error)
                toast.error("No se pudo equipar la recompensa.")
                return
            }

            setOwned((prev) =>
                prev.map((o) => ({
                    ...o,
                    equipped: o.cosmetic_id === cosmetic.id,
                }))
            )

            toast.success("Recompensa equipada.")
        } finally {
            setLoadingId(null)
        }
    }

    if (!cosmetics.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tienda aún vacía</CardTitle>
                    <CardDescription>
                        Pronto habrá recompensas como marcos, fondos y más.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {cosmetics.map((cosmetic) => {
                const ownedThis = isOwned(cosmetic.id)
                const equipped = isEquipped(cosmetic.id)

                return (
                    <Card key={cosmetic.id} className="flex flex-col justify-between">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-base">
                                <span>{cosmetic.name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                    {cosmetic.type}
                                </Badge>
                            </CardTitle>
                            <CardDescription>{cosmetic.cost_points} puntos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {cosmetic.image_url ? (
                                <div className="h-24 w-full overflow-hidden rounded-md bg-slate-100">
                                    {/* placeholder: en el futuro se usa <Image> */}
                                    <img
                                        src={cosmetic.image_url}
                                        alt={cosmetic.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-24 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                                    Sin vista previa
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between gap-2">
                            {!ownedThis ? (
                                <Button
                                    variant="default"
                                    className="flex-1"
                                    disabled={loadingId === cosmetic.id}
                                    onClick={() => handleBuy(cosmetic)}
                                >
                                    {loadingId === cosmetic.id
                                        ? "Canjeando..."
                                        : "Canjear recompensa"}
                                </Button>
                            ) : (
                                <Button
                                    variant={equipped ? "secondary" : "outline"}
                                    className="flex-1"
                                    disabled={loadingId === cosmetic.id}
                                    onClick={() => handleEquip(cosmetic)}
                                >
                                    {equipped ? "Equipado" : "Equipar"}
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
