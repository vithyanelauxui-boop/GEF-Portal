import { Lightbulb, ArrowUpRight, ChevronRight, ChevronDown, ExternalLink, Search } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  suffix?: string;
  hasTooltip?: boolean;
  tooltipText?: string;
}

function MetricCard({ label, value, change, suffix, hasTooltip = true, tooltipText }: MetricCardProps) {
  return (
    <div className="bg-card rounded-xl p-4 flex-1 min-w-[140px]">
      <div className="flex items-center gap-1 mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {hasTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-3.5 h-3.5 text-muted-foreground cursor-help inline-flex items-center justify-center text-[10px] border border-muted-foreground/30 rounded-full">i</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipText || label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-semibold text-foreground">{value}</span>
        {change && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            {change}
          </span>
        )}
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface ChannelItem {
  name: string;
  type: string;
  active: boolean;
  bgColor: string;
  textColor: string;
  initials: string;
  posLive?: boolean;
  onlineLive?: boolean;
}

interface ChannelSection {
  label: string;
  count: number;
  items: ChannelItem[];
}

const channelSections: ChannelSection[] = [
  {
    label: "Sales Channels",
    count: 3,
    items: [
      { name: "Ritu Kumar", type: "POS • Online", active: true, bgColor: "bg-neutral-900", textColor: "text-white", initials: "RK", posLive: true, onlineLive: true },
      { name: "Super Dry", type: "Online Store", active: false, bgColor: "bg-red-100", textColor: "text-red-600", initials: "SD", posLive: false, onlineLive: false },
      { name: "Just Dogs", type: "POS • Online", active: true, bgColor: "bg-blue-600", textColor: "text-white", initials: "JD", posLive: true, onlineLive: true },
    ],
  },
  {
    label: "POS",
    count: 3,
    items: [
      { name: "Ritu Kumar Store", type: "Retail", active: true, bgColor: "bg-neutral-800", textColor: "text-white", initials: "RK" },
      { name: "Just Dogs Outlet", type: "Retail", active: true, bgColor: "bg-blue-600", textColor: "text-white", initials: "JD" },
      { name: "Super Dry Counter", type: "Pop-up", active: false, bgColor: "bg-red-100", textColor: "text-red-600", initials: "SD" },
    ],
  },
  {
    label: "Marketplace",
    count: 6,
    items: [
      { name: "Nykaa Fashion", type: "Fashion", active: false, bgColor: "bg-pink-100", textColor: "text-pink-700", initials: "NF" },
      { name: "Flipkart", type: "Marketplace", active: true, bgColor: "bg-yellow-100", textColor: "text-yellow-700", initials: "FK" },
      { name: "Nykaa", type: "Beauty", active: false, bgColor: "bg-pink-200", textColor: "text-pink-800", initials: "NK" },
      { name: "Amazon", type: "Marketplace", active: true, bgColor: "bg-orange-100", textColor: "text-orange-700", initials: "AZ" },
      { name: "Myntra", type: "Fashion", active: true, bgColor: "bg-purple-100", textColor: "text-purple-700", initials: "MY" },
      { name: "Ajio", type: "Fashion", active: false, bgColor: "bg-teal-100", textColor: "text-teal-700", initials: "AJ" },
    ],
  },
  {
    label: "Collections",
    count: 3,
    items: [
      { name: "Summer 2025", type: "Ritu Kumar", active: true, bgColor: "bg-orange-100", textColor: "text-orange-700", initials: "S2" },
      { name: "Best Sellers", type: "Super Dry", active: true, bgColor: "bg-emerald-100", textColor: "text-emerald-700", initials: "BS" },
      { name: "New Arrivals", type: "Just Dogs", active: true, bgColor: "bg-blue-100", textColor: "text-blue-700", initials: "NA" },
    ],
  },
];

// Sales data for drawer
const salesByChannel = [
  { name: "Ritu Kumar Online", amount: "₹45,200", percentage: 36 },
  { name: "Flipkart", amount: "₹32,100", percentage: 26 },
  { name: "Amazon", amount: "₹25,800", percentage: 21 },
  { name: "Just Dogs POS", amount: "₹12,400", percentage: 10 },
  { name: "Myntra", amount: "₹10,000", percentage: 7 },
];

const unitsByReferrer = [
  { name: "Direct", units: 1120, percentage: 40 },
  { name: "Google Search", units: 700, percentage: 25 },
  { name: "Instagram", units: 420, percentage: 15 },
  { name: "Facebook Ads", units: 336, percentage: 12 },
  { name: "Email Campaign", units: 224, percentage: 8 },
];

function isItemLive(item: ChannelItem, sectionLabel: string): boolean {
  if (sectionLabel === "Sales Channels") {
    return !!(item.posLive || item.onlineLive);
  }
  return item.active;
}

function getLiveCounts() {
  return channelSections.map((section) => {
    const liveCount = section.items.filter((item) => isItemLive(item, section.label)).length;
    return { label: section.label, liveCount, total: section.items.length };
  });
}

function getSectionCountLabel(liveCount: number, total: number): string {
  if (liveCount === 0) return "None Live";
  if (liveCount === total) return `All ${total} Live`;
  return `${liveCount} of ${total} Live`;
}

function sortByLiveFirst(items: ChannelItem[], sectionLabel: string): ChannelItem[] {
  return [...items].sort((a, b) => {
    const aLive = isItemLive(a, sectionLabel);
    const bLive = isItemLive(b, sectionLabel);
    if (aLive === bLive) return 0;
    return aLive ? -1 : 1;
  });
}

function CollapsibleSection({
  title,
  countLabel,
  children,
  defaultOpen = true,
}: {
  title: string;
  countLabel: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between w-full py-2 group"
        >
          <h4 className="text-sm font-semibold text-foreground">
            {title}{" "}
            <span className="font-normal text-muted-foreground text-xs">({countLabel})</span>
          </h4>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ShowMoreList({
  items,
  renderItem,
  limit = 3,
  emptyMessage = "No live items",
}: {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  limit?: number;
  emptyMessage?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
    );
  }

  const visible = showAll ? items : items.slice(0, limit);

  return (
    <div className="space-y-3">
      {visible.map((item, i) => renderItem(item, i))}
      {items.length > limit && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showAll ? "Show less" : `Show ${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

export function ProductInsights() {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoverDrawerOpen, setHoverDrawerOpen] = useState(false);
  const [collectionSearch, setCollectionSearch] = useState("");
  const liveCounts = getLiveCounts();

  const sortedChannels = sortByLiveFirst(channelSections[0].items, "Sales Channels");
  const sortedPOS = sortByLiveFirst(channelSections[1].items, "POS");
  const sortedMarketplaces = sortByLiveFirst(channelSections[2].items, "Marketplace");
  const sortedCollections = sortByLiveFirst(channelSections[3].items, "Collections");

  const filteredCollections = useMemo(() => {
    if (!collectionSearch.trim()) return sortedCollections;
    const q = collectionSearch.toLowerCase();
    return sortedCollections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );
  }, [collectionSearch, sortedCollections]);

  const collectionsLiveCount = channelSections[3].items.filter((c) => c.active).length;
  const collectionsTotal = channelSections[3].items.length;

  const totalCustomers = 820 + 480; // new + returning

  return (
    <div className="space-y-5">
      {/* Published On Banner */}
      {(() => {
        const bannerButton = (
          <button
            type="button"
            onClick={() => isMobile ? setHoverDrawerOpen(true) : setDrawerOpen(true)}
            className="w-full border border-border bg-card rounded-lg px-3 sm:px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-6">
              <div className="flex items-center gap-1.5 shrink-0">
                <Lightbulb className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Published On</span>
              </div>
              <div className="h-4 w-px bg-border shrink-0 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-6">
                {liveCounts.map((lc, idx) => (
                  <div key={lc.label} className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{lc.label}</span>
                    <span className="text-sm font-semibold text-foreground">{lc.liveCount}</span>
                    {idx < liveCounts.length - 1 && <span className="ml-4 text-border">·</span>}
                  </div>
                ))}
              </div>
              <div className="ml-auto shrink-0">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            {/* Mobile: counts below */}
            <div className="flex sm:hidden items-center gap-3 mt-1.5 pl-5.5">
              {liveCounts.map((lc, idx) => (
                <div key={lc.label} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{lc.label}</span>
                  <span className="text-xs font-semibold text-foreground">{lc.liveCount}</span>
                  {idx < liveCounts.length - 1 && <span className="ml-1 text-border">·</span>}
                </div>
              ))}
            </div>
          </button>
        );

        const summaryContent = (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Published On</p>
            <div className="space-y-1.5">
              {liveCounts.map((lc) => (
                <div key={lc.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{lc.label}</span>
                  <span className="font-medium text-foreground">{getSectionCountLabel(lc.liveCount, lc.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metrics (Last 90 days)</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Units Sold</span>
                <span className="font-medium text-foreground">2,800</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Buyers</span>
                <span className="font-medium text-foreground">1,300</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net Sales</span>
                <span className="font-medium text-foreground">₹1,25,500</span>
              </div>
            </div>
          </div>
        );

        if (isMobile) {
          return (
            <>
              {bannerButton}
              <Drawer open={hoverDrawerOpen} onOpenChange={setHoverDrawerOpen}>
                <DrawerContent className="px-4 pb-6 pt-4">
                  {summaryContent}
                  <button
                    type="button"
                    className="w-full mt-4 py-2 text-sm font-medium text-primary border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setHoverDrawerOpen(false);
                      setDrawerOpen(true);
                    }}
                  >
                    View Details
                  </button>
                </DrawerContent>
              </Drawer>
            </>
          );
        }

        return (
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              {bannerButton}
            </HoverCardTrigger>
            <HoverCardContent className="w-72 p-4" side="bottom" align="start">
              {summaryContent}
            </HoverCardContent>
          </HoverCard>
        );
      })()}

      {/* Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-lg font-semibold">Published On</SheetTitle>
          </SheetHeader>

          <div className="py-5 space-y-2">
            {/* Sales Channels */}
            <CollapsibleSection
              title="Sales Channels"
              countLabel={getSectionCountLabel(liveCounts[0].liveCount, liveCounts[0].total)}
            >
              <ShowMoreList
                items={sortedChannels}
                emptyMessage="No sales channels configured"
                renderItem={(item: ChannelItem, i: number) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 rounded-lg ${item.bgColor} ${item.textColor} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={`w-2 h-2 rounded-full ${item.posLive ? "bg-green-500" : "bg-red-500"}`} />
                          POS
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className={`w-2 h-2 rounded-full ${item.onlineLive ? "bg-green-500" : "bg-red-500"}`} />
                          Online
                        </span>
                      </div>
                    </div>
                    <button type="button" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              />
            </CollapsibleSection>

            {/* POS */}
            <CollapsibleSection
              title="POS"
              countLabel={getSectionCountLabel(liveCounts[1].liveCount, liveCounts[1].total)}
            >
              <ShowMoreList
                items={sortedPOS}
                emptyMessage="No POS locations configured"
                renderItem={(item: ChannelItem, i: number) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 rounded-lg ${item.bgColor} ${item.textColor} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${item.active ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs text-muted-foreground">{item.active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                    <button type="button" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              />
            </CollapsibleSection>

            {/* Marketplace */}
            <CollapsibleSection
              title="Marketplace"
              countLabel={getSectionCountLabel(liveCounts[2].liveCount, liveCounts[2].total)}
            >
              <ShowMoreList
                items={sortedMarketplaces}
                emptyMessage="No marketplaces configured"
                renderItem={(item: ChannelItem, i: number) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`w-10 h-10 rounded-lg ${item.bgColor} ${item.textColor} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {item.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${item.active ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs text-muted-foreground">{item.active ? "Live" : "Not Live"}</span>
                      </div>
                    </div>
                    <button type="button" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
              />
            </CollapsibleSection>

            {/* Collections */}
            <CollapsibleSection
              title="Collections"
              countLabel={getSectionCountLabel(collectionsLiveCount, collectionsTotal)}
            >
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search collections..."
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <ShowMoreList
                  items={filteredCollections}
                  emptyMessage={collectionSearch ? "No collections match your search" : "No collections configured"}
                  renderItem={(item: ChannelItem, i: number) => (
                    <div key={i} className="flex items-center gap-3 group">
                      <div className={`w-10 h-10 rounded-lg ${item.bgColor} ${item.textColor} flex items-center justify-center text-xs font-bold shrink-0`}>
                        {item.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.type}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={`w-2 h-2 rounded-full ${item.active ? "bg-green-500" : "bg-red-500"}`} />
                            {item.active ? "Live" : "Not Live"}
                          </span>
                        </div>
                      </div>
                      <button type="button" className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-md">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}
                />
              </div>
            </CollapsibleSection>

            {/* Performance Snapshot */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Performance Snapshot (Last 90 days)</h3>

              {/* Units Sold */}
              <div className="bg-muted/50 rounded-lg px-4 py-3 mb-4">
                <span className="text-2xl font-semibold text-foreground">2,800</span>
                <span className="text-sm text-muted-foreground ml-2">units sold</span>
              </div>

              {/* New vs Returning */}
              <CollapsibleSection title="New vs Returning Customers" countLabel={`${totalCustomers.toLocaleString()} total`} defaultOpen>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-primary" />
                      <span className="text-muted-foreground">New Customers</span>
                    </div>
                    <span className="font-medium text-foreground">820 (63%)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-primary/40" />
                      <span className="text-muted-foreground">Returning Customers</span>
                    </div>
                    <span className="font-medium text-foreground">480 (37%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mt-1">
                    <div className="bg-primary h-full" style={{ width: "63%" }} />
                    <div className="bg-primary/40 h-full" style={{ width: "37%" }} />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Net Sales by Channel */}
              <CollapsibleSection title="Net Sales Breakup by Channel" countLabel={`${salesByChannel.length} channels`}>
                <ShowMoreList
                  items={salesByChannel}
                  emptyMessage="No sales data available"
                  renderItem={(item: typeof salesByChannel[0], i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-8 rounded-full bg-primary" style={{ opacity: 1 - i * 0.15 }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-foreground">{item.amount}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({item.percentage}%)</span>
                      </div>
                    </div>
                  )}
                />
              </CollapsibleSection>

              {/* Units Sold by Referrer */}
              <CollapsibleSection title="Units Sold Breakup by Referrer" countLabel={`${unitsByReferrer.length} sources`}>
                <ShowMoreList
                  items={unitsByReferrer}
                  emptyMessage="No referrer data available"
                  renderItem={(item: typeof unitsByReferrer[0], i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-8 rounded-full bg-accent-foreground/60" style={{ opacity: 1 - i * 0.15 }} />
                        <span className="text-muted-foreground truncate">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-medium text-foreground">{item.units.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({item.percentage}%)</span>
                      </div>
                    </div>
                  )}
                />
              </CollapsibleSection>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
