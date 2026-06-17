import { cn } from "@/lib/utils";

export type StatusTone = "positive" | "attention" | "negative" | "progress" | "neutral";

const toneClass: Record<StatusTone, string> = {
  positive: "bg-[hsl(var(--positive))]",
  attention: "bg-[hsl(var(--attention))]",
  negative: "bg-[hsl(var(--negative))]",
  progress: "bg-[hsl(var(--progress))]",
  neutral: "bg-muted-foreground",
};

/**
 * Semantic-status indicator. Per Architecture 01 §9, colour conveys status only
 * through small dots/badges — never as full backgrounds across the interface.
 */
export function StatusDot({
  tone,
  label,
  className,
  pulse,
}: {
  tone: StatusTone;
  label?: string;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block h-2 w-2 shrink-0 rounded-full",
          toneClass[tone],
          pulse && "animate-recording-pulse",
        )}
        aria-hidden
      />
      {label ? <span className="text-sm">{label}</span> : null}
    </span>
  );
}
