import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  Grid3X3,
  Tags,
  Building2,
  Puzzle,
  PlusCircle,
  Home,
  FileText,
  Layers,
  LayoutDashboard,
  FileBarChart,
  FilePieChart,
  User,
  MapPin,
  Truck,
  BoxIcon,
  Settings,
  Receipt,
  Handshake,
  Wrench,
  Webhook,
  Activity,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  GitFork,
  RefreshCw,
  MonitorCheck,
  Store,
  MoreHorizontal,
  Package,
  Ruler,
  DollarSign,
  ListChecks,
  FolderOpen,
  ArrowLeftRight,
  Info,
  Users,
  BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type L1NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  l2Key: string | null;
  dividerBefore?: boolean;
};

// L1 Navigation - Icon + label below
export const l1NavItems: L1NavItem[] = [
  { name: "Company", href: "/company", icon: LayoutGrid, l2Key: "company" },
  { name: "Home", href: "/home", icon: Home, l2Key: null },
  { name: "Products", href: "/", icon: ClipboardList, l2Key: "products" },
  { name: "Orders", href: "/orders", icon: ShoppingCart, l2Key: "orders" },
  { name: "Analytics", href: "/analytics", icon: TrendingUp, l2Key: "analytics" },
  { name: "Workflows", href: "/workflow", icon: GitFork, l2Key: null },
  { name: "Extensions", href: "/extensions", icon: Puzzle, l2Key: null },
  { name: "Konnect", href: "/konnect", icon: RefreshCw, l2Key: null, dividerBefore: true },
  { name: "Store OS", href: "/pos", icon: MonitorCheck, l2Key: null },
];

// Sales channels - can be multiple
export type SalesChannel = {
  id: string;
  name: string;
  href: string;
};

export const salesChannels: SalesChannel[] = [
  { id: "just-dogs", name: "Just Dogs", href: "/sales-channel/just-dogs" },
  { id: "parysu", name: "Parysu", href: "/sales-channel/parysu" },
  { id: "gift", name: "Gift", href: "/sales-channel/gift" },
];

// Generate L2 items for each sales channel
export function getSalesChannelL2(channel: SalesChannel): L2Section {
  return {
    title: channel.name,
    items: [
      { name: "Analytics", href: `${channel.href}/analytics`, icon: TrendingUp },
      {
        name: "Products",
        href: "#",
        icon: Home,
        hideChildIcons: true,
        children: [
          { name: `${channel.name} Products`, href: `${channel.href}/products`, icon: Home },
          { name: "Price Factory", href: `${channel.href}/price-factory`, icon: DollarSign },
          { name: "Listing Control", href: `${channel.href}/listing-control`, icon: ListChecks },
          { name: "Collections", href: `${channel.href}/collections`, icon: FolderOpen },
          { name: "Variant", href: `${channel.href}/variants`, icon: Layers },
          { name: "Compare", href: `${channel.href}/compare`, icon: ArrowLeftRight },
          { name: "Brands", href: `${channel.href}/brands`, icon: Building2 },
          { name: "Category", href: `${channel.href}/category`, icon: Grid3X3 },
          { name: "Details", href: `${channel.href}/details`, icon: Info },
          { name: "Seller Details", href: `${channel.href}/seller-details`, icon: Users },
          { name: "B2B Pricing", href: `${channel.href}/b2b-pricing`, icon: BadgeDollarSign },
          { name: "Configuration", href: `${channel.href}/configuration`, icon: Settings },
        ],
      },
    ],
  };
}

export type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
  hideChildIcons?: boolean;
};

export type L2Section = {
  title: string;
  items: NavItem[];
};

// L2 Navigation - Contextual submenu
export const l2NavItems: Record<string, L2Section> = {
  products: {
    title: "Products",
    items: [
      { name: "My products", href: "/", icon: Home },
      { name: "Category", href: "/category", icon: Grid3X3 },
      { name: "Attributes", href: "/attributes", icon: Tags },
      { name: "Brands", href: "/brands", icon: Building2 },
      { name: "Size Guide", href: "/size-guide", icon: Ruler },
      { name: "Inventory", href: "/inventory", icon: Package },
    ],
  },
  orders: {
    title: "Orders",
    items: [
      { name: "My Orders", href: "/orders", icon: FileText },
      { name: "Manifest", href: "/orders/manifest", icon: Layers },
      { name: "Bulk Action", href: "/orders/bulk-action", icon: Layers },
    ],
  },
  analytics: {
    title: "Analytics",
    items: [
      { name: "Dashboards", href: "/analytics", icon: LayoutDashboard },
      { name: "Reports", href: "/analytics/reports", icon: FileBarChart },
      { name: "Custom Reports", href: "/analytics/custom-reports", icon: FilePieChart },
    ],
  },
  company: {
    title: "Company",
    items: [
      { name: "Home", href: "/company", icon: Home },
      { name: "Profile", href: "/company/profile", icon: User },
      { name: "Location", href: "/company/location", icon: MapPin },
      {
        name: "Logistics",
        href: "#",
        icon: Truck,
        children: [
          { name: "Delivery Partner", href: "/company/logistics/delivery-partner", icon: Truck },
          { name: "Package", href: "/company/logistics/package", icon: BoxIcon },
        ],
      },
      {
        name: "Tools",
        href: "#",
        icon: Wrench,
        children: [],
      },
      {
        name: "Settings",
        href: "#",
        icon: Settings,
        children: [
          { name: "Taxation", href: "/company/settings/taxation", icon: Receipt },
          { name: "Selling Partners", href: "/company/settings/selling-partners", icon: Handshake },
          { name: "Tools", href: "/company/settings/tools", icon: Wrench },
          { name: "Webhook", href: "/company/settings/webhook", icon: Webhook },
          { name: "Activity Log", href: "/company/settings/activity-log", icon: Activity },
        ],
      },
    ],
  },
};

// Flatten all hrefs for a given L2 key (including nested children)
function getAllHrefs(items: NavItem[]): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.href !== "#") hrefs.push(item.href);
    if (item.children) hrefs.push(...getAllHrefs(item.children));
  }
  return hrefs;
}

function isChildActive(item: NavItem, pathname: string): boolean {
  if (item.children) {
    return item.children.some(c => pathname === c.href || pathname.startsWith(c.href + "/"));
  }
  return false;
}

function NavItemLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;

  if (item.children && item.children.length > 0) {
    const childActive = isChildActive(item, pathname);
    return (
      <Collapsible defaultOpen={childActive}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
            childActive
              ? "text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn(
            "ml-4 pl-2 border-l border-border mt-0.5",
            item.hideChildIcons ? "space-y-1" : "space-y-0.5"
          )}>
            {item.children.map(child => (
              <NavLink
                key={child.href}
                to={child.href}
                end
                className={({ isActive: active }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg transition-colors",
                    item.hideChildIcons ? "px-3 py-2 text-[13px]" : "px-3 py-1.5 text-sm",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {!item.hideChildIcons && <child.icon className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{child.name}</span>
              </NavLink>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Items with empty children array (like Tools) - render as non-link
  if (item.children && item.children.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-default">
        <item.icon className="w-4 h-4 flex-shrink-0" />
        <span>{item.name}</span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      end
      className={({ isActive: active }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      <span>{item.name}</span>
    </NavLink>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeL2, setActiveL2] = useState<string | null>(null);

  // Determine active L1/sales channel based on current path
  const getActiveL1 = (): string | null => {
    // Check sales channels first
    for (const channel of salesChannels) {
      if (location.pathname.startsWith(channel.href)) {
        return `sc-${channel.id}`;
      }
    }
    for (const [key, section] of Object.entries(l2NavItems)) {
      const allHrefs = getAllHrefs(section.items);
      if (allHrefs.some(href => location.pathname === href)) {
        return key;
      }
    }
    if (location.pathname.startsWith("/create") || location.pathname.startsWith("/edit")) {
      return "products";
    }
    // No-L2 pages (Extensions, Konnect, Store OS, Workflows)
    for (const item of l1NavItems) {
      if (!item.l2Key && (location.pathname === item.href || location.pathname.startsWith(item.href + "/"))) {
        return null;
      }
    }
    return "products";
  };

  const currentL2Key = activeL2 || getActiveL1();
  
  // Resolve L2 section: check l2NavItems first, then sales channel dynamic L2
  const getL2Section = (): L2Section | null => {
    if (!currentL2Key) return null;
    if (l2NavItems[currentL2Key]) return l2NavItems[currentL2Key];
    if (currentL2Key.startsWith("sc-")) {
      const channelId = currentL2Key.replace("sc-", "");
      const channel = salesChannels.find(c => c.id === channelId);
      if (channel) return getSalesChannelL2(channel);
    }
    return null;
  };
  const currentL2 = getL2Section();

  return (
    <div className="flex h-full">
      {/* L1 - Icon + Label Navigation Bar */}
      <aside className="w-20 bg-frame flex flex-col items-center py-2">
        <nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-2">
          {l1NavItems.map((item) => {
            const isActive = item.l2Key
              ? item.l2Key === currentL2Key
              : location.pathname === item.href || location.pathname.startsWith(item.href + "/");

            return (
              <div key={item.name} className="w-full">
                {item.dividerBefore && (
                  <div className="w-12 h-px bg-frame-foreground/30 my-2 mx-auto" />
                )}
                <button
                  onClick={() => {
                    if (item.l2Key) {
                      setActiveL2(item.l2Key);
                    } else {
                      setActiveL2(null);
                      navigate(item.href);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg w-full transition-colors",
                    isActive
                      ? "text-white"
                      : "text-frame-foreground hover:text-frame-foreground-active"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    isActive ? "bg-frame-muted" : "hover:bg-frame-muted"
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{item.name}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Sales Channel - show only the active (or first) channel */}
        <div className="w-full px-2">
          <div className="w-12 h-px bg-frame-foreground/30 my-2 mx-auto" />
          {(() => {
            const activeChannel = salesChannels.find(c => location.pathname.startsWith(c.href)) || salesChannels[0];
            if (!activeChannel) return null;
            const scKey = `sc-${activeChannel.id}`;
            const isActive = currentL2Key === scKey || location.pathname.startsWith(activeChannel.href);
            const otherChannels = salesChannels.filter(c => c.id !== activeChannel.id);
            return (
              <div className="w-full">
                <button
                  onClick={() => setActiveL2(scKey)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-lg w-full transition-colors",
                    isActive
                      ? "text-white"
                      : "text-frame-foreground hover:text-frame-foreground-active"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    isActive ? "bg-frame-muted" : "hover:bg-frame-muted"
                  )}>
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight truncate max-w-[64px]">{activeChannel.name}</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Channel switcher kebab */}
        <div className="w-full flex justify-center my-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded flex items-center justify-center text-frame-foreground hover:text-frame-foreground-active hover:bg-frame-muted transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-44">
              {salesChannels.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => {
                  setActiveL2(`sc-${c.id}`);
                  navigate(c.href);
                }}>
                  <Store className="w-4 h-4 mr-2" />
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* New Sales Channel button */}
        <div className="w-12 h-px bg-frame-foreground/30 my-2 mx-auto" />
        <button className="flex flex-col items-center justify-center gap-1.5 py-2 px-1 w-full mx-2 mb-2 text-frame-foreground hover:text-frame-foreground-active transition-colors">
          <div className="w-9 h-9 rounded-full border-2 border-dashed border-frame-foreground/50 flex items-center justify-center">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium leading-tight text-center">New Sales<br/>Channel</span>
        </button>
      </aside>

      {/* L2 - Contextual Panel */}
      {currentL2 && (
        <aside className="w-52 bg-card border-r border-border flex flex-col rounded-tl-3xl">
          <nav className="flex-1 p-2 space-y-0.5 pt-4">
            {currentL2.items.map((item) => (
              <NavItemLink key={item.name} item={item} pathname={location.pathname} />
            ))}
          </nav>
        </aside>
      )}
    </div>
  );
}
