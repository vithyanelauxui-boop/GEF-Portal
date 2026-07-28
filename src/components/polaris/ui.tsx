import { cn } from "@/lib/utils";
import { Check, Info, TriangleAlert, CircleAlert, CircleCheck } from "lucide-react";

// ---------------------------------------------------------------------------
// Polaris Badge — soft, tone-coded status pill (Polaris uses light "secondary"
// tone fills, not saturated colors) with an optional status dot.
// ---------------------------------------------------------------------------
export type Tone = "success" | "warning" | "critical" | "info" | "attention" | "new";

const toneStyles: Record<Tone, { bg: string; text: string; dot: string }> = {
  success: { bg: "bg-[hsl(150_60%_93%)]", text: "text-[hsl(151_74%_18%)]", dot: "bg-[hsl(154_61%_32%)]" },
  warning: { bg: "bg-[hsl(39_85%_92%)]", text: "text-[hsl(35_90%_24%)]", dot: "bg-[hsl(35_88%_38%)]" },
  critical: { bg: "bg-[hsl(6_80%_95%)]", text: "text-[hsl(9_84%_30%)]", dot: "bg-[hsl(9_88%_45%)]" },
  info: { bg: "bg-[hsl(222_100%_96%)]", text: "text-[hsl(214_100%_25%)]", dot: "bg-[hsl(214_80%_45%)]" },
  attention: { bg: "bg-[hsl(33_100%_94%)]", text: "text-[hsl(28_70%_26%)]", dot: "bg-[hsl(30_80%_42%)]" },
  new: { bg: "bg-[hsl(0_0%_93%)]", text: "text-[hsl(0_0%_36%)]", dot: "bg-[hsl(0_0%_55%)]" },
};

export function Badge({ tone = "new", children, dot = true }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  const s = toneStyles[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", s.bg, s.text)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", s.dot)} />}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Polaris Banner — tone icon + soft tint + subtle inner border
// ---------------------------------------------------------------------------
const bannerIcon: Record<Tone, React.ElementType> = {
  success: CircleCheck, warning: TriangleAlert, critical: CircleAlert, info: Info, attention: TriangleAlert, new: Info,
};

export function Banner({
  tone = "info", title, children, action,
}: {
  tone?: Tone; title?: string; children?: React.ReactNode; action?: React.ReactNode;
}) {
  const s = toneStyles[tone];
  const Icon = bannerIcon[tone];
  return (
    <div className={cn("rounded-xl p-3.5 flex gap-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]", s.bg)}>
      <Icon className={cn("w-[18px] h-[18px] flex-shrink-0 mt-px", s.text)} strokeWidth={2} />
      <div className="flex-1 min-w-0">
        {title && <p className={cn("text-[13px] font-semibold", s.text)}>{title}</p>}
        {children && <div className="text-[13px] mt-0.5 text-foreground/80">{children}</div>}
      </div>
      {action && <div className="flex-shrink-0 self-center">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Polaris Card
// ---------------------------------------------------------------------------
export function Card({ children, className, padding = true }: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return <div className={cn("p-card", padding && "p-5", className)}>{children}</div>;
}

// ---------------------------------------------------------------------------
// Form field wrapper (Polaris labelled field: 13px label, 4px gap, help/error)
// ---------------------------------------------------------------------------
export function Field({
  label, required, help, error, action, children,
}: {
  label?: string; required?: boolean; help?: React.ReactNode; error?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1 gap-2">
          <label className="text-[13px] font-medium text-foreground">
            {label}{required && <span className="text-[hsl(var(--critical-text))]"> *</span>}
          </label>
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-[12px] text-[hsl(var(--critical-text))] mt-1 flex items-center gap-1"><CircleAlert className="w-3 h-3" /> {error}</p>
      ) : help ? (
        <p className="text-[12px] text-muted-foreground mt-1">{help}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Money input — Polaris prefix field (36px, medium-gray border)
// ---------------------------------------------------------------------------
export function MoneyInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={cn("flex items-stretch h-9 rounded-lg border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring/70 focus-within:border-foreground transition-colors", className)}>
      <span className="flex items-center px-2.5 text-[13px] text-muted-foreground bg-secondary border-r border-border">$</span>
      <input inputMode="decimal" placeholder="0.00" className="flex-1 min-w-0 px-3 text-[13px] text-right num bg-transparent outline-none" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal progress stepper (Polaris-style)
// ---------------------------------------------------------------------------
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex items-center min-w-[680px]">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0",
                  done && "bg-[hsl(var(--success))] text-white",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "bg-secondary text-muted-foreground border border-border")}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn("text-[12px] whitespace-nowrap", active ? "text-foreground font-medium" : "text-muted-foreground")}>{label}</span>
              </div>
              {i < steps.length - 1 && <div className={cn("flex-1 h-px mx-3 min-w-[16px]", done ? "bg-[hsl(var(--success))]" : "bg-border")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
