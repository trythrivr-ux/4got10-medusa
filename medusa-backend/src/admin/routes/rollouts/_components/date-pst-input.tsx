import { Label } from "@medusajs/ui"
import { useState } from "react"

// PST = UTC-8 (fixed offset, no DST adjustments)
const PST_OFFSET_HOURS = 8

/** Convert a UTC ISO string → datetime-local string in PST */
function utcToPstLocal(utcIso: string): string {
  if (!utcIso) return ""
  const ms = new Date(utcIso).getTime()
  return new Date(ms - PST_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 16)
}

/** Convert a PST datetime-local string → UTC ISO string */
function pstLocalToUtc(pstLocal: string): string {
  if (!pstLocal) return ""
  // Parse as UTC (append "Z"), then add 8 hours to shift PST → UTC
  const ms = new Date(pstLocal + ":00Z").getTime()
  return new Date(ms + PST_OFFSET_HOURS * 3_600_000).toISOString()
}

/** Convert a UTC datetime-local string → UTC ISO string */
function utcLocalToUtcIso(utcLocal: string): string {
  if (!utcLocal) return ""
  return new Date(utcLocal + ":00Z").toISOString()
}

/** Format a UTC ISO string for display */
function fmtUTC(utcIso: string): string {
  if (!utcIso) return "—"
  return new Date(utcIso).toISOString().replace("T", " ").slice(0, 16) + " UTC"
}

/** Format a UTC ISO string as PST display */
function fmtPST(utcIso: string): string {
  if (!utcIso) return "—"
  return utcToPstLocal(utcIso).replace("T", " ") + " PST (UTC-8)"
}

interface Props {
  id: string
  label: string
  /** UTC ISO string, or "" for empty */
  value: string
  /** Called with a UTC ISO string, or "" to clear */
  onChange: (utcIso: string) => void
}

export function DateTimePSTInput({ id, label, value, onChange }: Props) {
  const [mode, setMode] = useState<"UTC" | "PST">("PST")

  const inputValue =
    mode === "UTC"
      ? (value ? new Date(value).toISOString().slice(0, 16) : "")
      : utcToPstLocal(value)

  const handleChange = (raw: string) => {
    if (!raw) { onChange(""); return }
    const utcIso =
      mode === "UTC" ? utcLocalToUtcIso(raw) : pstLocalToUtc(raw)
    onChange(utcIso)
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} size="small">{label}</Label>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("UTC")}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
              mode === "UTC"
                ? "bg-ui-bg-base border-ui-border-strong text-ui-fg-base"
                : "bg-transparent border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"
            }`}
          >
            UTC
          </button>
          <button
            type="button"
            onClick={() => setMode("PST")}
            className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
              mode === "PST"
                ? "bg-ui-bg-base border-ui-border-strong text-ui-fg-base"
                : "bg-transparent border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"
            }`}
          >
            PST
          </button>
        </div>
      </div>

      <input
        id={id}
        type="datetime-local"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        className="flex h-8 w-full rounded-md border border-ui-border-base bg-ui-bg-field px-2 py-1 text-sm transition-colors placeholder:text-ui-fg-muted focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
      />

      {/* Always show both resolved values */}
      <div className="flex flex-col gap-0.5 text-[11px] text-ui-fg-subtle font-mono">
        <span>UTC → {fmtUTC(value)}</span>
        <span>PST → {fmtPST(value)}</span>
      </div>
    </div>
  )
}
