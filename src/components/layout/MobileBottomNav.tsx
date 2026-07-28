import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  ShoppingCart,
  Store,
  MoreHorizontal,
  ChevronDown,
  MonitorCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { l1NavItems, l2NavItems, salesChannels, getSalesChannelL2, type NavItem, type L1NavItem } from "./AppSidebar";

// Fixed visible tabs on mobile: Products, Orders, Store OS, Sales Channel (virtual), More
const PINNED_KEYS = ["products", "orders", "pos"];
const SALES_CHANNEL_TAB_KEY = "__sales_channels__";

function getAllHrefs(items: NavItem[]): string[] {
  const hrefs: string[] = [];
  for (const item of items) {
    if (item.href !== "#") hrefs.push(item.href);
    if (item.children) hrefs.push(...getAllHrefs(item.children));
  }
  return hrefs;
}

function flattenItems(items: NavItem[]): NavItem[] {
  const flat: NavItem[] = [];
  for (const item of items) {
    if (item.children && item.children.length > 0) {
      flat.push(...item.children);
    } else if (item.href !== "#") {
      flat.push(item);
    }
  }
  return flat;
}

function getActiveSectionKey(pathname: string): string {
  for (const [key, section] of Object.entries(l2NavItems)) {
    const allHrefs = getAllHrefs(section.items);
    if (allHrefs.some(href => pathname === href)) {
      return key;
    }
  }
  // Match L1 items without L2
  for (const item of l1NavItems) {
    if (item.href !== "/" && pathname.startsWith(item.href)) {
      return item.l2Key || item.href.replace("/", "");
    }
  }
  // Match sales channels
  for (const channel of salesChannels) {
    if (pathname === channel.href) {
      return `sc-${channel.id}`;
    }
  }
  if (pathname.startsWith("/create") || pathname.startsWith("/edit")) {
    return "products";
  }
  return "products";
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSalesChannels, setShowSalesChannels] = useState(false);

  const activeKey = getActiveSectionKey(location.pathname);
  const isSalesChannelActive = activeKey.startsWith("sc-");
  const activeChannel = salesChannels.find(c => location.pathname.startsWith(c.href));
  const salesChannelLabel = activeChannel?.name || salesChannels[0]?.name || "Channel";

  // Build visible tabs: [active (if not pinned)], Products, Orders, Store OS, Sales Channel, More
  const activeL1 = l1NavItems.find(
    (i) => i.l2Key === activeKey || i.href.replace("/", "") === activeKey
  );

  const pinnedItems = PINNED_KEYS
    .map((key) => l1NavItems.find((i) => i.l2Key === key || i.href.replace("/", "") === key))
    .filter(Boolean) as L1NavItem[];

  const isActivePinned = pinnedItems.some(
    (p) => (p.l2Key || p.href.replace("/", "")) === activeKey
  ) || isSalesChannelActive;

  const visibleTabs = isActivePinned
    ? pinnedItems
    : activeL1
      ? [activeL1, ...pinnedItems]
      : pinnedItems;

  // "More" items = L1 items NOT in visibleTabs and NOT sales channels
  const visibleKeys = new Set(visibleTabs.map((t) => t.l2Key || t.href.replace("/", "")));
  const moreItems = l1NavItems.filter(
    (i) => !visibleKeys.has(i.l2Key || i.href.replace("/", ""))
  );

  // L2 sub-items for active section (including sales channels)
  const activeSectionData = (() => {
    if (l2NavItems[activeKey]) return l2NavItems[activeKey];
    if (activeKey.startsWith("sc-")) {
      const channelId = activeKey.replace("sc-", "");
      const channel = salesChannels.find(c => c.id === channelId);
      if (channel) return getSalesChannelL2(channel);
    }
    return undefined;
  })();
  const flatItems = activeSectionData ? flattenItems(activeSectionData.items) : [];

  const handleTabClick = (item: L1NavItem) => {
    const itemKey = item.l2Key || item.href.replace("/", "");
    if (itemKey === activeKey) {
      if (flatItems.length > 0) {
        setShowSubmenu(!showSubmenu);
      }
      setShowMoreMenu(false);
      setShowSalesChannels(false);
    } else {
      const sectionData = l2NavItems[item.l2Key || ""];
      if (sectionData && sectionData.items.length > 0) {
        const firstItem = sectionData.items[0];
        const href =
          firstItem.href !== "#"
            ? firstItem.href
            : firstItem.children?.[0]?.href || "/";
        navigate(href);
      } else {
        navigate(item.href);
      }
      setShowSubmenu(false);
      setShowMoreMenu(false);
      setShowSalesChannels(false);
    }
  };

  return (
    <>
      {/* L2 Sub-items drawer */}
      {showSubmenu && flatItems.length > 0 && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowSubmenu(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-3 space-y-1 max-h-[60vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wide">
              {activeSectionData?.title}
            </p>
            {flatItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setShowSubmenu(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Sales Channels drawer */}
      {showSalesChannels && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowSalesChannels(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-3 space-y-1 max-h-[60vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wide">
              Sales Channels
            </p>
            {salesChannels.map((channel) => {
              const isChannelActive = location.pathname.startsWith(channel.href);
              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    navigate(channel.href);
                    setShowSalesChannels(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
                    isChannelActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Store className="w-4 h-4" />
                  <span>{channel.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* "More" menu drawer */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowMoreMenu(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-14 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-3 space-y-1 max-h-[60vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground px-3 py-1 uppercase tracking-wide">
              More
            </p>
            {moreItems.map((item) => {
              const itemKey = item.l2Key || item.href.replace("/", "");
              const isActive = itemKey === activeKey;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    handleTabClick(item);
                    setShowMoreMenu(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-14 safe-area-bottom">
        {visibleTabs.map((item) => {
          const itemKey = item.l2Key || item.href.replace("/", "");
          const isActive = itemKey === activeKey;
          const hasSubmenu =
            l2NavItems[item.l2Key || ""] &&
            flattenItems(l2NavItems[item.l2Key || ""].items).length > 0;

          return (
            <button
              key={item.name}
              onClick={() => handleTabClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
              {isActive && hasSubmenu && (
                <ChevronDown
                  className={cn(
                    "w-3 h-3 absolute top-1 right-1 transition-transform",
                    showSubmenu && "rotate-180"
                  )}
                />
              )}
            </button>
          );
        })}

        {/* Sales Channel tab */}
        <button
          onClick={() => {
            if (isSalesChannelActive && flatItems.length > 0) {
              // When active, show sub-nav like other tabs
              setShowSubmenu(!showSubmenu);
              setShowSalesChannels(false);
              setShowMoreMenu(false);
            } else {
              setShowSalesChannels(!showSalesChannels);
              setShowSubmenu(false);
              setShowMoreMenu(false);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isSalesChannelActive) {
              setShowSalesChannels(!showSalesChannels);
              setShowSubmenu(false);
              setShowMoreMenu(false);
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors relative",
            isSalesChannelActive || showSalesChannels ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Store className="w-5 h-5" />
          <span>{salesChannelLabel}</span>
          <ChevronDown
            className={cn(
              "w-3 h-3 absolute top-1 right-1 transition-transform",
              (showSalesChannels || (isSalesChannelActive && showSubmenu)) && "rotate-180"
            )}
          />
        </button>

        {/* More button */}
        {moreItems.length > 0 && (
          <button
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setShowSubmenu(false);
              setShowSalesChannels(false);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
              showMoreMenu ? "text-primary" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>
        )}
      </nav>
    </>
  );
}
