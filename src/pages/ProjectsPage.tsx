import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, Plus, SquarePen, FileText, X, ArrowUpDown, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Banner, Card, type Tone } from "@/components/polaris/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type TabKey = "my-actions" | "draft" | "returned" | "submitted";

type Project = {
  gefId: string; name: string; type: "EA" | "MSP" | "FSP"; country: string; agency: string;
  focalArea: string; programManager: string; status: string; updated: string; tabs: TabKey[];
};

const PROJECTS: Project[] = [
  { gefId: "12266", name: "Strengthening Indonesia's Preparation on Second and Third Biennial Transparency Reports to the UNFCCC (BTR 2 and BTR3 Indonesia)", type: "EA", country: "Indonesia", agency: "UNDP", focalArea: "Climate Change", programManager: "Saba Kalam", status: "CEO Endorsement Returned", updated: "2 days ago", tabs: ["my-actions", "returned"] },
  { gefId: "12117", name: "ACT-BIOFOULING: Accelerating Collaboration and Transformation for Biodiversity and Climate Change Mitigation through Biofouling Management", type: "MSP", country: "Global", agency: "UNDP", focalArea: "International Waters", programManager: "Taylor Henshaw", status: "Returned from GEFSEC", updated: "5 days ago", tabs: ["my-actions", "returned"] },
  { gefId: "12080", name: "Promoting Sustainable Land Management to Achieve Land Degradation Neutrality (LDN) in the Aylagundet Watershed, Debub Region, Eritrea", type: "FSP", country: "Eritrea", agency: "UNDP", focalArea: "Multi Focal Area", programManager: "Asha Bobb-Semple", status: "Returned from GEFSEC", updated: "1 week ago", tabs: ["my-actions", "returned"] },
  { gefId: "12060", name: "Integrated Management for Ecosystem Services Restoration, Biodiversity Conservation and Enhanced Climate Action in Syria (Latakia Governate)", type: "FSP", country: "Syria", agency: "UNDP", focalArea: "Multi Focal Area", programManager: "Alla Ljungman", status: "Returned from GEFSEC", updated: "1 week ago", tabs: ["my-actions", "returned"] },
  { gefId: "12120", name: "Enabling China to Prepare Its Fifth National Communication, Second and Third Biennial Transparency Reports on Climate Change", type: "EA", country: "China", agency: "UNDP", focalArea: "Climate Change", programManager: "Saba Kalam", status: "CEO Endorsement Returned", updated: "3 days ago", tabs: ["my-actions", "returned"] },
  { gefId: "12004", name: "Integrated Management of Small Island Landscapes and Seascapes for Biodiversity, Ecosystem Services, and Climate Resilience in the Philippines (ISLAS)", type: "FSP", country: "Philippines", agency: "UNDP", focalArea: "Biodiversity", programManager: "Jurgis Sapijanskas", status: "Returned from GEFSEC", updated: "4 days ago", tabs: ["my-actions", "returned"] },
  { gefId: "11965", name: "Nature Safe – Nature Positive Renewable Energy Development in Egypt", type: "MSP", country: "Egypt", agency: "UNDP", focalArea: "Biodiversity", programManager: "Remy Ruat", status: "Returned from GEFSEC", updated: "6 days ago", tabs: ["my-actions", "returned"] },
  { gefId: "11958", name: "National Implementation Plan Update for Costa Rica under the Stockholm Convention", type: "EA", country: "Costa Rica", agency: "UNDP", focalArea: "Chemicals and Waste", programManager: "Jewel Batchasingh", status: "CEO Endorsement Returned", updated: "1 day ago", tabs: ["my-actions", "returned"] },
  { gefId: "12310", name: "Community-Led Mangrove Restoration and Blue Carbon Financing across Coastal Kenya", type: "FSP", country: "Kenya", agency: "UNDP", focalArea: "Multi Focal Area", programManager: "Asha Bobb-Semple", status: "Draft", updated: "Yesterday", tabs: ["draft"] },
  { gefId: "12318", name: "Scaling Circular Economy Solutions for Plastic Waste in Viet Nam's River Deltas", type: "MSP", country: "Viet Nam", agency: "UNDP", focalArea: "Chemicals and Waste", programManager: "Remy Ruat", status: "Draft", updated: "3 days ago", tabs: ["draft"] },
  { gefId: "12291", name: "Strengthening Protected Area Networks for Jaguar Conservation in the Colombian Amazon", type: "FSP", country: "Colombia", agency: "UNDP", focalArea: "Biodiversity", programManager: "Jurgis Sapijanskas", status: "Submitted to GEFSEC", updated: "2 weeks ago", tabs: ["submitted"] },
  { gefId: "12275", name: "Accelerating the Just Energy Transition through Distributed Solar in Rural Morocco", type: "EA", country: "Morocco", agency: "UNDP", focalArea: "Climate Change", programManager: "Saba Kalam", status: "Under Review", updated: "5 days ago", tabs: ["submitted"] },
  { gefId: "12252", name: "Transboundary Water Resource Governance in the Lake Chad Basin", type: "FSP", country: "Regional", agency: "UNDP", focalArea: "International Waters", programManager: "Taylor Henshaw", status: "Submitted to GEFSEC", updated: "3 weeks ago", tabs: ["submitted"] },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "my-actions", label: "My actions" },
  { key: "draft", label: "Draft" },
  { key: "returned", label: "Returned" },
  { key: "submitted", label: "Submitted" },
];

const TYPES = ["EA", "MSP", "FSP"] as const;
const FOCAL_AREAS = ["Climate Change", "Biodiversity", "Multi Focal Area", "International Waters", "Chemicals and Waste"];
const SORTS = [
  { key: "recent", label: "Recently updated" },
  { key: "gefId", label: "GEF ID" },
  { key: "country", label: "Country (A–Z)" },
  { key: "manager", label: "Program manager (A–Z)" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function statusTone(status: string): Tone {
  if (/CEO Endorsement Returned/i.test(status)) return "critical";
  if (/returned/i.test(status)) return "warning";
  if (/draft/i.test(status)) return "new";
  if (/review/i.test(status)) return "attention";
  if (/submitted/i.test(status)) return "info";
  return "new";
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("my-actions");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [focalFilter, setFocalFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recent");
  const [filterOpen, setFilterOpen] = useState(false);

  const counts = useMemo(() => {
    const m: Record<TabKey, number> = { "my-actions": 0, draft: 0, returned: 0, submitted: 0 };
    for (const p of PROJECTS) for (const t of p.tabs) m[t] += 1;
    return m;
  }, []);

  const activeFilters = typeFilter.length + focalFilter.length;

  const rows = useMemo(() => {
    let r = PROJECTS.filter((p) => p.tabs.includes(tab));
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((p) => [p.gefId, p.name, p.country, p.programManager, p.focalArea].some((f) => f.toLowerCase().includes(q)));
    if (typeFilter.length) r = r.filter((p) => typeFilter.includes(p.type));
    if (focalFilter.length) r = r.filter((p) => focalFilter.includes(p.focalArea));
    if (sort === "gefId") r = [...r].sort((a, b) => Number(a.gefId) - Number(b.gefId));
    else if (sort === "country") r = [...r].sort((a, b) => a.country.localeCompare(b.country));
    else if (sort === "manager") r = [...r].sort((a, b) => a.programManager.localeCompare(b.programManager));
    return r;
  }, [tab, search, typeFilter, focalFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * rowsPerPage;
  const paged = rows.slice(start, start + rowsPerPage);
  const returnedCount = PROJECTS.filter((p) => /returned/i.test(p.status)).length;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    setPage(1);
  };

  const CheckRow = ({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) => (
    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-[13px]">
      <Checkbox checked={checked} onCheckedChange={onToggle} /> {label}
    </label>
  );

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold sp-display">My Projects</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Project Identification Forms across the GEF-9 cycle.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/new")}><Plus className="w-4 h-4" /> Create project</Button>
        </div>
      </div>

      {/* Insight banner (Polaris Banner — soft warning) */}
      {tab === "my-actions" && (
        <div className="mb-4">
          <Banner tone="warning" title={`${counts["my-actions"]} projects need your attention`}>
            {returnedCount} were returned by the GEF Secretariat and are waiting on revisions before they can move forward.
          </Banner>
        </div>
      )}

      {/* Index card */}
      <Card padding={false} className="overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-2 pt-1.5 border-b border-border overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
                className={cn("relative flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium transition-colors mb-1.5",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60")}>
                {t.label}
                <span className={cn("text-[11px] px-1.5 rounded-md", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>{counts[t.key]}</span>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search in view" className="w-full h-9 rounded-lg border border-input bg-card pl-9 pr-8 text-[13px] outline-none focus:ring-2 focus:ring-ring/70 focus:border-foreground transition-colors"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>

          {/* Filter popover */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-1.5">
                <SlidersHorizontal className="w-4 h-4" /> Filter
                {activeFilters > 0 && <span className="text-[11px] bg-primary text-primary-foreground rounded px-1.5">{activeFilters}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pt-1 pb-1.5">Project type</p>
              {TYPES.map((t) => <CheckRow key={t} checked={typeFilter.includes(t)} label={t} onToggle={() => toggle(typeFilter, setTypeFilter, t)} />)}
              <div className="h-px bg-border my-1.5" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-1.5">Focal area</p>
              {FOCAL_AREAS.map((f) => <CheckRow key={f} checked={focalFilter.includes(f)} label={f} onToggle={() => toggle(focalFilter, setFocalFilter, f)} />)}
              {activeFilters > 0 && (
                <>
                  <div className="h-px bg-border my-1.5" />
                  <button className="text-[12px] text-[hsl(var(--info-text))] hover:underline px-2 py-1" onClick={() => { setTypeFilter([]); setFocalFilter([]); }}>Clear all filters</button>
                </>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-1.5"><ArrowUpDown className="w-4 h-4" /> Sort</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {SORTS.map((s) => (
                <DropdownMenuItem key={s.key} onClick={() => setSort(s.key)} className="text-[13px] cursor-pointer justify-between">
                  {s.label} {sort === s.key && <Check className="w-3.5 h-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 py-2 border-b border-border bg-[#fafafa]">
            {[...typeFilter.map((t) => ({ v: t, list: typeFilter, set: setTypeFilter })), ...focalFilter.map((f) => ({ v: f, list: focalFilter, set: setFocalFilter }))].map(({ v, list, set }) => (
              <button key={v} onClick={() => toggle(list, set, v)} className="inline-flex items-center gap-1 text-[12px] bg-card border border-border rounded-md pl-2 pr-1 py-0.5 hover:bg-secondary">
                {v} <X className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Index table */}
        {paged.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-medium text-foreground">No projects in this view</p>
            <p className="text-[13px] text-muted-foreground mt-1">{search || activeFilters ? "Try clearing your search or filters." : "Nothing to show yet."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse">
              <thead>
                <tr className="bg-[#fafafa] border-b border-border">
                  <th className="text-left text-[12px] font-medium text-muted-foreground pl-4 pr-3 py-2.5 w-[78px]">GEF ID</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5 w-[30%]">Project</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5 w-[56px]">Type</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5">Country</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5">Focal area</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5">Program manager</th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground px-3 py-2.5">Status</th>
                  <th className="w-[84px]"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <tr key={p.gefId} className="border-b border-border last:border-0 hover:bg-[#fafafa] transition-colors group cursor-pointer" onClick={() => navigate("/new")}>
                    <td className="pl-4 pr-3 py-3 align-top text-[13px] text-muted-foreground num">{p.gefId}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-2 max-w-[340px]">{p.name}</div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">{p.agency}</div>
                    </td>
                    <td className="px-3 py-3 align-top"><span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-secondary text-[11px] font-medium text-foreground">{p.type}</span></td>
                    <td className="px-3 py-3 align-top text-[13px] text-foreground whitespace-nowrap">{p.country}</td>
                    <td className="px-3 py-3 align-top text-[13px] text-muted-foreground">{p.focalArea}</td>
                    <td className="px-3 py-3 align-top text-[13px] text-foreground whitespace-nowrap">{p.programManager}</td>
                    <td className="px-3 py-3 align-top">
                      <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                      <div className="text-[11px] text-muted-foreground mt-1">Updated {p.updated}</div>
                    </td>
                    <td className="px-3 py-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip><TooltipTrigger asChild><button className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground" onClick={() => navigate("/new")}><SquarePen className="w-4 h-4" /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild><button className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"><FileText className="w-4 h-4" /></button></TooltipTrigger><TooltipContent>View document</TooltipContent></Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-[#fafafa]">
          <span className="text-[12px] text-muted-foreground">{rows.length === 0 ? "0 results" : `${start + 1}–${Math.min(start + rowsPerPage, rows.length)} of ${rows.length}`}</span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-40 hover:bg-secondary transition-colors" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-40 hover:bg-secondary transition-colors" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </Card>
    </div>
  );
}
