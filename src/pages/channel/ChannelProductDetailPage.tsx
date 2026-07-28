import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowLeft, ExternalLink, ChevronDown, ChevronUp, Plus, Trash2, Package, ChevronRight, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/contexts/ProductsContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { useBrands } from "@/contexts/BrandsContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

// Drill-down breadcrumb level picker
function BreadcrumbLevelPicker({
  value,
  levelTypes,
  categories,
  brands,
  displayLabel,
  onChange,
}: {
  value: { id: string; level: string; value?: string };
  levelTypes: { id: string; label: string; desc: string; hasItems: boolean }[];
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  displayLabel: string;
  onChange: (updated: { level: string; value?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [drillLevel, setDrillLevel] = useState<string | null>(null);

  const getItemsForLevel = (levelId: string) => {
    if (levelId === "brand") return brands.map(b => ({ id: b.id, name: b.name }));
    if (levelId === "category") return categories.map(c => ({ id: c.id, name: c.name }));
    if (levelId === "collection") return categories.map(c => ({ id: c.id, name: c.name })); // placeholder: uses categories for now
    return [];
  };

  const activeDrill = drillLevel ? levelTypes.find(l => l.id === drillLevel) : null;
  const drillItems = drillLevel ? getItemsForLevel(drillLevel) : [];

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDrillLevel(null); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <span className={displayLabel ? "text-foreground" : "text-muted-foreground"}>
            {displayLabel || "E.g: Brand"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50" align="start">
        {!drillLevel ? (
          <div className="py-1">
            {levelTypes.map(lt => (
              <button
                key={lt.id}
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted transition-colors"
                onClick={() => {
                  if (lt.hasItems) {
                    setDrillLevel(lt.id);
                  } else {
                    onChange({ level: lt.id, value: undefined });
                    setOpen(false);
                    setDrillLevel(null);
                  }
                }}
              >
                <div>
                  <p className={`text-sm font-medium ${value.level === lt.id ? "text-primary" : "text-foreground"}`}>{lt.label}</p>
                  <p className="text-xs text-muted-foreground">{lt.desc}</p>
                </div>
                {lt.hasItems && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-1">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-b border-border hover:bg-muted transition-colors"
              onClick={() => setDrillLevel(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">{activeDrill?.label}</span>
            </button>
            {drillItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => {
                  onChange({ level: drillLevel, value: item.id });
                  setOpen(false);
                  setDrillLevel(null);
                }}
              >
                {item.name}
              </button>
            ))}
            {drillItems.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No items found</p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ChannelProductDetailPageProps {
  channelName: string;
  channelSlug: string;
}

// Read-only field display
function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}

// Collapsible section
function CollapsibleSection({ title, count, defaultOpen = true, children }: {
  title: string;
  count?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg bg-card">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {count && <span className="text-xs text-muted-foreground">({count})</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}

// Channel-specific performance stats breakdown item
function BreakdownItem({ label, value, percentage, color }: {
  label: string;
  value: string;
  percentage: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-1 h-8 rounded-full ${color}`} />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">({percentage})</span>
    </div>
  );
}

export default function ChannelProductDetailPage({ channelName, channelSlug }: ChannelProductDetailPageProps) {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { getProductById } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();

  const product = getProductById(productId || "");

  // SEO state (channel-specific, editable)
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalPath, setCanonicalPath] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; level: string; value?: string }[]>([{ id: "1", level: "" }]);
  const [sitemapPriority, setSitemapPriority] = useState("0.5");
  const [sitemapFrequency, setSitemapFrequency] = useState("never");
  const [metaTags, setMetaTags] = useState<{ id: string; key: string; value: string }[]>([]);


  // Stats toggle
  const [showMoreSales, setShowMoreSales] = useState(false);
  const [showMoreReferrer, setShowMoreReferrer] = useState(false);

  // Variant detail modal
  const [selectedVariantCombo, setSelectedVariantCombo] = useState<{
    combo: { id: string; label: string; values: string[] };
    sellingPrice: string;
    sku: string;
    inventoryStatus: string;
    qty: number;
    detail: any;
  } | null>(null);

  // Per-variant order quantity overrides
  const [variantOrderQty, setVariantOrderQty] = useState<Record<string, { min: string; max: string; increment: string }>>({});

  if (!product) {
    return (
      <DashboardLayout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-xl font-semibold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-4">This product doesn't exist in the catalog.</p>
          <Button variant="outline" onClick={() => navigate(`/sales-channel/${channelSlug}/products`)}>
            Back to Products
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const categoryName = categories.find(c => c.id === product.category)?.name || product.categoryName;
  const brandName = brands.find(b => b.id === product.brand)?.name || product.brand || "—";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-5xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background pb-4 -mt-1 pt-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => navigate(`/sales-channel/${channelSlug}/products`)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-xl font-semibold text-foreground truncate">{product.name}</h1>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hidden sm:flex"
              onClick={() => window.open(`https://${channelSlug}.example.com/product/${product.sku}`, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">View on Storefront</span>
            </Button>
            <Button size="sm" onClick={() => navigate(`/sales-channel/${channelSlug}/products`)}>
              Save
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information - Read Only */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3">
                    <ReadOnlyField label="Product Name" value={product.name} />
                    <ReadOnlyField label="SKU" value={product.sku} mono />
                    <ReadOnlyField label="Slug" value={product.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")} mono />
                    <ReadOnlyField label="Category" value={categoryName} />
                    <ReadOnlyField label="Brand" value={brandName} />
                    <ReadOnlyField label="Selling Price" value={product.sellingPrice ? `₹${product.sellingPrice}` : "—"} />
                    <ReadOnlyField label="Full Price" value={product.actualPrice ? `₹${product.actualPrice}` : "—"} />
                  </div>
                </div>
                {product.description && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                    <div className="text-sm text-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description, { ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'], ALLOWED_ATTR: ['href', 'target', 'rel'] }) }} />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <Badge variant={product.status === "Active" ? "default" : "secondary"} className={product.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}>
                    {product.status === "Active" ? "Opted" : "Not Opted"}
                  </Badge>
                </div>
              </CardContent>
            </Card>


            {/* Size & Variants Table */}
            {product.hasVariants && product.variants && (() => {
              const variantsData = product.variants as {
                savedVariants?: Array<{
                  id: string;
                  name: string;
                  values: Array<{ id: string; label: string }>;
                }>;
                combinationSellingPrices?: Record<string, string>;
                combinationActualPrices?: Record<string, string>;
                combinationQuantities?: Record<string, number>;
                variantDetailData?: Record<string, any>;
              };

              const savedVariants = variantsData?.savedVariants || [];
              if (savedVariants.length === 0) return null;

              const generateCombinations = (
                variants: typeof savedVariants
              ): Array<{ id: string; label: string; values: string[] }> => {
                if (variants.length === 0) return [];
                if (variants.length === 1) {
                  return variants[0].values.map((v) => ({
                    id: v.id, label: v.label, values: [v.label],
                  }));
                }
                const result: Array<{ id: string; label: string; values: string[] }> = [];
                const [first, ...rest] = variants;
                first.values.forEach((parentValue) => {
                  if (rest.length === 1) {
                    rest[0].values.forEach((childValue) => {
                      result.push({
                        id: `${parentValue.id}-${childValue.id}`,
                        label: `${parentValue.label} / ${childValue.label}`,
                        values: [parentValue.label, childValue.label],
                      });
                    });
                  } else {
                    const childCombos = generateCombinations(rest);
                    childCombos.forEach((combo) => {
                      result.push({
                        id: `${parentValue.id}-${combo.id}`,
                        label: `${parentValue.label} / ${combo.label}`,
                        values: [parentValue.label, ...combo.values],
                      });
                    });
                  }
                });
                return result;
              };

              const combinations = generateCombinations(savedVariants);

              return (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Size & Variants</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Variant</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">SKU</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Selling Price</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Inventory</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combinations.map((combo, idx) => {
                            const sellingPrice = variantsData?.combinationSellingPrices?.[combo.id] || product.sellingPrice;
                            const qty = variantsData?.combinationQuantities?.[combo.id];
                            const inventoryStatus = qty !== undefined && qty <= 0 ? "Out of Stock" : "In Stock";
                            const detail = variantsData?.variantDetailData?.[combo.id];
                            const sku = detail?.identifiers?.[0]?.value || `${product.sku}-${idx + 1}`;

                            return (
                              <tr
                                key={combo.id}
                                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setSelectedVariantCombo({ combo, sellingPrice: sellingPrice || "", sku, inventoryStatus, qty: qty ?? 0, detail })}
                              >
                                <td className="px-4 py-3 text-sm font-medium text-foreground">{combo.label}</td>
                                <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{sku}</td>
                                <td className="px-4 py-3 text-sm text-foreground">₹{sellingPrice}</td>
                                <td className="px-4 py-3">
                                  <Badge variant={inventoryStatus === "In Stock" ? "default" : "secondary"} className={inventoryStatus === "In Stock" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}>
                                    {inventoryStatus}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground font-medium">Title</label>
                    <span className="text-xs text-muted-foreground">{seoTitle.length}/400</span>
                  </div>
                  <Input placeholder="Add title here" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground font-medium">Description</label>
                    <span className="text-xs text-muted-foreground">{seoDescription.length}/600</span>
                  </div>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-primary min-h-[100px] resize-y"
                    placeholder="Enter description here"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Canonical URL */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Canonical URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-shrink-0">
                    <Input value={`${channelSlug}.example.com`} disabled className="h-9 bg-muted w-full sm:w-[180px] text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <Input placeholder="Enter canonical url path" value={canonicalPath} onChange={(e) => setCanonicalPath(e.target.value)} className="h-9" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breadcrumbs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Breadcrumbs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {breadcrumbs.map((bc, index) => {
                  const levelTypes = [
                    { id: "brand", label: "Brand", desc: "List of products belonging to a specific brand", hasItems: true },
                    { id: "collection", label: "Collection", desc: "A page displaying 1 specific collection of items", hasItems: true },
                    { id: "category", label: "Category", desc: "Display all products under a category", hasItems: true },
                  ];
                  const selectedType = levelTypes.find(l => l.id === bc.level);
                  const valueName = bc.value
                    ? (bc.level === "brand"
                        ? brands.find(b => b.id === bc.value)?.name
                        : categories.find(c => c.id === bc.value)?.name) || bc.value
                    : "";
                  const displayLabel = valueName && selectedType
                    ? `${selectedType.label}/${valueName}`
                    : selectedType?.label || "";

                  return (
                    <div key={bc.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Levels</label>
                        <BreadcrumbLevelPicker
                          value={bc}
                          levelTypes={levelTypes}
                          categories={categories}
                          brands={brands}
                          displayLabel={displayLabel}
                          onChange={(updated) => setBreadcrumbs(prev => prev.map(b => b.id === bc.id ? { ...bc, ...updated } : b))}
                        />
                      </div>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mt-5 text-muted-foreground hover:text-destructive"
                          onClick={() => setBreadcrumbs(prev => prev.filter(b => b.id !== bc.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
                  onClick={() => setBreadcrumbs(prev => [...prev, { id: crypto.randomUUID(), level: "" }])}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Level
                </button>
              </CardContent>
            </Card>

            {/* Sitemap & Meta Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sitemap & Meta Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Priority</label>
                    <Select value={sitemapPriority} onValueChange={setSitemapPriority}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Frequency</label>
                    <Select value={sitemapFrequency} onValueChange={setSitemapFrequency}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["never", "yearly", "monthly", "weekly", "daily", "hourly", "always"].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                    <p className="text-sm font-medium text-foreground">Meta Tags</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Preview</Button>
                      <Button size="sm" onClick={() => setMetaTags(prev => [...prev, { id: crypto.randomUUID(), key: "", value: "" }])}>
                        Add Meta Tags
                      </Button>
                    </div>
                  </div>
                  {metaTags.length > 0 && (
                    <div className="space-y-3">
                      {metaTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input placeholder="Property" value={tag.key} onChange={(e) => {
                              setMetaTags(prev => prev.map(t => t.id === tag.id ? { ...t, key: e.target.value } : t));
                            }} className="h-9" />
                          </div>
                          <div className="flex-1">
                            <Input placeholder="Content" value={tag.value} onChange={(e) => {
                              setMetaTags(prev => prev.map(t => t.id === tag.id ? { ...t, value: e.target.value } : t));
                            }} className="h-9" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                            setMetaTags(prev => prev.filter(t => t.id !== tag.id));
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Channel Performance Stats */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Performance Snapshot</CardTitle>
                <p className="text-xs text-muted-foreground">Last 90 days · {channelName}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Units Sold */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-foreground">2,800</p>
                  <p className="text-xs text-muted-foreground">units sold</p>
                </div>

                <Separator />

                {/* New vs Returning */}
                <CollapsibleSection title="New vs Returning Customers" count="1,300 total">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <span className="text-sm text-foreground">New Customers</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">820</span>
                        <span className="text-xs text-muted-foreground ml-1">(63%)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
                        <span className="text-sm text-foreground">Returning Customers</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">480</span>
                        <span className="text-xs text-muted-foreground ml-1">(37%)</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-primary/20 overflow-hidden mt-1">
                      <div className="h-full bg-primary rounded-full" style={{ width: "63%" }} />
                    </div>
                  </div>
                </CollapsibleSection>

                <Separator />

                {/* Net Sales by Channel */}
                <CollapsibleSection title="Net Sales Breakup" count={`${channelName}`}>
                  <div className="space-y-0">
                    <BreakdownItem label={channelName} value="₹45,200" percentage="36%" color="bg-primary" />
                    <BreakdownItem label="Flipkart" value="₹32,100" percentage="26%" color="bg-primary/70" />
                    <BreakdownItem label="Amazon" value="₹25,800" percentage="21%" color="bg-primary/50" />
                    {showMoreSales && (
                      <>
                        <BreakdownItem label="Myntra" value="₹12,400" percentage="10%" color="bg-primary/30" />
                        <BreakdownItem label="Direct" value="₹8,500" percentage="7%" color="bg-primary/20" />
                      </>
                    )}
                  </div>
                  <button className="text-xs text-primary font-medium mt-1" onClick={() => setShowMoreSales(!showMoreSales)}>
                    {showMoreSales ? "Show less" : "Show 2 more"}
                  </button>
                </CollapsibleSection>

                <Separator />

                {/* Units by Referrer */}
                <CollapsibleSection title="Units Sold by Referrer" count="5 sources">
                  <div className="space-y-0">
                    <BreakdownItem label="Direct" value="1,120" percentage="40%" color="bg-muted-foreground/30" />
                    <BreakdownItem label="Google Search" value="700" percentage="25%" color="bg-muted-foreground/20" />
                    <BreakdownItem label="Instagram" value="420" percentage="15%" color="bg-muted-foreground/15" />
                    {showMoreReferrer && (
                      <>
                        <BreakdownItem label="Facebook" value="340" percentage="12%" color="bg-muted-foreground/10" />
                        <BreakdownItem label="Email" value="220" percentage="8%" color="bg-muted-foreground/5" />
                      </>
                    )}
                  </div>
                  <button className="text-xs text-primary font-medium mt-1" onClick={() => setShowMoreReferrer(!showMoreReferrer)}>
                    {showMoreReferrer ? "Show less" : "Show 2 more"}
                  </button>
                </CollapsibleSection>
              </CardContent>
            </Card>

            {/* Published On — Channel Specific */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Published On</CardTitle>
                <p className="text-xs text-muted-foreground">Status for {channelName}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* POS */}
                <CollapsibleSection title="POS" count="1 Active">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">JD</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Just Dogs Outlet</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <Separator />

                {/* Marketplace */}
                <CollapsibleSection title="Marketplace" count="2 of 3 Live">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold shrink-0">FK</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Flipkart</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">AZ</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Amazon</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-muted-foreground">Live</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">MY</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Myntra</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs text-muted-foreground">Not Live</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>

                <Separator />

                {/* Collections */}
                <CollapsibleSection title="Collections" count="1 Live">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">NA</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">New Arrivals</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">Just Dogs</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Live
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Variant Detail Modal */}
      <Dialog open={!!selectedVariantCombo} onOpenChange={(open) => !open && setSelectedVariantCombo(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedVariantCombo?.combo.label}</DialogTitle>
          </DialogHeader>
          {selectedVariantCombo && (() => {
            const v = selectedVariantCombo;
            const vOq = variantOrderQty[v.combo.id] || { min: "1", max: "10", increment: "1" };
            const detail = v.detail;
            const shipment = detail?.shipment;
            const pricing = detail?.pricing;

            return (
              <div className="space-y-5 pt-2">
                {/* Key Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">SKU</p>
                    <p className="text-sm text-foreground font-mono">{v.sku}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Inventory</p>
                    <Badge variant={v.inventoryStatus === "In Stock" ? "default" : "secondary"} className={v.inventoryStatus === "In Stock" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : ""}>
                      {v.inventoryStatus} {v.qty > 0 ? `(${v.qty})` : ""}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pricing</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="text-sm font-medium text-foreground">₹{pricing?.sellingPrice || v.sellingPrice}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Full Price</p>
                      <p className="text-sm font-medium text-foreground">₹{pricing?.actualPrice || v.sellingPrice}</p>
                    </div>
                  </div>
                </div>

                {/* Package */}
                {shipment && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Package Details</p>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">L</p>
                          <p className="text-sm text-foreground">{shipment.length || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">W</p>
                          <p className="text-sm text-foreground">{shipment.width || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">H</p>
                          <p className="text-sm text-foreground">{shipment.height || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="text-sm text-foreground">{shipment.weight || "—"} {shipment.weightUnit || ""}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Order Quantity — editable */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Quantity</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Minimum</label>
                      <Input
                        type="number"
                        value={vOq.min}
                        onChange={(e) => setVariantOrderQty((prev) => ({ ...prev, [v.combo.id]: { ...vOq, min: e.target.value } }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Maximum</label>
                      <Input
                        type="number"
                        value={vOq.max}
                        onChange={(e) => setVariantOrderQty((prev) => ({ ...prev, [v.combo.id]: { ...vOq, max: e.target.value } }))}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground font-medium">Increment</label>
                      <Input
                        type="number"
                        value={vOq.increment}
                        onChange={(e) => setVariantOrderQty((prev) => ({ ...prev, [v.combo.id]: { ...vOq, increment: e.target.value } }))}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => setSelectedVariantCombo(null)}>Done</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
