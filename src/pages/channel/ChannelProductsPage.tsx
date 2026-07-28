import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ExternalLink, MoreVertical, ChevronLeft, ChevronRight, Package, Layers, ChevronDown, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/contexts/ProductsContext";
import { useCategories } from "@/contexts/CategoriesContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import emptyBox from "@/assets/empty-attributes.png";
import { cn } from "@/lib/utils";

interface ChannelProductsPageProps {
  channelName: string;
  channelSlug: string;
}

const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
    active ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
    {active ? "Active" : "Inactive"}
  </span>
);

const OrderingSourceBadge = ({ source }: { source: string }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground">
    {source}
  </span>
);

// --- Channel Stats Data (mock) ---
interface ChannelStatItem {
  name: string;
  initials: string;
  bgColor: string;
  textColor: string;
  active: boolean;
  posLive?: boolean;
  onlineLive?: boolean;
  type?: string;
}

const posItems: ChannelStatItem[] = [
  { name: "Ritu Kumar Store", initials: "RK", bgColor: "bg-neutral-800", textColor: "text-white", active: true, type: "Retail" },
  { name: "Just Dogs Outlet", initials: "JD", bgColor: "bg-blue-600", textColor: "text-white", active: true, type: "Retail" },
  { name: "Super Dry Counter", initials: "SD", bgColor: "bg-red-100", textColor: "text-red-600", active: false, type: "Pop-up" },
];

const marketplaceItems: ChannelStatItem[] = [
  { name: "Flipkart", initials: "FK", bgColor: "bg-yellow-100", textColor: "text-yellow-700", active: true },
  { name: "Amazon", initials: "AZ", bgColor: "bg-orange-100", textColor: "text-orange-700", active: true },
  { name: "Myntra", initials: "MY", bgColor: "bg-purple-100", textColor: "text-purple-700", active: true },
  { name: "Nykaa Fashion", initials: "NF", bgColor: "bg-pink-100", textColor: "text-pink-700", active: false },
  { name: "Nykaa", initials: "NK", bgColor: "bg-pink-200", textColor: "text-pink-800", active: false },
  { name: "Ajio", initials: "AJ", bgColor: "bg-teal-100", textColor: "text-teal-700", active: false },
];

const collectionItems: ChannelStatItem[] = [
  { name: "Summer 2025", initials: "S2", bgColor: "bg-orange-100", textColor: "text-orange-700", active: true, type: "Ritu Kumar" },
  { name: "Best Sellers", initials: "BS", bgColor: "bg-emerald-100", textColor: "text-emerald-700", active: true, type: "Super Dry" },
  { name: "New Arrivals", initials: "NA", bgColor: "bg-blue-100", textColor: "text-blue-700", active: true, type: "Just Dogs" },
];

function CollapsibleStatSection({ title, countLabel, children, defaultOpen = true }: {
  title: string; countLabel: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center justify-between w-full py-2">
          <h4 className="text-sm font-semibold text-foreground">
            {title} <span className="font-normal text-muted-foreground text-xs">({countLabel})</span>
          </h4>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function ShowMoreList({ items, renderItem, limit = 3 }: {
  items: ChannelStatItem[]; renderItem: (item: ChannelStatItem, i: number) => React.ReactNode; limit?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, limit);
  return (
    <div className="space-y-3">
      {visible.map((item, i) => renderItem(item, i))}
      {items.length > limit && (
        <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs font-medium text-primary hover:underline">
          {showAll ? "Show less" : `Show ${items.length - limit} more`}
        </button>
      )}
    </div>
  );
}

function getSectionCountLabel(live: number, total: number) {
  if (live === 0) return "None Live";
  if (live === total) return `All ${total} Live`;
  return `${live} of ${total} Live`;
}

// Product detail modal with channel stats
function ProductChannelStatsModal({ open, onClose, product, channelName }: {
  open: boolean;
  onClose: () => void;
  product: any;
  channelName: string;
}) {
  const posLive = posItems.filter(p => p.active).length;
  const mkLive = marketplaceItems.filter(m => m.active).length;
  const colLive = collectionItems.filter(c => c.active).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {product?.images?.[0] ? (
              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{product?.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{product?.sku}</p>
          </div>
        </div>

        {/* Stats Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {/* POS */}
          <CollapsibleStatSection title="POS" countLabel={getSectionCountLabel(posLive, posItems.length)}>
            <ShowMoreList
              items={posItems}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-3">
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
                </div>
              )}
            />
          </CollapsibleStatSection>

          {/* Marketplace */}
          <CollapsibleStatSection title="Marketplace" countLabel={getSectionCountLabel(mkLive, marketplaceItems.length)}>
            <ShowMoreList
              items={marketplaceItems}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-3">
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
                </div>
              )}
            />
          </CollapsibleStatSection>

          {/* Collections */}
          <CollapsibleStatSection title="Collections" countLabel={getSectionCountLabel(colLive, collectionItems.length)}>
            <ShowMoreList
              items={collectionItems}
              renderItem={(item, i) => (
                <div key={i} className="flex items-center gap-3">
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
                </div>
              )}
            />
          </CollapsibleStatSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Variant stats modal with order quantity
function VariantStatsModal({ open, onClose, variant }: {
  open: boolean;
  onClose: () => void;
  variant: any;
}) {
  const [orderQty, setOrderQty] = useState({ min: "1", max: "100", increment: "1" });

  if (!variant) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">{variant.variantLabel}</p>
          <p className="text-xs text-muted-foreground">{variant.productName}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SKU</span>
              <span className="font-mono text-foreground">{variant.sku}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium text-foreground">{variant.price}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Inventory</span>
              <span className="text-foreground">{variant.inventory}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge active={variant.isActive} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ordering Source</span>
              <OrderingSourceBadge source={variant.orderingSource} />
            </div>
          </div>

          {/* Order Quantity */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Order Quantity</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Minimum</label>
                <Input
                  type="number"
                  value={orderQty.min}
                  onChange={(e) => setOrderQty(prev => ({ ...prev, min: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Maximum</label>
                <Input
                  type="number"
                  value={orderQty.max}
                  onChange={(e) => setOrderQty(prev => ({ ...prev, max: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Increment</label>
                <Input
                  type="number"
                  value={orderQty.increment}
                  onChange={(e) => setOrderQty(prev => ({ ...prev, increment: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onClose}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChannelProductsPage({ channelName, channelSlug }: ChannelProductsPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products } = useProducts();
  const { categories } = useCategories();
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const activeTab = searchParams.get("tab") || "products";

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const channelProducts = useMemo(() => {
    let result = [...products].sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    return result.map((p, i) => ({
      ...p,
      isActive: p.status === "Active",
      inventoryLabel: "In Stock",
      orderingSource: p.status === "Active" ? (i % 2 === 0 ? "Online" : "POS") : "—",
    }));
  }, [products, search]);

  const channelVariants = useMemo(() => {
    const result: Array<{
      id: string; comboKey: string; productId: string; productName: string;
      variantLabel: string; sku: string; price: string; inventory: string;
      isActive: boolean; orderingSource: string;
    }> = [];

    const sourceProducts = search.trim()
      ? products.filter(p => {
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        })
      : products;

    for (const product of sourceProducts) {
      if (!product.hasVariants || !product.variants) continue;
      const v = product.variants as any;
      if (!v.savedVariants || !v.variantDetailData) continue;

      const groups = v.savedVariants as Array<{ id: string; name: string; values: Array<{ id: string; label: string }> }>;
      if (groups.length === 0) continue;

      const buildCombos = (groupIdx: number, prefix: string[], labels: string[]): Array<{ key: string; label: string }> => {
        if (groupIdx >= groups.length) return [{ key: prefix.join("-"), label: labels.join(" / ") }];
        const combos: Array<{ key: string; label: string }> = [];
        for (const val of groups[groupIdx].values) {
          combos.push(...buildCombos(groupIdx + 1, [...prefix, val.id], [...labels, val.label]));
        }
        return combos;
      };

      const combos = buildCombos(0, [], []);
      for (const combo of combos) {
        const detail = v.variantDetailData[combo.key];
        const sku = detail?.identifiers?.[0]?.value || `${product.sku}-${combo.key}`;
        const price = detail?.pricing?.sellingPrice || detail?.pricing?.actualPrice || "—";
        result.push({
          id: `${product.id}::${combo.key}`, comboKey: combo.key, productId: product.id,
          productName: product.name, variantLabel: combo.label, sku,
          price: price !== "—" ? `₹${price}` : "—", inventory: "In Stock",
          isActive: product.status === "Active",
          orderingSource: product.status === "Active" ? "Online" : "—",
        });
      }
    }
    return result;
  }, [products, search]);

  const perPage = parseInt(rowsPerPage);
  const activeList = activeTab === "size-variants" ? channelVariants : channelProducts;
  const totalPages = Math.max(1, Math.ceil(activeList.length / perPage));
  const paginatedProducts = channelProducts.slice((currentPage - 1) * perPage, currentPage * perPage);
  const paginatedVariants = channelVariants.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">{channelName}'s Products</h1>
        </div>

        <div className="bg-card rounded-lg border border-border">
          {/* Custom Tabs - matching reference design */}
          <div className="flex items-center gap-6 px-4 border-b border-border">
            <button
              type="button"
              onClick={() => handleTabChange("products")}
              className={cn(
                "flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === "products"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-4 h-4" />
              Products
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("size-variants")}
              className={cn(
                "flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === "size-variants"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-4 h-4" />
              Size & Variants
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 p-3 md:p-4 border-b border-border">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by Product Name, SKU, Barcode, Custom Code"
                className="pl-10 h-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* Products Tab Content */}
          {activeTab === "products" && (
            channelProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-40 h-40 mb-6">
                  <img src={emptyBox} alt="" className="w-full h-full object-contain opacity-80" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">No Products Found</h2>
                <p className="text-muted-foreground">No products are available for this channel.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead className="min-w-[280px]">Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Product Type</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/sales-channel/${channelSlug}/products/${product.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                {product.images?.[0] ? (
                                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm text-foreground truncate max-w-[220px]">{product.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{product.sku} | {product.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-foreground">{getCategoryName(product.category)}</TableCell>
                          <TableCell className="text-sm text-foreground">{product.productType || "Goods"}</TableCell>
                          <TableCell className="text-sm text-foreground">{product.inventoryLabel}</TableCell>
                          <TableCell>
                            <StatusBadge active={product.isActive} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/sales-channel/${channelSlug}/products/${product.id}`)}>
                                    View Full Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.open(`https://${channelSlug}.example.com/product/${product.sku}`, "_blank")}>
                                    View on Storefront
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/sales-channel/${channelSlug}/products/${product.id}`)}
                    >
                      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <StatusBadge active={product.isActive} />
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/sales-channel/${channelSlug}/products/${product.id}`)}>
                            View Full Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* Size & Variants Tab Content */}
          {activeTab === "size-variants" && (
            channelVariants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-40 h-40 mb-6">
                  <img src={emptyBox} alt="" className="w-full h-full object-contain opacity-80" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">No Variants Found</h2>
                <p className="text-muted-foreground">No size & variant combinations for this channel.</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Variant</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordering Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVariants.map((variant) => (
                        <TableRow
                          key={variant.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedVariant(variant)}
                        >
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-foreground">{variant.variantLabel}</p>
                              <p className="text-xs text-muted-foreground truncate">{variant.productName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{variant.sku}</TableCell>
                          <TableCell className="text-sm text-foreground">{variant.price}</TableCell>
                          <TableCell className="text-sm text-foreground">{variant.inventory}</TableCell>
                          <TableCell>
                            <StatusBadge active={variant.isActive} />
                          </TableCell>
                          <TableCell>
                            <OrderingSourceBadge source={variant.orderingSource} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-border">
                  {paginatedVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className="px-4 py-3 cursor-pointer active:bg-muted/50 transition-colors"
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">{variant.variantLabel}</p>
                          <p className="text-xs text-muted-foreground truncate">{variant.productName}</p>
                        </div>
                        <span className="text-sm font-medium text-foreground ml-3 flex-shrink-0">{variant.price}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground font-mono">{variant.sku}</span>
                        <span className="text-muted-foreground/30">·</span>
                        <StatusBadge active={variant.isActive} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}

          {/* Pagination */}
          {activeList.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 border-t border-border gap-3">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, activeList.length)} of {activeList.length}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">Rows per page</span>
                  <Select value={rowsPerPage} onValueChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Channel Stats Modal */}
      <ProductChannelStatsModal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        channelName={channelName}
      />

      {/* Variant Stats Modal */}
      <VariantStatsModal
        open={!!selectedVariant}
        onClose={() => setSelectedVariant(null)}
        variant={selectedVariant}
      />
    </DashboardLayout>
  );
}
