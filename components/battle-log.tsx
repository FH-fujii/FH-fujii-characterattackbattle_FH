"use client"

import { cn } from "@/lib/utils"

interface LogEntry {
  id: number
  message: string
  damage?: number
}

interface BattleLogProps {
  logs: LogEntry[]
}

export function BattleLog({ logs }: BattleLogProps) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h2 className="text-lg font-bold mb-3 text-muted-foreground">📜 バトルログ</h2>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">バトルを開始してください...</p>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id}
              className={cn(
                "text-sm p-2 rounded-lg transition-all",
                index === 0 ? "bg-primary/20 text-foreground" : "bg-muted/50 text-muted-foreground",
              )}
            >
              {log.message}
              {log.damage && <span className="ml-2 font-bold text-destructive">-{log.damage}</span>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
