import { NavLink, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, House, FolderKanban, BookOpen, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import gefMark from "@/assets/gef-mark.svg";

const NAV = [
  { label: "My Projects", href: "/", icon: House, end: true },
  { label: "All Submissions", href: "/submissions", icon: FolderKanban },
  { label: "Templates & Guidelines", href: "/resources", icon: BookOpen },
  { label: "Help center", href: "/help", icon: LifeBuoy },
];

function TopBar() {
  return (
    <header className="h-14 bg-[hsl(var(--topbar))] text-[hsl(var(--topbar-foreground))] flex items-center gap-4 px-4 flex-shrink-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <img src={gefMark} alt="" className="w-7 h-7" />
        <span className="text-[15px] font-semibold tracking-tight">GEF Portal</span>
      </div>

      {/* Global search — Polaris top bar search field */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
          <input
            placeholder="Search projects, GEF IDs, countries"
            className="w-full h-9 rounded-lg bg-white/10 hover:bg-white/[0.14] focus:bg-white pl-9 pr-3 text-[13px] text-white focus:text-foreground placeholder:text-white/55 focus:placeholder:text-muted-foreground border border-white/15 focus:border-transparent outline-none transition-colors"
          />
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-1.5 min-w-[200px] justify-end">
        <button className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-white/10 transition-colors">
          <div className="w-6 h-6 rounded-full bg-[#5c6ac4] text-white text-[11px] font-semibold flex items-center justify-center">B</div>
          <span className="text-[13px] font-medium hidden sm:block">Balaji</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/70" />
        </button>
      </div>
    </header>
  );
}

function LeftNav() {
  return (
    <aside className="w-[232px] flex-shrink-0 bg-[#f1f1f1] border-r border-border hidden lg:flex flex-col py-3 px-3">
      <nav className="space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2.5 h-[34px] rounded-lg text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]"
                  : "text-[#4a4a4a] hover:bg-black/[0.04]",
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-2.5 py-3 rounded-lg bg-card border border-border">
        <p className="text-[12px] font-medium text-foreground">GEF-9 cycle</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          Submissions for the current replenishment close 30 Jun 2027.
        </p>
      </div>
    </aside>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <LeftNav />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
