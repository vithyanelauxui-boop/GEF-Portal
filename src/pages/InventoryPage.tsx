import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Search,
  Plus,
  MoreVertical,
  Package,
  GripVertical,
  Columns3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  X,
  SlidersHorizontal,
  Globe,
  Lock,
} from "lucide-react";
import { InventoryFilterPill } from "@/components/inventory/InventoryFilterPill";
import {
  AdvancedFilterModal,
  type AdvancedFilterState,
  type AdvancedFilterCondition,
  type SavedFilterView,
  countAdvancedConditions,
  emptyAdvancedFilter,
} from "@/components/inventory/AdvancedFilterModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useProducts, BASE_UOM_OPTIONS } from "@/contexts/ProductsContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Column definitions ───────────────────────────────────────
interface ColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
  optional: boolean; // can be toggled on/off
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "productName", label: "Product Name", defaultVisible: true, optional: false },
  { id: "skuBarcode", label: "SKU / Barcode", defaultVisible: true, optional: false },
  { id: "batchNumber", label: "Batch Number", defaultVisible: true, optional: false },
  { id: "batchStatus", label: "Batch Status", defaultVisible: true, optional: false },
  { id: "location", label: "Location", defaultVisible: true, optional: false },
  { id: "baseUom", label: "Base UOM", defaultVisible: true, optional: false },
  { id: "sellingPrice", label: "Selling Price", defaultVisible: true, optional: false },
  { id: "compareAt", label: "Full Price", defaultVisible: true, optional: false },
  { id: "sellable", label: "Sellable", defaultVisible: true, optional: false },
  { id: "onHand", label: "On Hand", defaultVisible: true, optional: false },
  { id: "expiryDate", label: "Expiry Date", defaultVisible: true, optional: false },
  // Optional columns
  { id: "variants", label: "Variant(s)", defaultVisible: false, optional: true },
  { id: "vendorCode", label: "Custom Code", defaultVisible: false, optional: true },
  { id: "category", label: "Category", defaultVisible: false, optional: true },
  { id: "brand", label: "Brand", defaultVisible: false, optional: true },
  { id: "productType", label: "Product Type", defaultVisible: false, optional: true },
  { id: "costPrice", label: "Cost Price", defaultVisible: false, optional: true },
  { id: "transferPrice", label: "Transfer Price", defaultVisible: false, optional: true },
  { id: "committed", label: "Committed", defaultVisible: false, optional: true },
  { id: "damaged", label: "Damaged", defaultVisible: false, optional: true },
  { id: "onHold", label: "On Hold", defaultVisible: false, optional: true },
  { id: "createdAt", label: "Created At", defaultVisible: false, optional: true },
  { id: "createdBy", label: "Created By", defaultVisible: false, optional: true },
  { id: "updatedAt", label: "Updated At", defaultVisible: false, optional: true },
  { id: "updatedBy", label: "Updated By", defaultVisible: false, optional: true },
];

// ─── Flattened inventory row type ─────────────────────────────
interface InventoryRow {
  id: string;
  productName: string;
  sku: string;
  barcode: string;
  batchNumber: string;
  batchStatus: string;
  locationName: string;
  locationCode: string;
  baseUom: string;
  sellingPrice: string;
  compareAt: string;
  sellable: number;
  onHand: number;
  expiryDate: string;
  variants: string;
  vendorCode: string;
  category: string;
  brand: string;
  productType: string;
  costPrice: string;
  wholesalePrice: string;
  transferPrice: string;
  committed: number;
  damaged: number;
  onHold: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

// ─── Sortable column item for reordering ──────────────────────
function SortableColumnItem({
  col,
  checked,
  onToggle,
}: {
  col: ColumnDef;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: col.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 text-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {col.optional ? (
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(col.id)}
          className="h-3.5 w-3.5"
        />
      ) : (
        <Checkbox checked disabled className="h-3.5 w-3.5 opacity-50" />
      )}
      <span className="text-foreground">{col.label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
const InventoryPage = () => {
  const navigate = useNavigate();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pill filters (multi-select)
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [identifierFilter, setIdentifierFilter] = useState<string[]>([]);
  const [skuFilter, setSkuFilter] = useState<string[]>([]);
  const [barcodeFilter, setBarcodeFilter] = useState<string[]>([]);
  const [customCodeFilter, setCustomCodeFilter] = useState<string[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<string[]>([]);

  // Filter visibility toggle
  const [filtersVisible, setFiltersVisible] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Advanced filter
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilterState>(emptyAdvancedFilter());

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedFilterView[]>([]);
  const fetchSavedViews = useCallback(async () => {
    const { data } = await supabase
      .from("saved_filter_views")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setSavedViews(data.map((d: any) => ({
        id: d.id,
        name: d.name,
        is_public: d.is_public,
        filters: d.filters as AdvancedFilterState,
        created_at: d.created_at,
      })));
    }
  }, []);

  React.useEffect(() => {
    fetchSavedViews();
  }, [fetchSavedViews]);

  // Active saved view
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const handleSelectView = (view: SavedFilterView | null) => {
    if (!view) {
      // "All" — clear advanced filter
      setActiveViewId(null);
      setAdvancedFilter(emptyAdvancedFilter());
    } else {
      setActiveViewId(view.id);
      setAdvancedFilter(view.filters);
    }
  };

  // Count of active pill filters
  const activeFilterCount = useMemo(() => {
    return [locationFilter, identifierFilter, skuFilter, barcodeFilter, customCodeFilter, inventoryFilter]
      .filter(f => f.length > 0).length;
  }, [locationFilter, identifierFilter, skuFilter, barcodeFilter, customCodeFilter, inventoryFilter]);

  // Read URL params for pre-filtering
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get("location");
    const ident = params.get("identifier");
    if (loc) setLocationFilter([loc]);
    if (ident) setIdentifierFilter([ident]);
  }, []);
  // Column order & visibility
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map((c) => c.id));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => !c.defaultVisible).map((c) => c.id))
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = useCallback((id: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleColumns = useMemo(
    () => columnOrder.filter((id) => !hiddenColumns.has(id)),
    [columnOrder, hiddenColumns]
  );

  const columnMap = useMemo(() => {
    const m = new Map<string, ColumnDef>();
    ALL_COLUMNS.forEach((c) => m.set(c.id, c));
    return m;
  }, []);

  // ─── Build flattened inventory rows from products context ────
  const inventoryRows: InventoryRow[] = useMemo(() => {
    const rows: InventoryRow[] = [];
    products.forEach((product) => {
      const uomLabel =
        BASE_UOM_OPTIONS.find((u) => u.code === product.baseUom)?.name ?? product.baseUom ?? "Each";
      const varData = product.variants as any;

      if (product.hasVariants && varData?.savedVariants?.length && varData?.variantDetailData) {
        // expand each variant combination
        Object.entries(varData.variantDetailData).forEach(([combId, detail]: [string, any]) => {
          const skuIdent = detail?.identifiers?.find((i: any) => i.type === "sku");
          const sku = skuIdent?.value ?? "";
          const variantLabels = combId
            .split("-")
            .reduce((acc: string[], part: string, i: number, arr: string[]) => {
              if (i % 2 === 1) acc.push(part);
              return acc;
            }, [])
            .join(" / ");

          const locations: any[] = detail?.inventory ?? [
            { name: "Default", committed: 0, available: 0, total: 0, unavailableCategories: {} },
          ];

          locations.forEach((loc: any, locIdx: number) => {
            rows.push({
              id: `${product.id}-${combId}-${locIdx}`,
              productName: product.name,
              sku,
              barcode: "",
              batchNumber: "-",
              batchStatus: "Active",
              locationName: loc.name ?? "Default",
              locationCode: loc.code ?? "",
              baseUom: uomLabel,
              sellingPrice: detail?.pricing?.sellingPrice ?? "",
              compareAt: detail?.pricing?.actualPrice ?? "",
              sellable: loc.available ?? 0,
              onHand: loc.total ?? 0,
              expiryDate: "-",
              variants: variantLabels,
              vendorCode: "",
              category: product.categoryName,
              brand: product.brand ?? "",
              productType: product.productType ?? "Goods",
              costPrice: product.pricingExtras?.costPrice ?? "",
              wholesalePrice: "",
              transferPrice: "",
              committed: loc.committed ?? 0,
              damaged: loc.unavailableCategories?.damaged ?? 0,
              onHold: loc.unavailableCategories?.onHold ?? 0,
              createdAt: "",
              createdBy: "",
              updatedAt: "",
              updatedBy: "",
            });
          });
        });
      } else {
        // Non-variant product
        const invData = product.inventory as any;
        const locations: any[] = invData?.locations ?? [
          { name: "Default", committed: 0, available: 0, total: 0, unavailableCategories: {} },
        ];
        locations.forEach((loc: any, locIdx: number) => {
          rows.push({
            id: `${product.id}-${locIdx}`,
            productName: product.name,
            sku: product.sku,
            barcode: "",
            batchNumber: "-",
            batchStatus: "Active",
            locationName: loc.name ?? "Default",
            locationCode: loc.code ?? "",
            baseUom: uomLabel,
            sellingPrice: product.sellingPrice,
            compareAt: product.actualPrice,
            sellable: loc.available ?? 0,
            onHand: loc.total ?? 0,
            expiryDate: "-",
            variants: "-",
            vendorCode: "",
            category: product.categoryName,
            brand: product.brand ?? "",
            productType: product.productType ?? "Goods",
            costPrice: product.pricingExtras?.costPrice ?? "",
            wholesalePrice: "",
            transferPrice: "",
            committed: loc.committed ?? 0,
            damaged: loc.unavailableCategories?.damaged ?? 0,
            onHold: loc.unavailableCategories?.onHold ?? 0,
            createdAt: "",
            createdBy: "",
            updatedAt: "",
            updatedBy: "",
          });
        });
      }
    });
    return rows;
  }, [products]);

  // Unique locations and identifiers for filters
  const uniqueLocations = useMemo(() => Array.from(new Set(inventoryRows.map(r => r.locationName))).sort(), [inventoryRows]);
  const uniqueIdentifiers = useMemo(() => Array.from(new Set(inventoryRows.map(r => r.sku).filter(Boolean))).sort(), [inventoryRows]);
  const uniqueSkus = useMemo(() => Array.from(new Set(inventoryRows.map(r => r.sku).filter(Boolean))).sort(), [inventoryRows]);
  const uniqueBarcodes = useMemo(() => Array.from(new Set(inventoryRows.map(r => r.barcode).filter(Boolean))).sort(), [inventoryRows]);

  // Build fieldOptions for text fields in advanced filter
  const fieldOptions = useMemo(() => {
    const textFields: Record<string, (r: InventoryRow) => string> = {
      location: (r) => r.locationName,
      primaryIdentifier: (r) => r.sku,
      sku: (r) => r.sku,
      barcode: (r) => r.barcode,
      customCode: () => "",
      baseUom: (r) => r.baseUom,
      variant: (r) => r.variants,
      productType: (r) => r.productType,
      createdBy: (r) => r.createdBy,
      updatedBy: (r) => r.updatedBy,
    };
    const result: Record<string, string[]> = {};
    for (const [key, getter] of Object.entries(textFields)) {
      result[key] = Array.from(new Set(inventoryRows.map(getter).filter(Boolean))).sort();
    }
    return result;
  }, [inventoryRows]);

  // Filter
  const applyAdvancedCondition = useCallback((row: InventoryRow, cond: AdvancedFilterCondition): boolean => {
    const sellingNum = parseFloat(row.sellingPrice) || 0;
    const compareNum = parseFloat(row.compareAt) || 0;
    const costNum = parseFloat(row.costPrice) || 0;
    const transferNum = parseFloat(row.transferPrice) || 0;
    const discount = compareNum > sellingNum ? compareNum - sellingNum : 0;
    const margin = costNum > 0 ? sellingNum - costNum : 0;
    const transferMargin = costNum > 0 && transferNum > 0 ? transferNum - costNum : 0;

    const fieldMap: Record<string, string | number> = {
      location: row.locationName,
      primaryIdentifier: row.sku,
      sku: row.sku,
      barcode: row.barcode,
      customCode: "",
      baseUom: row.baseUom,
      variant: row.variants,
      productType: row.productType,
      onHand: row.onHand,
      sellable: row.sellable,
      committed: row.committed,
      damaged: row.damaged,
      sellingPrice: sellingNum,
      compareAt: compareNum,
      costPrice: costNum,
      transferPrice: transferNum,
      discount,
      margin,
      transferMargin,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const val = fieldMap[cond.field] ?? "";
    const cv = cond.value;
    const cv2 = cond.value2;

    if (typeof val === "number") {
      const n = Number(cv);
      const n2 = Number(cv2);
      switch (cond.operator) {
        case "equals": return val === n;
        case "greater_than": return val > n;
        case "less_than": return val < n;
        case "between": return val >= n && val <= n2;
        default: return true;
      }
    }
    const s = String(val).toLowerCase();
    // For text fields, value may be ||| separated for multi-select
    const selectedVals = cv.split("|||").filter(Boolean).map((v) => v.toLowerCase());
    switch (cond.operator) {
      case "equals": return selectedVals.length > 0 ? selectedVals.includes(s) : true;
      case "not_equals": return selectedVals.length > 0 ? !selectedVals.includes(s) : true;
      case "in": return selectedVals.length > 0 ? selectedVals.includes(s) : true;
      case "not_in": return selectedVals.length > 0 ? !selectedVals.includes(s) : true;
      case "greater_than": return s > selectedVals[0];
      case "less_than": return s < selectedVals[0];
      case "between": return s >= selectedVals[0] && s <= cv2.toLowerCase();
      default: return true;
    }
  }, []);

  const filteredRows = useMemo(() => {
    let rows = inventoryRows;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          r.batchNumber.toLowerCase().includes(q)
      );
    }
    // Pill filters
    if (locationFilter.length > 0) {
      rows = rows.filter(r => locationFilter.includes(r.locationName));
    }
    if (identifierFilter.length > 0) {
      rows = rows.filter(r => identifierFilter.includes(r.sku));
    }
    if (skuFilter.length > 0) {
      rows = rows.filter(r => skuFilter.includes(r.sku));
    }
    if (barcodeFilter.length > 0) {
      rows = rows.filter(r => barcodeFilter.includes(r.barcode));
    }
    if (customCodeFilter.length > 0) {
      // placeholder — no customCode field yet
    }
    // Inventory status filter
    if (inventoryFilter.length > 0) {
      rows = rows.filter(r => {
        const status = r.onHand > 0 ? "In Stock" : "Out of Stock";
        return inventoryFilter.includes(status);
      });
    }
    // Advanced filter: groups are OR'd, conditions within each group are AND'd
    if (advancedFilter.groups.length > 0) {
      rows = rows.filter((r) =>
        advancedFilter.groups.some((group) =>
          group.conditions.every((c) => applyAdvancedCondition(r, c))
        )
      );
    }
    return rows;
  }, [inventoryRows, searchQuery, locationFilter, identifierFilter, skuFilter, barcodeFilter, customCodeFilter, inventoryFilter, advancedFilter, applyAdvancedCondition]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, locationFilter, identifierFilter, skuFilter, barcodeFilter, customCodeFilter, inventoryFilter, advancedFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // ─── Cell renderer ──────────────────────────────────────────
  const renderCell = (row: InventoryRow, colId: string) => {
    switch (colId) {
      case "productName":
        return <span className="font-medium text-foreground">{row.productName}</span>;
      case "skuBarcode":
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {row.sku}
            {row.barcode ? ` | ${row.barcode}` : ""}
          </span>
        );
      case "batchNumber":
        return <span className="text-sm text-muted-foreground">{row.batchNumber}</span>;
      case "batchStatus":
        return <span className="text-sm text-muted-foreground">{row.batchStatus}</span>;
      case "location":
        return (
          <div className="text-sm">
            <span className="text-foreground">{row.locationName}</span>
            {row.locationCode && (
              <span className="text-muted-foreground ml-1 text-xs">({row.locationCode})</span>
            )}
          </div>
        );
      case "baseUom":
        return <span className="text-sm">{row.baseUom}</span>;
      case "sellingPrice":
        return <span className="text-sm text-right tabular-nums">{row.sellingPrice ? `₹${row.sellingPrice}` : "-"}</span>;
      case "compareAt":
        return <span className="text-sm text-right tabular-nums text-muted-foreground">{row.compareAt ? `₹${row.compareAt}` : "-"}</span>;
      case "sellable":
        return <span className="text-sm text-right tabular-nums">{row.sellable}</span>;
      case "onHand":
        return <span className="text-sm text-right tabular-nums">{row.onHand}</span>;
      case "expiryDate":
        return <span className="text-sm text-muted-foreground">{row.expiryDate}</span>;
      case "variants":
        return <span className="text-sm text-muted-foreground">{row.variants}</span>;
      case "vendorCode":
        return <span className="text-sm text-muted-foreground">{row.vendorCode || "-"}</span>;
      case "category":
        return <span className="text-sm">{row.category || "-"}</span>;
      case "brand":
        return <span className="text-sm">{row.brand || "-"}</span>;
      case "productType":
        return <span className="text-sm">{row.productType}</span>;
      case "costPrice":
        return <span className="text-sm tabular-nums">{row.costPrice ? `₹${row.costPrice}` : "-"}</span>;
      case "transferPrice":
        return <span className="text-sm tabular-nums">{row.transferPrice || "-"}</span>;
      case "committed":
        return <span className="text-sm tabular-nums">{row.committed}</span>;
      case "damaged":
        return <span className="text-sm tabular-nums">{row.damaged}</span>;
      case "onHold":
        return <span className="text-sm tabular-nums">{row.onHold}</span>;
      case "createdAt":
        return <span className="text-sm text-muted-foreground">{row.createdAt || "-"}</span>;
      case "createdBy":
        return <span className="text-sm text-muted-foreground">{row.createdBy || "-"}</span>;
      case "updatedAt":
        return <span className="text-sm text-muted-foreground">{row.updatedAt || "-"}</span>;
      case "updatedBy":
        return <span className="text-sm text-muted-foreground">{row.updatedBy || "-"}</span>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage inventory across all products
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Bulk Action
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/bulk-export/inventory")}>
                  <Download className="w-4 h-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/bulk-import/inventory")}>
                  <Upload className="w-4 h-4" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Inventory
            </Button>
          </div>
        </div>

        {/* Search & Advanced Filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by Product Name, SKU, Barcode, Custom Code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className={`h-9 w-9 flex-shrink-0 relative ${filtersVisible ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary" : ""}`}
            onClick={() => setFiltersVisible((v) => !v)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-1">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {/* Column manager */}
          <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <Columns3 className="w-4 h-4" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-border mb-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Manage Columns
                </span>
                <button onClick={() => setColumnsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
                <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                  {columnOrder.map((id) => {
                    const col = columnMap.get(id)!;
                    return (
                      <SortableColumnItem
                        key={id}
                        col={col}
                        checked={!hiddenColumns.has(id)}
                        onToggle={toggleColumn}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
            </PopoverContent>
          </Popover>
        </div>

        {/* Pill filters - shown only when filter icon is toggled */}
        {filtersVisible && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Filters</span>
            <InventoryFilterPill
              label="Location"
              options={uniqueLocations}
              selectedValues={locationFilter}
              onChange={setLocationFilter}
            />
            <InventoryFilterPill
              label="Primary Identifier"
              options={uniqueIdentifiers}
              selectedValues={identifierFilter}
              onChange={setIdentifierFilter}
            />
            <InventoryFilterPill
              label="SKU"
              options={uniqueSkus}
              selectedValues={skuFilter}
              onChange={setSkuFilter}
            />
            <InventoryFilterPill
              label="Barcode"
              options={uniqueBarcodes}
              selectedValues={barcodeFilter}
              onChange={setBarcodeFilter}
            />
            <InventoryFilterPill
              label="Custom Code"
              options={[]}
              selectedValues={customCodeFilter}
              onChange={setCustomCodeFilter}
            />
            <InventoryFilterPill
              label="Inventory"
              options={["In Stock", "Out of Stock"]}
              selectedValues={inventoryFilter}
              onChange={setInventoryFilter}
            />
            {countAdvancedConditions(advancedFilter) > 0 && (
              <span className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs border border-primary/30 bg-primary/5 text-primary">
                Advanced: {countAdvancedConditions(advancedFilter)} rule{countAdvancedConditions(advancedFilter) > 1 ? "s" : ""} in {advancedFilter.groups.length} group{advancedFilter.groups.length > 1 ? "s" : ""}
                <button onClick={() => setAdvancedFilter(emptyAdvancedFilter())}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(activeFilterCount > 0 || countAdvancedConditions(advancedFilter) > 0) && (
              <button
                type="button"
                onClick={() => {
                  setLocationFilter([]);
                  setIdentifierFilter([]);
                  setSkuFilter([]);
                  setBarcodeFilter([]);
                  setCustomCodeFilter([]);
                  setInventoryFilter([]);
                  setAdvancedFilter(emptyAdvancedFilter());
                }}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            )}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-8"
                onClick={() => setAdvancedFilterOpen(true)}
              >
                Advanced Filter
              </Button>
            </div>
          </div>
        )}

        {/* Saved Views tabs — always visible */}
        {savedViews.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              onClick={() => handleSelectView(null)}
              className={`inline-flex items-center h-8 px-3.5 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                activeViewId === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              All
            </button>
            {savedViews.map((view) => (
              <button
                key={view.id}
                onClick={() => handleSelectView(view)}
                className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                  activeViewId === view.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {view.is_public ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {view.name}
              </button>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((colId) => {
                    const col = columnMap.get(colId)!;
                    const isNumeric = [
                      "sellingPrice",
                      "compareAt",
                      "sellable",
                      "onHand",
                      "costPrice",
                      "wholesalePrice",
                      "transferPrice",
                      "committed",
                      "damaged",
                      "onHold",
                    ].includes(colId);
                    return (
                      <TableHead key={colId} className={isNumeric ? "text-right" : ""}>
                        {col.label}
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 1} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No inventory records</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Inventory data will appear here as products are added
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow key={row.id}>
                      {visibleColumns.map((colId) => {
                        const isNumeric = [
                          "sellingPrice",
                          "compareAt",
                          "sellable",
                          "onHand",
                          "costPrice",
                          "wholesalePrice",
                          "transferPrice",
                          "committed",
                          "damaged",
                          "onHold",
                        ].includes(colId);
                        return (
                          <TableCell key={colId} className={isNumeric ? "text-right" : ""}>
                            {renderCell(row, colId)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="w-10 p-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-72">
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal">
                              <span className="font-medium text-foreground">Adjust Stock</span>
                              <span className="text-xs text-muted-foreground">Manually increase or decrease stock for this SKU/Batch at this location.</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal">
                              <span className="font-medium text-foreground">Reclassify Stock</span>
                              <span className="text-xs text-muted-foreground">Move stock between inventory states. Example: Sellable to Damaged.</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal">
                              <span className="font-medium text-foreground">Transfer Stock</span>
                              <span className="text-xs text-muted-foreground">Move stock from this location to another location.</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal">
                              <span className="font-medium text-foreground">Update Batch Status</span>
                              <span className="text-xs text-muted-foreground">Active / Hold / Expired / Quarantine</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal">
                              <span className="font-medium text-foreground">View History</span>
                              <span className="text-xs text-muted-foreground">View all transactions affecting this SKU/Batch/Location.</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex flex-col items-start gap-0.5 whitespace-normal text-destructive focus:text-destructive">
                              <span className="font-medium">Delete</span>
                              <span className="text-xs opacity-70">Permanently remove this inventory record.</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} records
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        {/* Advanced Filter Modal */}
        <AdvancedFilterModal
          open={advancedFilterOpen}
          onOpenChange={setAdvancedFilterOpen}
          filterState={advancedFilter}
          onApply={setAdvancedFilter}
          savedViews={savedViews}
          onViewsChanged={fetchSavedViews}
          fieldOptions={fieldOptions}
        />
      </div>
    </DashboardLayout>
  );
};

export default InventoryPage;
