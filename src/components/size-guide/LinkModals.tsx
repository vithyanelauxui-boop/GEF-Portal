import { useState, useMemo, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, X, Filter, ChevronLeft, ChevronRight, Upload, ChevronDown } from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { useBrands } from "@/contexts/BrandsContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileUploadZone, UploadedFile } from "@/components/bulk-import/FileUploadZone";
import { cn } from "@/lib/utils";

// ---- Add Products Modal ----
interface AddProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => void;
  existingIds?: string[];
}

export function AddProductsModal({ open, onOpenChange, onAdd, existingIds = [] }: AddProductsModalProps) {
  const isMobile = useIsMobile();
  const { products } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowsPerPage, setRowsPerPage] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (existingIds.includes(p.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = (p.sku || "").toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (selectedCategory && p.category !== selectedCategory) return false;
      return true;
    });
  }, [products, search, existingIds, selectedBrand, selectedCategory]);

  const totalResults = filtered.length;
  const perPage = parseInt(rowsPerPage);
  const totalPages = Math.ceil(totalResults / perPage);
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalResults);
  const paginated = filtered.slice(startIdx, endIdx);

  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.id)));
    }
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Add Products</h2>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-6 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by Product name, SKU, Barcode, Custom Code" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
            </div>
            <button className="p-2 border border-border rounded-md hover:bg-muted transition-colors" onClick={() => setShowFilters(prev => !prev)}>
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filters</span>
              <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v === "all" ? "" : v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-xs rounded-full border-dashed">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v === "all" ? "" : v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-xs rounded-full border-dashed">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Selection count */}
        <div className="flex items-center justify-between px-6 py-2 bg-muted/30 border-y border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size > 0 && selected.size === filtered.length}
              onCheckedChange={toggleAll}
              className={selected.size > 0 && selected.size < filtered.length ? "data-[state=checked]:bg-primary" : ""}
            />
            <span className="text-sm text-muted-foreground">{selected.size} product{selected.size !== 1 ? "s" : ""} selected</span>
          </div>
          {filtered.length > 0 && (
            <button onClick={toggleAll} className="text-sm text-primary font-medium hover:underline">
              Select all {totalResults.toLocaleString()} products
            </button>
          )}
        </div>

        {/* Product list */}
        <div className="divide-y divide-border">
          <div className="px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">Products</div>
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            paginated.map((product) => (
              <div key={product.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleProduct(product.id)}>
                <Checkbox checked={selected.has(product.id)} className="pointer-events-none" />
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">{product.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Brand: {product.brand || "—"} · Category: {product.category || "—"} · Slug: <span className="font-mono">{product.sku}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0">
        <span className="text-xs text-muted-foreground">Result {startIdx + 1} - {endIdx} of {totalResults.toLocaleString()}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={rowsPerPage} onValueChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
        <Button variant="outline" className="px-6 h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="px-6 h-9" onClick={handleAdd} disabled={selected.size === 0}>Add</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-2 max-h-[95vh]">{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        )}>
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---- Add Brands Modal ----
interface AddBrandsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => void;
  existingIds?: string[];
}

export function AddBrandsModal({ open, onOpenChange, onAdd, existingIds = [] }: AddBrandsModalProps) {
  const isMobile = useIsMobile();
  const { brands } = useBrands();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return brands.filter(b => {
      if (existingIds.includes(b.id)) return false;
      if (!search.trim()) return true;
      return b.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [brands, search, existingIds]);

  const toggleBrand = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Add Brands</h2>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      <div className="px-6 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search brands" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No brands found</div>
        ) : (
          filtered.map((brand) => (
            <div key={brand.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => toggleBrand(brand.id)}>
              <Checkbox checked={selected.has(brand.id)} className="pointer-events-none" />
              {brand.logo ? (
                <img src={brand.logo.original} alt={brand.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">{brand.name[0]}</div>
              )}
              <span className="text-sm font-medium text-foreground">{brand.name}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
        <Button variant="outline" className="px-6 h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="px-6 h-9" onClick={handleAdd} disabled={selected.size === 0}>Add</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="pb-2 max-h-[90vh]">{content}</DrawerContent></Drawer>;
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---- Add Categories Modal ----
interface AddCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => void;
  existingIds?: string[];
}

export function AddCategoriesModal({ open, onOpenChange, onAdd, existingIds = [] }: AddCategoriesModalProps) {
  const isMobile = useIsMobile();
  const { categories } = useCategories();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return categories.filter(c => {
      if (existingIds.includes(c.id)) return false;
      if (!search.trim()) return true;
      return c.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [categories, search, existingIds]);

  const toggleCategory = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Add Categories</h2>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
      <div className="px-6 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search categories" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No categories found</div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => toggleCategory(cat.id)}>
              <Checkbox checked={selected.has(cat.id)} className="pointer-events-none" />
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">{cat.name[0]}</div>
              )}
              <span className="text-sm font-medium text-foreground">{cat.name}</span>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
        <Button variant="outline" className="px-6 h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="px-6 h-9" onClick={handleAdd} disabled={selected.size === 0}>Add</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="pb-2 max-h-[90vh]">{content}</DrawerContent></Drawer>;
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ---- Add Variants Modal ----
interface AddVariantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => void;
  existingIds?: string[];
}

export function AddVariantsModal({ open, onOpenChange, onAdd, existingIds = [] }: AddVariantsModalProps) {
  const isMobile = useIsMobile();
  const { products } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowsPerPage, setRowsPerPage] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Extract all variant combinations from all products
  const allVariants = useMemo(() => {
    const variants: { id: string; label: string; sku: string; productName: string; productId: string; brand?: string; category?: string }[] = [];
    products.forEach(product => {
      if (!product.hasVariants || !product.variants) return;
      const v = product.variants as any;
      if (!v.savedVariants || !v.variantDetailData) return;
      const savedVariants = v.savedVariants as any[];
      const detailData = v.variantDetailData as Record<string, any>;

      Object.entries(detailData).forEach(([comboKey, detail]: [string, any]) => {
        const uniqueId = `${product.id}::${comboKey}`;
        if (existingIds.includes(uniqueId)) return;

        // Build label from combo key
        const parts = comboKey.split("-");
        const labels: string[] = [];
        for (let i = 0; i < savedVariants.length; i++) {
          const group = savedVariants[i];
          const matchedValue = group.values?.find((val: any) => parts.includes(val.id?.replace("val-", "")));
          if (matchedValue) labels.push(matchedValue.label);
        }

        // Get combo label from value keys
        const comboLabel = labels.length > 0 ? labels.join(" / ") : comboKey;
        const sku = detail?.identifiers?.[0]?.value || "—";

        variants.push({
          id: uniqueId,
          label: comboLabel,
          sku,
          productName: product.name,
          productId: product.id,
          brand: product.brand,
          category: product.category,
        });
      });
    });
    return variants;
  }, [products, existingIds]);

  const filtered = useMemo(() => {
    return allVariants.filter(v => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!v.label.toLowerCase().includes(q) && !v.sku.toLowerCase().includes(q) && !v.productName.toLowerCase().includes(q)) return false;
      }
      if (selectedBrand && v.brand !== selectedBrand) return false;
      if (selectedCategory && v.category !== selectedCategory) return false;
      return true;
    });
  }, [allVariants, search, selectedBrand, selectedCategory]);

  const totalResults = filtered.length;
  const perPage = parseInt(rowsPerPage);
  const totalPages = Math.ceil(totalResults / perPage);
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalResults);
  const paginated = filtered.slice(startIdx, endIdx);

  const toggleVariant = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(v => v.id)));
    }
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Add Variants</h2>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-6 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by Product name, SKU, Barcode, Custom Code" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
            </div>
            <button className="p-2 border border-border rounded-md hover:bg-muted transition-colors" onClick={() => setShowFilters(prev => !prev)}>
              <Filter className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">Filters</span>
              <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v === "all" ? "" : v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-xs rounded-full border-dashed">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v === "all" ? "" : v); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-[140px] text-xs rounded-full border-dashed">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Selection count */}
        <div className="flex items-center justify-between px-6 py-2 bg-muted/30 border-y border-border">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.size > 0 && selected.size === filtered.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-muted-foreground">{selected.size} variant{selected.size !== 1 ? "s" : ""} selected</span>
          </div>
          {filtered.length > 0 && (
            <button onClick={toggleAll} className="text-sm text-primary font-medium hover:underline">
              Select all {totalResults.toLocaleString()} variants
            </button>
          )}
        </div>

        {/* Variant list */}
        <div className="divide-y divide-border">
          <div className="px-6 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/20">Variants</div>
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No variants found</p>
            </div>
          ) : (
            paginated.map((variant) => (
              <div key={variant.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleVariant(variant.id)}>
                <Checkbox checked={selected.has(variant.id)} className="pointer-events-none" />
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">{variant.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Product: {variant.productName} · SKU: <span className="font-mono">{variant.sku}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0">
        <span className="text-xs text-muted-foreground">Result {totalResults > 0 ? startIdx + 1 : 0} - {endIdx} of {totalResults.toLocaleString()}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows per page</span>
            <Select value={rowsPerPage} onValueChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-16 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
        <Button variant="outline" className="px-6 h-9" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button className="px-6 h-9" onClick={handleAdd} disabled={selected.size === 0}>Add</Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-2 max-h-[95vh]">{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        )}>
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface BulkUploadProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ids: string[]) => void;
  existingIds?: string[];
}

export function BulkUploadProductsModal({ open, onOpenChange, onAdd, existingIds = [] }: BulkUploadProductsModalProps) {
  const isMobile = useIsMobile();
  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState<"upload" | "product-id">("upload");
  const [productType, setProductType] = useState("physical");
  const [uploadType, setUploadType] = useState("products");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<string[]>([]);
  const [productIdInput, setProductIdInput] = useState("");
  const [idMatchedProducts, setIdMatchedProducts] = useState<string[]>([]);

  const resetState = () => {
    setProductType("physical");
    setUploadType("products");
    setUploadedFile(null);
    setMatchedProducts([]);
    setActiveTab("upload");
    setProductIdInput("");
    setIdMatchedProducts([]);
  };

  const handleProductIdMatch = useCallback(() => {
    const ids = productIdInput
      .split(/[\n,]+/)
      .map(id => id.trim())
      .filter(Boolean);
    const matched = products
      .filter(p => !existingIds.includes(p.id))
      .filter(p => ids.some(id => 
        p.id.toLowerCase() === id.toLowerCase() || 
        (p.sku && p.sku.toLowerCase() === id.toLowerCase())
      ))
      .map(p => p.id);
    setIdMatchedProducts(matched);
  }, [productIdInput, products, existingIds]);

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
    // Simulate matching: after upload, show all products (filtered by type/category if set)
    const filtered = products.filter(p => {
      if (existingIds.includes(p.id)) return false;
      return true;
    });
    setMatchedProducts(filtered.map(p => p.id));
  };

  const handleAdd = () => {
    const idsToAdd = activeTab === "upload" ? matchedProducts : idMatchedProducts;
    onAdd(idsToAdd);
    resetState();
    onOpenChange(false);
  };

  const currentMatched = activeTab === "upload" ? matchedProducts : idMatchedProducts;
  const matchedProductDetails = products.filter(p => currentMatched.includes(p.id));

  const content = (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Bulk Add</h2>
        <button onClick={() => { resetState(); onOpenChange(false); }} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === "upload"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("upload")}
          >
            Bulk Upload
          </button>
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === "product-id"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("product-id")}
          >
            Product ID
          </button>
        </div>

        {activeTab === "upload" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Import Products</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Need help in importing? <a href="#" className="text-primary hover:underline">Learn More</a>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Products</SelectItem>
                  <SelectItem value="variants">Variants</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9">
                    Download Sample <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Excel (.xlsx)</DropdownMenuItem>
                  <DropdownMenuItem>CSV (.csv)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <FileUploadZone onFileUploaded={handleFileUploaded} hideAddUrl />
        </div>
        )}

        {activeTab === "product-id" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Add by Product ID or SKU</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter product IDs or SKUs separated by commas or new lines
            </p>
          </div>
          <Textarea
            placeholder="e.g. PROD-001, PROD-002&#10;or one per line"
            value={productIdInput}
            onChange={(e) => setProductIdInput(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
          <Button variant="outline" className="h-9" onClick={handleProductIdMatch} disabled={!productIdInput.trim()}>
            <Search className="w-4 h-4 mr-2" />
            Match Products
          </Button>
        </div>
        )}

        {/* Matched Products after upload */}
        {matchedProductDetails.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <span className="text-sm font-medium text-foreground">{matchedProductDetails.length} product{matchedProductDetails.length !== 1 ? "s" : ""} found</span>
            </div>
            <div className="divide-y divide-border max-h-[240px] overflow-y-auto">
              {matchedProductDetails.map((product) => (
                <div key={product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{product.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      SKU: <span className="font-mono">{product.sku || "—"}</span> · Category: {product.categoryName || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-border shrink-0">
        <Button variant="outline" className="px-6 h-9" onClick={() => { resetState(); onOpenChange(false); }}>Cancel</Button>
        <Button className="px-6 h-9" onClick={handleAdd} disabled={currentMatched.length === 0}>
          Add {currentMatched.length > 0 ? `(${currentMatched.length})` : ""}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return <Drawer open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}><DrawerContent className="pb-2 max-h-[95vh]">{content}</DrawerContent></Drawer>;
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
