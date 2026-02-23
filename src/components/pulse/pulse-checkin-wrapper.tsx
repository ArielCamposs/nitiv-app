"use client"

import { useState } from "react"
import { PulseCheckinCard } from "@/components/pulse/pulse-checkin-card"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Zap } from "lucide-react"

interface Props {
    pulseSessionId: string
    studentId: string
    institutionId: string
    weekStart: string
    weekEnd: string
}

export function PulseCheckinWrapper(props: Props) {
    const [done, setDone] = useState(false)

    if (done) {
        return (
            <Card className="border-dashed border-indigo-300 bg-indigo-50/40">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <div>
                            <CardTitle className="text-base text-indigo-900">Pulso registrado ✓</CardTitle>
                            <CardDescription className="text-xs text-indigo-600">
                                Tu participación en el Modo Pulso está completa esta semana.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    return <PulseCheckinCard {...props} onDone={() => setDone(true)} />
}
