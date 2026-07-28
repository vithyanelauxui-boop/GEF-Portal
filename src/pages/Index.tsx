import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Package, Layers, ChevronDown, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Upload, Download, X, Trash2, MoreVertical } from "lucide-react";
import icProductImport from "@/assets/ic-product-import.svg";
import icAssetsImport from "@/assets/ic-assets-import.svg";
import icInventoryImport from "@/assets/ic-inventory-import.svg";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useProducts, BASE_UOM_OPTIONS } from "@/contexts/ProductsContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { useBrands } from "@/contexts/BrandsContext";
import emptyBox from "@/assets/empty-attributes.png";

// Multi-select filter pill component
const MultiSelectFilterPill = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-sm border transition-colors ${
            count > 0
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {label}
          {count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold px-1.5">
              {count < 10 ? `0${count}` : count}
            </span>
          )}
          {count > 0 ? (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-popover z-50" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Single-select filter pill with deselect support
const SingleSelectFilterPill = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-sm border transition-colors ${
            selected
              ? "border-primary/40 bg-primary/5 text-foreground"
              : "border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          {selectedOption ? `${label} : ${selectedOption.label}` : label}
          {selected ? (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-popover z-50" align="start">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors text-left",
              selected === opt.value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
            )}
            onClick={() => {
              onChange(selected === opt.value ? "" : opt.value);
              setOpen(false);
            }}
          >
            {opt.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const AddProductDropdown = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="gap-2">
        Add Product
        <ChevronDown className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">
      <DropdownMenuItem asChild className="flex-col items-start py-3 cursor-pointer">
        <Link to="/create">
          <div className="font-medium">Goods</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Physical products that are stocked, stored, and fulfilled from inventory.
          </div>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="flex-col items-start py-3 cursor-pointer">
        <Link to="/create/digital">
          <div className="font-medium">Service</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Intangible offerings performed or scheduled, with no inventory or shipping.
          </div>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="flex-col items-start py-3 cursor-pointer">
        <Link to="/create/digital-product">
          <div className="font-medium">Digital</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Non-physical products delivered electronically, such as licenses, downloads, or gift cards.
          </div>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="flex-col items-start py-3 cursor-pointer">
        <Link to="/create/bundle">
          <div className="font-medium">Bundle</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            A grouped offering made up of multiple products sold together as one.
          </div>
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col items-center justify-center py-24">
    <div className="w-40 h-40 mb-6">
      <img src={emptyBox} alt="" className="w-full h-full object-contain opacity-80" />
    </div>
    <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
    <p className="text-muted-foreground mb-6">{description}</p>
    <div className="flex items-center gap-3">
      <Button variant="outline">Bulk Import</Button>
      <AddProductDropdown />
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: "Active" | "Upcoming" | "InActive" }) => {
  const styles = {
    Active: "bg-emerald-50 text-emerald-600",
    Upcoming: "bg-amber-50 text-amber-600",
    InActive: "bg-red-50 text-red-600",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === "Active" ? "bg-emerald-500" : 
        status === "Upcoming" ? "bg-amber-500" : "bg-red-500"
      }`} />
      {status}
    </span>
  );
};

export default function Index() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { products, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const { brands } = useBrands();
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Products tab search & filter
  const [productSearch, setProductSearch] = useState("");
  const [showProductFilters, setShowProductFilters] = useState(false);
  const [productFilters, setProductFilters] = useState({
    brand: [] as string[],
    category: [] as string[],
    taxRule: [] as string[],
    images: "" as string,
    inventory: "" as string,
    published: "" as string,
    colour: [] as string[],
    listed: "" as string,
    returnable: "" as string,
    madeToOrder: "" as string,
  });

  // Variants tab search & filter
  const [variantSearch, setVariantSearch] = useState("");
  const [showVariantFilters, setShowVariantFilters] = useState(false);
  const [variantFilters, setVariantFilters] = useState({
    variantName: "" as string,
    brand: [] as string[],
    category: [] as string[],
    images: "" as string,
    inventory: "" as string,
    costPrice: "" as string,
    wholesalePrice: "" as string,
    transferPrice: "" as string,
    inventoryTracked: "" as string,
  });

  // Map category IDs to names
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  // Count active product filters
  const activeProductFilterCount = Object.values(productFilters).filter(v => Array.isArray(v) ? v.length > 0 : Boolean(v)).length;
  const activeVariantFilterCount = Object.values(variantFilters).filter(v => Array.isArray(v) ? v.length > 0 : Boolean(v)).length;

  // Filter products for Products tab
  const filteredProducts = useMemo(() => {
    let result = [...products].sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));

    // Search
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    // Filters
    if (productFilters.brand.length > 0) {
      result = result.filter(p => p.brand && productFilters.brand.includes(p.brand));
    }
    if (productFilters.category.length > 0) {
      result = result.filter(p => productFilters.category.includes(p.category));
    }
    if (productFilters.images === "available") {
      result = result.filter(p => p.images && p.images.length > 0);
    } else if (productFilters.images === "not-available") {
      result = result.filter(p => !p.images || p.images.length === 0);
    }
    if (productFilters.inventory === "in-stock") {
      result = result.filter(() => true); // placeholder
    } else if (productFilters.inventory === "out-of-stock") {
      result = result.filter(() => false); // placeholder
    }
    if (productFilters.published === "published") {
      result = result.filter(p => p.status === "Active");
    } else if (productFilters.published === "unpublished") {
      result = result.filter(p => p.status !== "Active");
    }
    if (productFilters.returnable === "returnable") {
      result = result.filter(p => p.configs?.returnConfig === true);
    } else if (productFilters.returnable === "non-returnable") {
      result = result.filter(p => !p.configs?.returnConfig);
    }
    if (productFilters.madeToOrder === "yes") {
      result = result.filter(p => p.configs?.madeToOrder === true);
    } else if (productFilters.madeToOrder === "no") {
      result = result.filter(p => !p.configs?.madeToOrder);
    }

    return result;
  }, [products, productSearch, productFilters]);

  // Filter for Variants tab
  const filteredVariantProducts = useMemo(() => {
    let result = [...products].sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));

    if (variantSearch.trim()) {
      const q = variantSearch.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }

    if (variantFilters.brand.length > 0) {
      result = result.filter(p => p.brand && variantFilters.brand.includes(p.brand));
    }
    if (variantFilters.category.length > 0) {
      result = result.filter(p => variantFilters.category.includes(p.category));
    }
    if (variantFilters.images === "available") {
      result = result.filter(p => p.images && p.images.length > 0);
    } else if (variantFilters.images === "not-available") {
      result = result.filter(p => !p.images || p.images.length === 0);
    }

    return result;
  }, [products, variantSearch, variantFilters]);

  const hasProducts = products.length > 0;

  return (
    <DashboardLayout>
        <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">My Products</h1>
          {hasProducts && (
            <div className="flex items-center gap-2 md:gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <span className="hidden sm:inline">Bulk Action</span>
                    <span className="sm:hidden">Bulk</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setShowBulkImport(true)}>
                    <Upload className="w-4 h-4" />
                    Import
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setShowBulkExport(true)}>
                    <Download className="w-4 h-4" />
                    Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AddProductDropdown />
            </div>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-card rounded-lg border border-border">
          {/* Tabs */}
          <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') || 'products'} className="w-full">
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start h-auto p-0 px-4 md:px-6 gap-4 md:gap-6">
              <TabsTrigger 
                value="products" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-4 text-sm font-medium flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Products
              </TabsTrigger>
              <TabsTrigger 
                value="size-variants" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3 pt-4 text-sm font-medium flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Size & Variants
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="mt-0">
              {!hasProducts ? (
                <EmptyState 
                  title="No Products Found" 
                  description="Start by creating your first product" 
                />
              ) : (
                <div>
                  {/* Search & Filter */}
                   <div className="flex items-center gap-3 p-3 md:p-4 border-b border-border">
                     <div className="relative flex-1 md:max-w-sm">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                       <Input
                         placeholder="Search by Product Name, SKU, Barcode, Custom Code"
                         className="pl-10 h-9"
                         value={productSearch}
                         onChange={(e) => setProductSearch(e.target.value)}
                       />
                     </div>
                      <Button
                        variant={showProductFilters ? "secondary" : "ghost"}
                        size="icon"
                        className="h-9 w-9 relative"
                        onClick={() => setShowProductFilters(!showProductFilters)}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        {activeProductFilterCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                            {activeProductFilterCount}
                          </span>
                        )}
                      </Button>
                    </div>

                    {/* Filter Content - shared between inline and drawer */}
                    {(() => {
                      const filterContent = (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground mr-1">Filters</span>
                          {([
                            { key: "brand" as const, label: "Brand", options: brands.map(b => ({ value: b.id, label: b.name })) },
                            { key: "category" as const, label: "Category", options: categories.map(c => ({ value: c.id, label: c.name })) },
                            { key: "taxRule" as const, label: "Tax Rule", options: [{ value: "gst-5", label: "GST 5%" }, { value: "gst-12", label: "GST 12%" }, { value: "gst-18", label: "GST 18%" }, { value: "gst-28", label: "GST 28%" }] },
                            { key: "colour" as const, label: "Colour", options: [{ value: "red", label: "Red" }, { value: "blue", label: "Blue" }, { value: "green", label: "Green" }, { value: "black", label: "Black" }, { value: "white", label: "White" }] },
                          ] as const).map(filter => (
                            <MultiSelectFilterPill
                              key={filter.key}
                              label={filter.label}
                              options={filter.options as any}
                              selected={productFilters[filter.key] as string[]}
                              onChange={(values) => setProductFilters(f => ({ ...f, [filter.key]: values }))}
                            />
                          ))}
                          {[
                             { key: "images", label: "Images", options: [{ value: "available", label: "Available" }, { value: "not-available", label: "Not Available" }] },
                             { key: "inventory", label: "Inventory", options: [{ value: "in-stock", label: "In Stock" }, { value: "out-of-stock", label: "Out of Stock" }] },
                             { key: "published", label: "Published", options: [{ value: "published", label: "Published" }, { value: "unpublished", label: "Unpublished" }] },
                             { key: "listed", label: "Listed", options: [{ value: "listed", label: "Listed" }, { value: "unlisted", label: "Unlisted" }] },
                             { key: "returnable", label: "Returnable", options: [{ value: "returnable", label: "Returnable" }, { value: "non-returnable", label: "Non Returnable" }] },
                             { key: "madeToOrder", label: "Made to Order", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
                           ].map(filter => (
                             <SingleSelectFilterPill
                               key={filter.key}
                               label={filter.label}
                               options={filter.options}
                               selected={(productFilters as any)[filter.key]}
                               onChange={(v) => setProductFilters(f => ({ ...f, [filter.key]: v }))}
                             />
                           ))}
                          {activeProductFilterCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => setProductFilters({ brand: [], category: [], taxRule: [], images: "", inventory: "", published: "", colour: [], listed: "", returnable: "", madeToOrder: "" })}
                            >
                              <X className="w-3 h-3" /> Clear All
                            </Button>
                          )}
                        </div>
                      );

                      return (
                        <>
                          {/* Desktop: inline filter panel */}
                          {showProductFilters && !isMobile && (
                            <div className="px-3 md:px-4 py-3 border-b border-border">
                              {filterContent}
                            </div>
                          )}

                          {/* Mobile: bottom sheet drawer */}
                          {isMobile && (
                            <Drawer open={showProductFilters} onOpenChange={setShowProductFilters}>
                              <DrawerContent>
                                <div className="px-4 pt-6 pb-8 max-h-[60vh] overflow-y-auto">
                                  {filterContent}
                                </div>
                              </DrawerContent>
                            </Drawer>
                          )}
                        </>
                      );
                    })()}

                  {/* Table */}
                   <div>
                     <table className="w-full table-fixed">
                      <thead>
                         <tr className="border-b border-border">
                             <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 w-[55%] md:w-[30%]">Product Name</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 hidden md:table-cell w-[15%]">Category</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 hidden md:table-cell w-[12%]">Product Type</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 hidden md:table-cell w-[13%]">Inventory</th>
                             <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 w-[25%] md:w-[15%]">Status</th>
                             <th className="text-right text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 w-[20%] md:w-[15%]"></th>
                         </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((product) => (
                          <tr 
                            key={product.id} 
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onMouseEnter={() => setHoveredRow(product.id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            onClick={() => navigate(`/edit/${product.id}`)}
                          >
                            <td className="px-3 md:px-4 py-3">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                   {product.image ? (
                                     <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                   ) : (
                                     <div className="w-full h-full flex items-center justify-center">
                                       <Package className="w-5 h-5 text-muted-foreground" />
                                     </div>
                                   )}
                                 </div>
                                 <div className="min-w-0">
                                   <div className="font-medium text-foreground truncate text-sm md:text-base">{product.name}</div>
                                   <div className="text-xs text-muted-foreground truncate">{product.sku} | {product.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")}</div>
                                 </div>
                               </div>
                             </td>
                             <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground truncate hidden md:table-cell">{getCategoryName(product.category)}</td>
                             <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{product.productType || "Goods"}</td>
                             <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">In Stock</td>
                             <td className="px-3 md:px-4 py-3">
                               <StatusBadge status={product.status} />
                             </td>
                               <td className="px-3 md:px-4 py-3 text-right">
                                 <div 
                                   className="flex items-center justify-end gap-2"
                                   onClick={(e) => e.stopPropagation()}
                                >
                                  <span className={`text-xs text-muted-foreground hidden md:inline transition-opacity ${hoveredRow === product.id ? 'opacity-100' : 'opacity-0'}`}>Active</span>
                                  <Switch checked={product.status === "Active"} className={`hidden md:inline-flex transition-opacity ${hoveredRow === product.id ? 'opacity-100' : 'opacity-0'}`} />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                                        onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col gap-2 md:flex-row items-start md:items-center justify-between px-3 md:px-4 py-3 border-t border-border">
                     <span className="text-sm text-muted-foreground">
                       Showing 1-{filteredProducts.length} of {products.length} results
                     </span>
                     <div className="flex items-center gap-3">
                       <span className="text-sm text-muted-foreground hidden md:inline">Rows per page</span>
                      <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Size & Variants Tab */}
            <TabsContent value="size-variants" className="mt-0">
              {!hasProducts ? (
                <EmptyState 
                  title="No Size & Variants Found" 
                  description="Configure sizes and variants for your products" 
                />
              ) : (
                <div>
                  {/* Search & Filter */}
                   <div className="flex items-center gap-3 p-3 md:p-4 border-b border-border">
                     <div className="relative flex-1 md:max-w-sm">
                       <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                       <Input
                         placeholder="Search by Product Name, SKU, Barcode, Custom Code"
                         className="pl-10 h-9"
                         value={variantSearch}
                         onChange={(e) => setVariantSearch(e.target.value)}
                       />
                     </div>
                     <Button
                       variant={showVariantFilters ? "secondary" : "ghost"}
                       size="icon"
                       className="h-9 w-9 relative"
                       onClick={() => setShowVariantFilters(!showVariantFilters)}
                     >
                       <SlidersHorizontal className="w-4 h-4" />
                       {activeVariantFilterCount > 0 && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                           {activeVariantFilterCount}
                         </span>
                       )}
                     </Button>
                   </div>

                    {/* Variant Filter Content */}
                    {(() => {
                      const variantFilterContent = (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground mr-1">Filters</span>
                          {([
                            { key: "brand" as const, label: "Brand", options: brands.map(b => ({ value: b.id, label: b.name })) },
                            { key: "category" as const, label: "Category", options: categories.map(c => ({ value: c.id, label: c.name })) },
                          ] as const).map(filter => (
                            <MultiSelectFilterPill
                              key={filter.key}
                              label={filter.label}
                              options={filter.options as any}
                              selected={variantFilters[filter.key] as string[]}
                              onChange={(values) => setVariantFilters(f => ({ ...f, [filter.key]: values }))}
                            />
                          ))}
                          {[
                             { key: "variantName", label: "Variant Name", options: [{ value: "size", label: "Size" }, { value: "color", label: "Color" }, { value: "material", label: "Material" }] },
                             { key: "images", label: "Images", options: [{ value: "available", label: "Available" }, { value: "not-available", label: "Not Available" }] },
                             { key: "inventory", label: "Inventory", options: [{ value: "in-stock", label: "In Stock" }, { value: "out-of-stock", label: "Out of Stock" }] },
                             { key: "costPrice", label: "Cost Price", options: [{ value: "available", label: "Available" }, { value: "not-available", label: "Not Available" }] },
                             { key: "wholesalePrice", label: "Wholesale Price", options: [{ value: "available", label: "Available" }, { value: "not-available", label: "Not Available" }] },
                              { key: "transferPrice", label: "Transfer Price", options: [{ value: "available", label: "Available" }, { value: "not-available", label: "Not Available" }] },
                              { key: "inventoryTracked", label: "Inventory Tracked", options: [{ value: "tracked", label: "Inventory Tracked" }, { value: "not-tracked", label: "Inventory Not Tracked" }] },
                            ].map(filter => (
                             <SingleSelectFilterPill
                               key={filter.key}
                               label={filter.label}
                               options={filter.options}
                               selected={(variantFilters as any)[filter.key]}
                               onChange={(v) => setVariantFilters(f => ({ ...f, [filter.key]: v }))}
                             />
                           ))}
                          {activeVariantFilterCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                              onClick={() => setVariantFilters({ variantName: "", brand: [], category: [], images: "", inventory: "", costPrice: "", wholesalePrice: "", transferPrice: "", inventoryTracked: "" })}
                            >
                              <X className="w-3 h-3" /> Clear All
                            </Button>
                          )}
                        </div>
                      );

                      return (
                        <>
                          {showVariantFilters && !isMobile && (
                            <div className="px-3 md:px-4 py-3 border-b border-border">
                              {variantFilterContent}
                            </div>
                          )}
                          {isMobile && (
                            <Drawer open={showVariantFilters} onOpenChange={setShowVariantFilters}>
                              <DrawerContent>
                                <div className="px-4 pt-6 pb-8 max-h-[60vh] overflow-y-auto">
                                  {variantFilterContent}
                                </div>
                              </DrawerContent>
                            </Drawer>
                          )}
                        </>
                      );
                    })()}

                   {/* Table */}
                   <div>
                       <table className="w-full">
                         <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3">Product Name</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 hidden md:table-cell">SKU / Barcode</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3">Variant(s)</th>
                            <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3">Selling Price</th>
                             <th className="text-left text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 hidden md:table-cell">Inventory Status</th>
                             <th className="text-right text-xs font-medium text-muted-foreground px-3 md:px-4 py-3 w-[60px]"></th>
                          </tr>
                      </thead>
                      <tbody>
                        {filteredVariantProducts.flatMap((product) => {
                          const variantsData = product.variants as {
                            savedVariants?: Array<{
                              id: string;
                              name: string;
                              values: Array<{ id: string; label: string }>;
                            }>;
                            combinationSellingPrices?: Record<string, string>;
                            combinationQuantities?: Record<string, number>;
                          } | undefined;

                          const savedVariants = variantsData?.savedVariants || [];

                          // No variants -> show single "Default" row
                          if (savedVariants.length === 0) {
                            return (
                              <tr
                                key={product.id}
                                className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => navigate(`/edit/${product.id}?from=size-variants`)}
                              >
                                <td className="px-3 md:px-4 py-3">
                                  <div>
                                    <div className="font-medium text-foreground text-sm">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                  </div>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{product.sku}</td>
                                <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground">Default</td>
                            <td className="px-3 md:px-4 py-3 text-sm text-foreground">
                                  ₹{product.sellingPrice}
                                  {product.baseUom && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      per {BASE_UOM_OPTIONS.find(u => u.code === product.baseUom)?.name ?? product.baseUom}
                                    </span>
                                  )}
                                </td>
                                 <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">In Stock</td>
                                 <td className="px-3 md:px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-7 w-7">
                                         <MoreVertical className="w-4 h-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem
                                         className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                                          onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                                       >
                                         <Trash2 className="w-4 h-4" />
                                         Delete
                                       </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </td>
                               </tr>
                            );
                          }

                          // Generate all combinations (cartesian product)
                          const generateCombinations = (
                            variants: typeof savedVariants
                          ): Array<{ id: string; label: string; values: string[] }> => {
                            if (variants.length === 0) return [];
                            if (variants.length === 1) {
                              return variants[0].values.map((v) => ({
                                id: v.id,
                                label: v.label,
                                values: [v.label],
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

                          return combinations.map((combo, idx) => {
                            const sellingPrice =
                              variantsData?.combinationSellingPrices?.[combo.id] || product.sellingPrice;
                            const qty = variantsData?.combinationQuantities?.[combo.id];
                            const inventoryStatus = qty !== undefined && qty <= 0 ? "Out of Stock" : "In Stock";

                            return (
                              <tr
                                key={`${product.id}-${combo.id}`}
                                 className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                 onClick={() => navigate(`/edit/${product.id}/variant/${combo.id}`)}
                              >
                                <td className="px-3 md:px-4 py-3">
                                  <div>
                                    <div className="font-medium text-foreground text-sm">{product.name}</div>
                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                  </div>
                                </td>
                                <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                                  {product.sku}-{idx + 1}
                                </td>
                                <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground">{combo.label}</td>
                                <td className="px-3 md:px-4 py-3 text-sm text-foreground">
                                  ₹{sellingPrice}
                                  {product.baseUom && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      per {BASE_UOM_OPTIONS.find(u => u.code === product.baseUom)?.name ?? product.baseUom}
                                    </span>
                                  )}
                                </td>
                                 <td className="px-3 md:px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{inventoryStatus}</td>
                                 <td className="px-3 md:px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                   <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                       <Button variant="ghost" size="icon" className="h-7 w-7">
                                         <MoreVertical className="w-4 h-4" />
                                       </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                       <DropdownMenuItem
                                         className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                                         onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                                       >
                                         <Trash2 className="w-4 h-4" />
                                         Delete
                                       </DropdownMenuItem>
                                     </DropdownMenuContent>
                                   </DropdownMenu>
                                 </td>
                               </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col gap-2 md:flex-row items-start md:items-center justify-between px-3 md:px-4 py-3 border-t border-border">
                     <span className="text-sm text-muted-foreground">
                       Showing all variant rows
                     </span>
                     <div className="flex items-center gap-3">
                       <span className="text-sm text-muted-foreground hidden md:inline">Rows per page</span>
                      <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                        <SelectTrigger className="w-16 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk Import</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              {
                icon: icProductImport,
                title: "Product",
                desc: "Create multiple products instantly using a CSV or Excel file",
              },
              {
                icon: icAssetsImport,
                title: "Assets",
                desc: "Upload media assets for multiple products easily using a ZIP file.",
              },
              {
                icon: icInventoryImport,
                title: "Inventory",
                desc: "Upload inventory for multiple products using a CSV or Excel file",
              },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                className="group flex flex-col items-start border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all text-left cursor-pointer"
                onClick={() => {
                  setShowBulkImport(false);
                  if (item.title === "Product") {
                    navigate("/bulk-import");
                  } else if (item.title === "Assets") {
                    navigate("/bulk-import/assets");
                  } else if (item.title === "Inventory") {
                    navigate("/bulk-import/inventory");
                  }
                }}
              >
                <div className="w-full h-20 rounded-lg bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                  <img src={item.icon} alt={item.title} className="w-7 h-7 transition-all group-hover:brightness-0 group-hover:[filter:brightness(0)_saturate(100%)_invert(18%)_sepia(95%)_saturate(6932%)_hue-rotate(243deg)_brightness(97%)_contrast(97%)]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Export Modal */}
      <Dialog open={showBulkExport} onOpenChange={setShowBulkExport}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Export</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              {
                icon: icProductImport,
                title: "Product",
                desc: "Download multiple products in a CSV or Excel file",
                path: "/bulk-export",
              },
              {
                icon: icInventoryImport,
                title: "Inventory",
                desc: "Download inventory for multiple products in a CSV or Excel file",
                path: "/bulk-export/inventory",
              },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                className="group flex flex-col items-start border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all text-left cursor-pointer"
                onClick={() => {
                  setShowBulkExport(false);
                  navigate(item.path);
                }}
              >
                <div className="w-full h-20 rounded-lg bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                  <img src={item.icon} alt={item.title} className="w-7 h-7 transition-all group-hover:brightness-0 group-hover:[filter:brightness(0)_saturate(100%)_invert(18%)_sepia(95%)_saturate(6932%)_hue-rotate(243deg)_brightness(97%)_contrast(97%)]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Product?"
        description={`Are you sure you want to delete ${deleteTarget?.name || "this product"}? This action cannot be undone.`}
        onConfirm={() => { if (deleteTarget) deleteProduct(deleteTarget.id); }}
      />
    </DashboardLayout>
  );
}
