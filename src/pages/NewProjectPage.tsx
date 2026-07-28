import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Check, Circle, AlertCircle, ChevronRight, Plus, Trash2, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Badge, Banner, Card, Field, MoneyInput, Stepper } from "@/components/polaris/ui";

// ============================================================================
// Reference data
// ============================================================================
const STEPPER = ["PIF Entry", "Secretariat Review", "PIF Clearance", "CEO Endorsement", "GEF Review", "Endorsed"];

type SectionId = "basics" | "scope" | "rio" | "duration" | "sec-a" | "sec-b" | "sec-c" | "sec-d" | "sec-e";
type Status = "not-started" | "in-progress" | "complete" | "error";

// Two meaningful groups replace the repeated "Part I" / bare A–E labels.
const SECTION_META: Record<SectionId, { group: string; title: string; description: string }> = {
  basics:    { group: "Project information", title: "Basics", description: "Identify the project, its trust fund and lead agency." },
  scope:     { group: "Project information", title: "Scope & Coverage", description: "Where the project works and who executes it." },
  rio:       { group: "Project information", title: "Rio Markers & Safeguards", description: "How the project maps to the Rio Conventions, plus safeguards." },
  duration:  { group: "Project information", title: "Duration & Fees", description: "Project timeline and agency fee." },
  "sec-a":   { group: "Financing & results", title: "Focal / Non-Focal Area Elements", description: "Programming directions and the GEF financing requested against each." },
  "sec-b":   { group: "Financing & results", title: "Project Description Summary", description: "Objective, components, management cost and total project cost." },
  "sec-c":   { group: "Financing & results", title: "Sources of Co-financing", description: "Co-financing sources and the investment they mobilize." },
  "sec-d":   { group: "Financing & results", title: "Trust Fund Resources", description: "Resources requested by agency, country and focal area." },
  "sec-e":   { group: "Financing & results", title: "Project Preparation Grant", description: "Optional grant to develop the full project after PIF clearance." },
};

const RAIL_GROUPS: { label: string; ids: SectionId[] }[] = [
  { label: "Project information", ids: ["basics", "scope", "rio", "duration"] },
  { label: "Financing & results", ids: ["sec-a", "sec-b", "sec-c", "sec-d", "sec-e"] },
];
const SECTION_ORDER: SectionId[] = RAIL_GROUPS.flatMap((g) => g.ids);

const GLOSSARY: Record<string, { title: string; body: string; scored?: boolean }> = {
  "rio-markers": { title: "Rio Markers", scored: true, body: "OECD-DAC policy markers that record whether a project targets the three Rio Conventions — climate change (mitigation & adaptation), biodiversity, and land degradation. Each is scored 0 (not targeted), 1 (significant), or 2 (principal). The Secretariat checks these against the project's stated objectives." },
  iplc: { title: "IPLCs — Indigenous Peoples & Local Communities", body: "People who hold customary rights over, or depend on, the lands and resources a project affects. Report the share of financing directed to IPLC-led actions for the conservation and sustainable use of biodiversity." },
  cso: { title: "CSOs — Civil Society Organizations", body: "Non-state, non-profit actors — community groups, women's and youth groups, NGOs — delivering the project. Report the project financing that supports CSO-led actions." },
  fcs: { title: "FCS — Fragile & Conflict-affected Situations", body: "Countries or areas classified as fragile or conflict-affected. If any project country qualifies, flag it; agencies using their own classification should justify it." },
  "trust-fund": { title: "Trust Fund", body: "The GEF financing source — GET (GEF Trust Fund), LDCF (Least Developed Countries Fund), or SCCF (Special Climate Change Fund). Determines eligibility rules and co-financing expectations." },
  taxonomy: { title: "Taxonomy", body: "GEF's standardized keyword classification applied to every project. Accurate tagging lets the Secretariat and Council aggregate the portfolio consistently." },
  cofinancing: { title: "Co-financing", body: "Resources beyond the GEF grant mobilized to support the project. 'Investment mobilized' is the subset representing new investment catalyzed by the GEF intervention." },
  pmc: { title: "PMC — Project Management Cost", body: "The cost of managing the project, distinct from technical components. GEF caps PMC as a percentage of the grant, so it is tracked on its own line." },
  ppg: { title: "PPG — Project Preparation Grant", body: "An optional grant, requested at PIF stage, that funds developing the full project document after the PIF is cleared. Amounts are capped by project size." },
};

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: string) => { const n = parseFloat(String(v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };

// ============================================================================
// Small blocks
// ============================================================================
function HelpLink({ k, onHelp }: { k: string; onHelp: (k: string) => void }) {
  return (
    <button type="button" onClick={() => onHelp(k)} className="inline-flex items-center gap-1 text-[12px] text-[hsl(var(--info-text))] hover:underline">
      <HelpCircle className="w-3.5 h-3.5" /> What&apos;s this?
    </button>
  );
}

function RailIcon({ status }: { status: Status }) {
  if (status === "complete") return <span className="w-4 h-4 rounded-full bg-[hsl(var(--success))] flex items-center justify-center flex-shrink-0"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></span>;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-[hsl(var(--critical-text))] flex-shrink-0" />;
  if (status === "in-progress") return <span className="w-4 h-4 rounded-full border-2 border-primary flex-shrink-0" style={{ background: "linear-gradient(90deg, hsl(var(--primary)) 50%, transparent 50%)" }} />;
  return <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />;
}

// ============================================================================
// Card-row editor with persistent running total
// ============================================================================
type Col = { key: string; label: string; type: "text" | "money" | "select"; options?: string[]; wide?: boolean };

function RowsEditor<T extends Record<string, string>>({
  cols, rows, setRows, makeEmpty, totals, addLabel = "Add row",
}: {
  cols: Col[]; rows: T[]; setRows: (r: T[]) => void; makeEmpty: () => T;
  totals?: { key: string; label: string }[]; addLabel?: string;
}) {
  const update = (i: number, key: string, val: string) => { const next = rows.slice(); next[i] = { ...next[i], [key]: val }; setRows(next); };
  const totalFor = (key: string) => rows.reduce((s, r) => s + num(r[key] || ""), 0);
  return (
    <div className="space-y-3">
      {rows.length === 0 && <div className="text-[13px] text-muted-foreground border border-dashed border-border rounded-lg py-5 text-center">No rows yet.</div>}
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-border bg-[#fcfcfc] p-3 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pr-8">
            {cols.map((c) => (
              <div key={c.key} className={cn(c.wide && "sm:col-span-2")}>
                <label className="text-[12px] font-medium text-muted-foreground mb-1 block">{c.label}</label>
                {c.type === "select" ? (
                  <Select value={row[c.key] || ""} onValueChange={(v) => update(i, c.key, v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(c.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : c.type === "money" ? (
                  <MoneyInput value={row[c.key] || ""} onChange={(v) => update(i, c.key, v)} />
                ) : (
                  <Input placeholder={c.label} value={row[c.key] || ""} onChange={(e) => update(i, c.key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setRows(rows.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-[hsl(var(--critical-text))] hover:bg-[hsl(var(--critical-bg))] transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setRows([...rows, makeEmpty()])}><Plus className="w-4 h-4" /> {addLabel}</Button>
        {totals && totals.length > 0 && (
          <div className="flex items-center gap-6">
            {totals.map((t) => (
              <div key={t.key} className="text-right">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t.label}</div>
                <div className="text-[14px] font-semibold text-foreground num">$ {money(totalFor(t.key))}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Section card — eyebrow (group) + title + one-line description for context
// ============================================================================
function Section({
  id, refCb, status, nextLabel, onNext, helpKey, onHelp, children,
}: {
  id: SectionId; refCb: (el: HTMLElement | null) => void; status?: Status;
  nextLabel?: string; onNext?: () => void; helpKey?: string; onHelp?: (k: string) => void; children: React.ReactNode;
}) {
  const m = SECTION_META[id];
  return (
    <section id={id} ref={refCb as any} className="p-card p-5 scroll-mt-24 animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-0.5">{m.group}</p>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground">{m.title}</h2>
            {helpKey && onHelp && <button type="button" onClick={() => onHelp(helpKey)} className="text-[hsl(var(--info-text))]"><HelpCircle className="w-4 h-4" /></button>}
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">{m.description}</p>
        </div>
        {status === "complete" && <Badge tone="success" dot={false}><Check className="w-3 h-3" /> Complete</Badge>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const Req = () => <span className="text-[hsl(var(--critical-text))]"> *</span>;

// ============================================================================
// Page
// ============================================================================
type ElementRow = { direction: string; trustFund: string; gef: string; cofin: string };
type ComponentRow = { component: string; type: string; outcomes: string; outputs: string; trustFund: string; gef: string; cofin: string };
type MoneyRow = Record<string, string>;

export default function NewProjectPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    projectTitle: "", trustFund: "", leadAgencyProjectId: "",
    coverage: "", country: "", execEntities: "", execEntityType: "",
    focalArea: "", sector: "", taxonomy: "",
    ccm: "", cca: "", biodiversity: "", landDeg: "",
    fcs: "", fcsJustification: "", iplcAmount: "", csoAmount: "",
    duration: "", agencyFee: "",
    objective: "", justification: "", ppgAmount: "",
  });
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [ppgRequired, setPpgRequired] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  const [elementRows, setElementRows] = useState<ElementRow[]>([]);
  const [componentRows, setComponentRows] = useState<ComponentRow[]>([]);
  const [pmcRows, setPmcRows] = useState<MoneyRow[]>([]);
  const [cofinRows, setCofinRows] = useState<MoneyRow[]>([]);
  const [trustFundRows, setTrustFundRows] = useState<MoneyRow[]>([]);

  const [helpKey, setHelpKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("basics");
  const [savedAt, setSavedAt] = useState<Date>(new Date());

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollRoot = useRef<HTMLDivElement | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const blur = (k: string) => setTouched((p) => ({ ...p, [k]: true }));
  const errFor = (k: keyof typeof form) => (!form[k] && (touched[k] || showAllErrors));

  useEffect(() => { const t = setTimeout(() => setSavedAt(new Date()), 1000); return () => clearTimeout(t); }, [form, tags, ppgRequired, elementRows, componentRows, cofinRows, trustFundRows]);

  useEffect(() => {
    const root = scrollRoot.current; if (!root) return;
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActiveSection(vis[0].target.id as SectionId);
    }, { root, rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    SECTION_ORDER.forEach((id) => { const el = sectionRefs.current[id]; if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const requiredBySection: Record<SectionId, (keyof typeof form)[]> = {
    basics: ["projectTitle", "trustFund"], scope: ["coverage", "focalArea", "taxonomy"],
    rio: ["ccm", "cca", "biodiversity", "landDeg", "fcs"], duration: ["duration"],
    "sec-a": [], "sec-b": ["objective"], "sec-c": [], "sec-d": [], "sec-e": [],
  };

  const statusOf = (id: SectionId): Status => {
    if (id === "sec-a") return elementRows.length ? "complete" : "not-started";
    if (id === "sec-d") return trustFundRows.length ? "complete" : "not-started";
    if (id === "sec-c") return cofinRows.length ? "complete" : "not-started";
    if (id === "sec-e") return ppgRequired ? (form.ppgAmount ? "complete" : "in-progress") : "complete";
    const reqs = requiredBySection[id];
    const filled = reqs.filter((k) => !!form[k]);
    const anyErr = reqs.some((k) => !form[k] && (touched[k] || showAllErrors));
    if (id === "sec-b") {
      const ok = !!form.objective && componentRows.length > 0;
      if (ok) return "complete"; if (anyErr) return "error";
      return form.objective || componentRows.length ? "in-progress" : "not-started";
    }
    if (filled.length === reqs.length) return "complete";
    if (anyErr) return "error";
    return filled.length ? "in-progress" : "not-started";
  };

  const sectionStatuses = useMemo(() => Object.fromEntries(SECTION_ORDER.map((id) => [id, statusOf(id)])) as Record<SectionId, Status>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, tags, touched, showAllErrors, elementRows, componentRows, cofinRows, trustFundRows, ppgRequired]);

  const allRequired = Object.values(requiredBySection).flat() as (keyof typeof form)[];
  const requiredFilled = allRequired.filter((k) => !!form[k]).length;
  const completionPct = Math.round((requiredFilled / allRequired.length) * 100);
  const sectionsDone = SECTION_ORDER.filter((id) => statusOf(id) === "complete").length;
  const nextIncomplete = SECTION_ORDER.find((id) => statusOf(id) !== "complete");

  const scrollTo = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const registerRef = (id: string) => (el: HTMLElement | null) => { sectionRefs.current[id] = el; };
  const nav = (id: SectionId) => {
    const i = SECTION_ORDER.indexOf(id); const next = SECTION_ORDER[i + 1];
    return next ? { nextLabel: SECTION_META[next].title, onNext: () => scrollTo(next) } : {};
  };

  const handleValidate = () => {
    setShowAllErrors(true);
    const missing = allRequired.filter((k) => !form[k]);
    if (missing.length === 0) toast({ title: "All required fields complete", description: "Part I passes validation. Ready to submit for Secretariat review." });
    else {
      toast({ title: `${missing.length} required field${missing.length > 1 ? "s" : ""} still needed`, description: "Jump to the flagged sections in the rail to fix them.", variant: "destructive" });
      const firstBad = SECTION_ORDER.find((id) => requiredBySection[id].some((k) => !form[k]));
      if (firstBad) scrollTo(firstBad);
    }
  };

  const objectiveWords = form.objective.trim() ? form.objective.trim().split(/\s+/).length : 0;
  const bGef = componentRows.reduce((s, r) => s + num(r.gef), 0);
  const bCofin = componentRows.reduce((s, r) => s + num(r.cofin), 0);
  const pmcGef = pmcRows.reduce((s, r) => s + num(r.gef), 0);
  const pmcCofin = pmcRows.reduce((s, r) => s + num(r.cofin), 0);
  const glossary = helpKey ? GLOSSARY[helpKey] : null;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Polaris contextual save bar (dark) */}
      <div className="h-14 bg-[hsl(var(--topbar))] text-white flex items-center gap-3 px-3 md:px-4 flex-shrink-0 z-30">
        <button onClick={() => navigate("/")} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
          <span className="text-[13px] text-white/85">All changes saved · {timeAgo(savedAt)}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="plain" size="sm" className="text-white hover:bg-white/10" onClick={() => navigate("/")}>Discard</Button>
          <Button variant="secondary" size="sm" onClick={() => { setSavedAt(new Date()); toast({ title: "Draft saved" }); }}>Save draft</Button>
          <Button size="sm" className="bg-white text-foreground hover:bg-white/90 shadow-none" onClick={handleValidate}>Save &amp; validate</Button>
        </div>
      </div>

      <div ref={scrollRoot} className="flex-1 overflow-auto">
        <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-6">
          {/* Breadcrumb + title */}
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2">
            <button className="hover:text-foreground" onClick={() => navigate("/")}>My Projects</button>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">New project</span>
          </div>
          <h1 className="text-[24px] font-semibold sp-display leading-tight">New project</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5 mb-5">Project Identification Form (PIF) · Full-Sized Project · GEF-9</p>

          <Card className="mb-5 py-4"><Stepper steps={STEPPER} current={0} /></Card>

          <div className="flex gap-6">
            {/* Section rail — grouped, contextual */}
            <aside className="hidden lg:block w-60 flex-shrink-0">
              <div className="sticky top-4">
                <Card padding={false} className="p-2">
                  {RAIL_GROUPS.map((grp, gi) => (
                    <div key={grp.label} className={cn(gi > 0 && "mt-3 pt-3 border-t border-border")}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2.5 pb-1.5">{grp.label}</p>
                      <nav className="space-y-0.5">
                        {grp.ids.map((id) => {
                          const active = activeSection === id;
                          return (
                            <button key={id} onClick={() => scrollTo(id)} className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors", active ? "bg-secondary" : "hover:bg-secondary/60")}>
                              <RailIcon status={sectionStatuses[id]} />
                              <span className={cn("text-[13px] font-medium truncate", active ? "text-foreground" : "text-foreground/80")}>{SECTION_META[id].title}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  ))}
                </Card>
              </div>
            </aside>

            {/* Form column */}
            <div className="flex-1 min-w-0 max-w-3xl space-y-5">
              {completionPct === 100 ? (
                <Banner tone="success" title="All required fields complete" action={<Button size="sm" onClick={handleValidate}>Submit for review</Button>}>
                  Your PIF passes Part I validation and is ready to submit for Secretariat review.
                </Banner>
              ) : (
                <Card className="flex items-center gap-3 py-3.5">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(completionPct / 100) * 94.2} 94.2`} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold num">{completionPct}%</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-foreground">{sectionsDone} of {SECTION_ORDER.length} sections complete · {requiredFilled}/{allRequired.length} required fields</p>
                    <p className="text-[12px] text-muted-foreground">
                      {nextIncomplete ? <>Up next: <button onClick={() => scrollTo(nextIncomplete)} className="text-[hsl(var(--info-text))] hover:underline font-medium">{SECTION_META[nextIncomplete].title}</button></> : "Review your entries, then submit."}
                    </p>
                  </div>
                </Card>
              )}

              {/* Basics */}
              <Section refCb={registerRef("basics")} id="basics" status={sectionStatuses["basics"]} {...nav("basics")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="GEF ID"><Input value="Auto-generated on first save" disabled className="text-muted-foreground" /></Field>
                  <Field label="Project Type"><Input value="FSP — Full-Sized Project" disabled className="text-muted-foreground" /></Field>
                </div>
                <Field label="Project Title" required error={errFor("projectTitle") ? "Project title is required." : undefined}>
                  <Input placeholder="e.g. Strengthening climate resilience in coastal watersheds" className={cn(errFor("projectTitle") && "border-[hsl(var(--critical-text))]")} value={form.projectTitle} onChange={(e) => set("projectTitle", e.target.value)} onBlur={() => blur("projectTitle")} />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Type of Trust Fund" required action={<HelpLink k="trust-fund" onHelp={setHelpKey} />} error={errFor("trustFund") ? "Select a trust fund." : undefined}>
                    <Select value={form.trustFund} onValueChange={(v) => { set("trustFund", v); blur("trustFund"); }}>
                      <SelectTrigger className={cn(errFor("trustFund") && "border-[hsl(var(--critical-text))]")}><SelectValue placeholder="Select trust fund" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET — GEF Trust Fund</SelectItem>
                        <SelectItem value="LDCF">LDCF — Least Developed Countries Fund</SelectItem>
                        <SelectItem value="SCCF">SCCF — Special Climate Change Fund</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Lead Agency"><Input value="UNDP" disabled className="text-muted-foreground" /></Field>
                </div>
                <Field label="Project Tags">
                  <div className="flex flex-wrap gap-x-6 gap-y-2.5 pt-1">
                    {[{ k: "cbit", label: "CBIT" }, { k: "bf", label: "BF (Blended Finance)" }, { k: "sgp", label: "SGP (Small Grants)" }, { k: "iplc", label: "Support IPLCs" }, { k: "cso", label: "Support CSOs" }].map((t) => (
                      <label key={t.k} className="flex items-center gap-2 text-[13px] cursor-pointer"><Checkbox checked={!!tags[t.k]} onCheckedChange={(v) => setTags((p) => ({ ...p, [t.k]: !!v }))} /> {t.label}</label>
                    ))}
                  </div>
                </Field>
                <Field label="Lead Agency's Project ID"><Input placeholder="Enter your agency's internal ID" value={form.leadAgencyProjectId} onChange={(e) => set("leadAgencyProjectId", e.target.value)} /></Field>
              </Section>

              {/* Scope */}
              <Section refCb={registerRef("scope")} id="scope" status={sectionStatuses["scope"]} {...nav("scope")}>
                <Field label="Geographic coverage" required error={errFor("coverage") ? "Choose a coverage level." : undefined}>
                  <RadioGroup className="flex gap-6 pt-1" value={form.coverage} onValueChange={(v) => { set("coverage", v); blur("coverage"); }}>
                    {["Global", "Regional", "Country"].map((o) => <label key={o} className="flex items-center gap-2 text-[13px] cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </Field>
                {form.coverage === "Country" && (
                  <Field label="Country">
                    <Select value={form.country} onValueChange={(v) => set("country", v)}>
                      <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent>{["Indonesia", "Kenya", "Philippines", "Costa Rica", "Morocco", "Viet Nam"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Anticipated Executing Entity(s)"><Input placeholder="Enter executing partners" value={form.execEntities} onChange={(e) => set("execEntities", e.target.value)} /></Field>
                  <Field label="Executing Entity Type">
                    <Select value={form.execEntityType} onValueChange={(v) => set("execEntityType", v)}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{["Government", "GEF Agency", "CSO", "Private Sector", "Others"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="GEF Focal Area(s)" required error={errFor("focalArea") ? "Select at least one focal area." : undefined}>
                    <Select value={form.focalArea} onValueChange={(v) => { set("focalArea", v); blur("focalArea"); }}>
                      <SelectTrigger className={cn(errFor("focalArea") && "border-[hsl(var(--critical-text))]")}><SelectValue placeholder="Select focal area" /></SelectTrigger>
                      <SelectContent>{["Biodiversity", "Climate Change", "Land Degradation", "International Waters", "Chemicals and Waste", "Multi Focal Area"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Sector">
                    <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                      <SelectTrigger><SelectValue placeholder="Select sector" /></SelectTrigger>
                      <SelectContent>{["Agriculture", "Energy", "Forestry", "Water", "Urban", "Fisheries"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Taxonomy" required action={<HelpLink k="taxonomy" onHelp={setHelpKey} />} error={errFor("taxonomy") ? "Pick at least one taxonomy keyword." : undefined}>
                  <Select value={form.taxonomy} onValueChange={(v) => { set("taxonomy", v); blur("taxonomy"); }}>
                    <SelectTrigger className={cn(errFor("taxonomy") && "border-[hsl(var(--critical-text))]")}><SelectValue placeholder="Select from the list" /></SelectTrigger>
                    <SelectContent>{["Influencing models", "Stakeholders", "Gender Equality", "Focal Areas / Climate Change", "Focal Areas / Biodiversity"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </Section>

              {/* Rio */}
              <Section refCb={registerRef("rio")} id="rio" status={sectionStatuses["rio"]} {...nav("rio")}>
                <Field label="Rio Markers" required action={<HelpLink k="rio-markers" onHelp={setHelpKey} />} help="Score each 0 (not targeted), 1 (significant) or 2 (principal).">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {([{ k: "ccm", label: "Climate Change Mitigation" }, { k: "cca", label: "Climate Change Adaptation" }, { k: "biodiversity", label: "Biodiversity" }, { k: "landDeg", label: "Land Degradation" }] as const).map((m) => (
                      <div key={m.k}>
                        <label className="text-[12px] font-medium text-muted-foreground mb-1 block">{m.label}<Req /></label>
                        <Select value={form[m.k]} onValueChange={(v) => { set(m.k, v); blur(m.k); }}>
                          <SelectTrigger className={cn(errFor(m.k) && "border-[hsl(var(--critical-text))]")}><SelectValue placeholder="Select score" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 — Not targeted</SelectItem>
                            <SelectItem value="1">1 — Significant</SelectItem>
                            <SelectItem value="2">2 — Principal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </Field>
                <Field label="Involves at least one Fragile / Conflict-affected Situation (FCS)?" required action={<HelpLink k="fcs" onHelp={setHelpKey} />} error={errFor("fcs") ? "Please answer Yes or No." : undefined}>
                  <RadioGroup className="flex gap-6 pt-1" value={form.fcs} onValueChange={(v) => { set("fcs", v); blur("fcs"); }}>
                    {["Yes", "No"].map((o) => <label key={o} className="flex items-center gap-2 text-[13px] cursor-pointer"><RadioGroupItem value={o} /> {o}</label>)}
                  </RadioGroup>
                </Field>
                {form.fcs === "Yes" && <Field label="If your agency uses its own FCS classification, justify it"><Textarea placeholder="Enter justification" className="min-h-[80px]" value={form.fcsJustification} onChange={(e) => set("fcsJustification", e.target.value)} /></Field>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Financing for IPLC-led actions ($)" action={<HelpLink k="iplc" onHelp={setHelpKey} />}><MoneyInput value={form.iplcAmount} onChange={(v) => set("iplcAmount", v)} /></Field>
                  <Field label="Financing for CSO-led actions ($)" action={<HelpLink k="cso" onHelp={setHelpKey} />}><MoneyInput value={form.csoAmount} onChange={(v) => set("csoAmount", v)} /></Field>
                </div>
              </Section>

              {/* Duration */}
              <Section refCb={registerRef("duration")} id="duration" status={sectionStatuses["duration"]} {...nav("duration")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Duration (months)" required error={errFor("duration") ? "Enter the project duration." : undefined}>
                    <Input inputMode="numeric" placeholder="e.g. 48" className={cn(errFor("duration") && "border-[hsl(var(--critical-text))]")} value={form.duration} onChange={(e) => set("duration", e.target.value.replace(/[^0-9]/g, ""))} onBlur={() => blur("duration")} />
                  </Field>
                  <Field label="Agency Fee ($)"><MoneyInput value={form.agencyFee} onChange={(v) => set("agencyFee", v)} /></Field>
                </div>
              </Section>

              {/* A */}
              <Section refCb={registerRef("sec-a")} id="sec-a" status={sectionStatuses["sec-a"]} {...nav("sec-a")}>
                <RowsEditor<ElementRow>
                  cols={[{ key: "direction", label: "Programming Direction", type: "text", wide: true }, { key: "trustFund", label: "Trust Fund", type: "select", options: ["GET", "LDCF", "SCCF"] }, { key: "gef", label: "GEF Financing", type: "money" }, { key: "cofin", label: "Co-Financing", type: "money" }]}
                  rows={elementRows} setRows={setElementRows} makeEmpty={() => ({ direction: "", trustFund: "", gef: "", cofin: "" })}
                  totals={[{ key: "gef", label: "GEF Financing" }, { key: "cofin", label: "Co-Financing" }]} addLabel="Add element" />
              </Section>

              {/* B */}
              <Section refCb={registerRef("sec-b")} id="sec-b" status={sectionStatuses["sec-b"]} {...nav("sec-b")}>
                <Field label="Project Objective" required error={errFor("objective") ? "A project objective is required." : undefined}
                  action={<span className={cn("text-[12px]", objectiveWords > 200 ? "text-[hsl(var(--critical-text))]" : "text-muted-foreground")}>{objectiveWords}/200 words</span>}>
                  <Textarea placeholder="A sentence or two describing the objective (max ~200 words)." className={cn("min-h-[100px]", errFor("objective") && "border-[hsl(var(--critical-text))]")} value={form.objective} onChange={(e) => set("objective", e.target.value)} onBlur={() => blur("objective")} />
                </Field>
                <div>
                  <p className="text-[13px] font-medium text-foreground mb-2">Project Components</p>
                  <RowsEditor<ComponentRow>
                    cols={[{ key: "component", label: "Component", type: "text", wide: true }, { key: "type", label: "Type", type: "select", options: ["Investment", "Technical Assistance"] }, { key: "outcomes", label: "Expected Outcomes", type: "text", wide: true }, { key: "outputs", label: "Expected Outputs", type: "text", wide: true }, { key: "trustFund", label: "Trust Fund", type: "select", options: ["GET", "LDCF", "SCCF"] }, { key: "gef", label: "GEF Financing", type: "money" }, { key: "cofin", label: "Co-Financing", type: "money" }]}
                    rows={componentRows} setRows={setComponentRows} makeEmpty={() => ({ component: "", type: "", outcomes: "", outputs: "", trustFund: "", gef: "", cofin: "" })} addLabel="Add component" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <p className="text-[13px] font-medium text-foreground">Project Management Cost (PMC)</p>
                    <button type="button" onClick={() => setHelpKey("pmc")} className="text-[hsl(var(--info-text))]"><HelpCircle className="w-3.5 h-3.5" /></button>
                  </div>
                  <RowsEditor<MoneyRow>
                    cols={[{ key: "item", label: "Item", type: "text", wide: true }, { key: "trustFund", label: "Trust Fund", type: "select", options: ["GET", "LDCF", "SCCF"] }, { key: "gef", label: "GEF Financing", type: "money" }, { key: "cofin", label: "Co-Financing", type: "money" }]}
                    rows={pmcRows} setRows={setPmcRows} makeEmpty={() => ({ item: "", trustFund: "", gef: "", cofin: "" })} addLabel="Add PMC line" />
                </div>
                <div className="rounded-lg bg-secondary px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-[13px] font-semibold text-foreground">Total Project Cost</span>
                  <div className="flex items-center gap-8">
                    <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">GEF</div><div className="text-[13px] font-semibold num">$ {money(bGef + pmcGef)}</div></div>
                    <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Co-Fin</div><div className="text-[13px] font-semibold num">$ {money(bCofin + pmcCofin)}</div></div>
                    <div className="text-right"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total</div><div className="text-[15px] font-bold num">$ {money(bGef + pmcGef + bCofin + pmcCofin)}</div></div>
                  </div>
                </div>
                <Field label="Justification"><Textarea placeholder="Provide justification for the components and costs above." className="min-h-[70px]" value={form.justification} onChange={(e) => set("justification", e.target.value)} /></Field>
              </Section>

              {/* C */}
              <Section refCb={registerRef("sec-c")} id="sec-c" status={sectionStatuses["sec-c"]} helpKey="cofinancing" onHelp={setHelpKey} {...nav("sec-c")}>
                <RowsEditor<MoneyRow>
                  cols={[{ key: "source", label: "Source", type: "select", options: ["Recipient Country Government", "GEF Agency", "Donor Agency", "Private Sector", "CSO"] }, { key: "name", label: "Name of Co-financier", type: "text" }, { key: "type", label: "Type", type: "select", options: ["Grant", "Loan", "Equity", "In-kind", "Guarantee"] }, { key: "mobilized", label: "Investment Mobilized", type: "select", options: ["Investment mobilized", "Recurrent expenditures"] }, { key: "amount", label: "Amount", type: "money" }]}
                  rows={cofinRows} setRows={setCofinRows} makeEmpty={() => ({ source: "", name: "", type: "", mobilized: "", amount: "" })}
                  totals={[{ key: "amount", label: "Total Co-financing" }]} addLabel="Add source" />
              </Section>

              {/* D */}
              <Section refCb={registerRef("sec-d")} id="sec-d" status={sectionStatuses["sec-d"]} {...nav("sec-d")}>
                <RowsEditor<MoneyRow>
                  cols={[{ key: "agency", label: "GEF Agency", type: "select", options: ["UNDP", "UNEP", "World Bank", "FAO", "IFAD"] }, { key: "trustFund", label: "Trust Fund", type: "select", options: ["GET", "LDCF", "SCCF"] }, { key: "country", label: "Country / Regional / Global", type: "text" }, { key: "focalArea", label: "Focal Area", type: "select", options: ["Biodiversity", "Climate Change", "Land Degradation", "International Waters", "Chemicals and Waste"] }, { key: "grant", label: "GEF Project Grant", type: "money" }, { key: "fee", label: "Agency Fee", type: "money" }]}
                  rows={trustFundRows} setRows={setTrustFundRows} makeEmpty={() => ({ agency: "", trustFund: "", country: "", focalArea: "", grant: "", fee: "" })}
                  totals={[{ key: "grant", label: "Project Grant" }, { key: "fee", label: "Agency Fee" }]} addLabel="Add resource line" />
              </Section>

              {/* E */}
              <Section refCb={registerRef("sec-e")} id="sec-e" status={sectionStatuses["sec-e"]} helpKey="ppg" onHelp={setHelpKey}>
                <label className="flex items-center gap-2.5 text-[13px] cursor-pointer"><Checkbox checked={ppgRequired} onCheckedChange={(v) => setPpgRequired(!!v)} /> PPG required for this project</label>
                {ppgRequired && <Field label="PPG Amount requested ($)" help="Capped by project size per GEF policy."><div className="max-w-xs"><MoneyInput value={form.ppgAmount} onChange={(v) => set("ppgAmount", v)} /></div></Field>}
              </Section>

              <div className="flex items-center justify-end gap-2 pt-1 pb-16">
                <Button variant="plain" onClick={() => navigate("/")}>Cancel</Button>
                <Button variant="secondary" onClick={() => { setSavedAt(new Date()); toast({ title: "Draft saved" }); }}>Save draft</Button>
                <Button onClick={handleValidate}>Save &amp; validate</Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help drawer */}
      <Sheet open={!!helpKey} onOpenChange={(o) => !o && setHelpKey(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {glossary && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><HelpCircle className="w-5 h-5 text-[hsl(var(--info-text))]" /> {glossary.title}</SheetTitle>
                <SheetDescription className="text-left leading-relaxed pt-2 text-foreground/80 text-[14px]">{glossary.body}</SheetDescription>
              </SheetHeader>
              {glossary.scored && (
                <div className="mt-5 space-y-2">
                  {[{ s: "0", t: "Not targeted", d: "The project does not target this objective." }, { s: "1", t: "Significant", d: "An important but secondary objective." }, { s: "2", t: "Principal", d: "A fundamental objective and reason for the project." }].map((r) => (
                    <div key={r.s} className="flex gap-3 rounded-lg border border-border p-3">
                      <div className="w-7 h-7 rounded-full bg-secondary text-foreground font-semibold text-sm flex items-center justify-center flex-shrink-0 num">{r.s}</div>
                      <div><div className="text-[13px] font-medium text-foreground">{r.t}</div><div className="text-[12px] text-muted-foreground">{r.d}</div></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Related terms</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GLOSSARY).filter(([k]) => k !== helpKey).map(([k, v]) => (
                    <button key={k} onClick={() => setHelpKey(k)} className="text-[12px] px-2.5 py-1 rounded-lg bg-secondary hover:bg-[hsl(var(--shade-30))] transition-colors">{v.title.split(" — ")[0]}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now"; if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
