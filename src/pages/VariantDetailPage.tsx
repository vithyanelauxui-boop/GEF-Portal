import { useState, useMemo, useEffect } from "react";
import { BASE_UOM_OPTIONS } from "@/contexts/ProductsContext";
import { useParams, useNavigate } from "react-router-dom";
import { Search, Filter, Plus, MoreVertical, HelpCircle, Trash2, Pencil, Check, X, History, ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Menu, ExternalLink, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import overrideIcon from "@/assets/override-icon.svg";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useProducts } from "@/contexts/ProductsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { InventoryManagementPopover, UnavailableCategories } from "@/components/products/InventoryManagementPopover";
import { ALL_LOCATIONS, createDefaultUnavailableCategories } from "@/components/products/Inventory";
import type { VariantDetailData, InventoryLocation, VariantCustomDataEntry, ShipmentEntry } from "@/components/products/VariantDetailModal";

interface VariantCombination {
  id: string;
  label: string;
  image?: string;
  values: string[];
}

const IDENTIFIER_TYPES = [
  { value: "sku", label: "SKU" },
  { value: "ean", label: "EAN" },
  { value: "upc", label: "UPC" },
  { value: "isbn", label: "ISBN" },
  { value: "alu", label: "ALU" },
  { value: "custom", label: "Custom" },
];

const ADDITIONAL_PRICE_OPTIONS = [
  { type: "avgCost", label: "Cost Price" },
  { type: "transfer", label: "Transfer Price" },
];

const AVAILABLE_LOCATIONS = [
  { id: "loc-101", name: "Mumbai", code: "101" },
  { id: "loc-102", name: "Delhi", code: "102" },
  { id: "loc-103", name: "Bangalore", code: "103" },
  { id: "loc-104", name: "Chennai", code: "104" },
  { id: "loc-105", name: "Hyderabad", code: "105" },
  { id: "loc-106", name: "Pune", code: "106" },
  { id: "loc-107", name: "Kolkata", code: "107" },
  { id: "loc-108", name: "Ahmedabad", code: "108" },
];


const getTotalUnavailable = (categories: UnavailableCategories): number => {
  return categories.damaged + categories.lost + categories.onHold + categories.inTransit;
};

const createDefaultVariantData = (quantity: number = 0): VariantDetailData => ({
  identifiers: [{ id: "1", type: "sku", value: "", isPrimary: true }],
  customLabels: {},
  shipment: {
    length: "",
    width: "",
    height: "",
    units: "cm",
    weight: "",
    weightUnit: "grams",
  },
  pricing: {
    actualPrice: "",
    actualCurrency: "inr",
    sellingPrice: "",
    sellingCurrency: "inr",
    additionalPrices: [],
  },
  inventory: [
    {
      id: "1",
      name: "Mumbai",
      locationCode: "101",
      unavailableCategories: createDefaultUnavailableCategories(),
      committed: 0,
      available: quantity,
      total: quantity,
    },
  ],
});

const VariantDetailPage = () => {
  const { id: productId, comboId } = useParams<{ id: string; comboId: string }>();
  const navigate = useNavigate();
  const { products, updateProduct } = useProducts();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);
  
  const [addingVariantValue, setAddingVariantValue] = useState(false);
  const [newVariantGroupId, setNewVariantGroupId] = useState("");
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [shipmentExpanded, setShipmentExpanded] = useState(true);
  const [invControlExpanded, setInvControlExpanded] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "InActive">("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [editingShipmentName, setEditingShipmentName] = useState<string | null>(null);
  const [editingShipmentNameValue, setEditingShipmentNameValue] = useState("");

  const product = products.find((p) => p.id === productId);

  const variantsData = product?.variants as {
    savedVariants?: Array<{
      id: string;
      name: string;
      values: Array<{ id: string; label: string; images?: string[] }>;
    }>;
    variantDetailData?: Record<string, VariantDetailData>;
    combinationQuantities?: Record<string, number>;
    combinationActualPrices?: Record<string, string>;
    combinationSellingPrices?: Record<string, string>;
    combinationImages?: Record<string, string>;
  } | undefined;

  const allCombinations = useMemo((): VariantCombination[] => {
    const savedVariants = variantsData?.savedVariants || [];
    if (savedVariants.length === 0) return [];

    const generateCombos = (
      variants: typeof savedVariants
    ): VariantCombination[] => {
      if (variants.length === 0) return [];
      if (variants.length === 1) {
        return variants[0].values.map((v) => ({
          id: v.id,
          label: v.label,
          values: [v.label],
          image: variantsData?.combinationImages?.[v.id],
        }));
      }

      const result: VariantCombination[] = [];
      const [first, ...rest] = variants;

      first.values.forEach((parentValue) => {
        if (rest.length === 1) {
          rest[0].values.forEach((childValue) => {
            const cId = `${parentValue.id}-${childValue.id}`;
            result.push({
              id: cId,
              label: `${parentValue.label} / ${childValue.label}`,
              values: [parentValue.label, childValue.label],
              image: variantsData?.combinationImages?.[cId],
            });
          });
        } else {
          const childCombos = generateCombos(rest);
          childCombos.forEach((combo) => {
            const cId = `${parentValue.id}-${combo.id}`;
            result.push({
              id: cId,
              label: `${parentValue.label} / ${combo.label}`,
              values: [parentValue.label, ...combo.values],
              image: variantsData?.combinationImages?.[cId],
            });
          });
        }
      });

      return result;
    };

    return generateCombos(savedVariants);
  }, [variantsData]);

  const [selectedId, setSelectedId] = useState(comboId || allCombinations[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [localVariantData, setLocalVariantData] = useState<Record<string, VariantDetailData>>(
    variantsData?.variantDetailData || {}
  );

  useEffect(() => {
    if (comboId && allCombinations.some(c => c.id === comboId)) {
      setSelectedId(comboId);
    } else if (allCombinations.length > 0 && !allCombinations.some(c => c.id === selectedId)) {
      setSelectedId(allCombinations[0].id);
    }
  }, [comboId, allCombinations]);

  const currentQuantity = selectedId ? (variantsData?.combinationQuantities?.[selectedId] || 0) : 0;

  const currentData = useMemo(() => {
    if (!selectedId) return createDefaultVariantData(0);
    const existingData = localVariantData[selectedId];
    const tableActualPrice = variantsData?.combinationActualPrices?.[selectedId] || "";
    const tableSellingPrice = variantsData?.combinationSellingPrices?.[selectedId] || "";

    if (existingData) {
      return {
        ...existingData,
        pricing: {
          ...existingData.pricing,
          actualPrice: existingData.pricing.actualPrice || tableActualPrice,
          sellingPrice: existingData.pricing.sellingPrice || tableSellingPrice,
        },
        inventory: existingData.inventory.map(loc => {
          const totalUnavailable = getTotalUnavailable(loc.unavailableCategories);
          return {
            ...loc,
            available: currentQuantity,
            total: totalUnavailable + loc.committed + currentQuantity,
          };
        }),
      };
    }

    const defaultData = createDefaultVariantData(currentQuantity);
    return {
      ...defaultData,
      pricing: {
        ...defaultData.pricing,
        actualPrice: tableActualPrice,
        sellingPrice: tableSellingPrice,
      },
    };
  }, [selectedId, localVariantData, currentQuantity, variantsData]);

  const isLotTracked = (currentData.inventoryControl?.lotTrackingMode ?? "NONE") !== "NONE";

  const updateCurrentData = (updates: Partial<VariantDetailData>) => {
    if (!selectedId) return;
    const updated = { ...currentData, ...updates };
    setLocalVariantData(prev => ({ ...prev, [selectedId]: updated }));
    setIsDirty(true);
  };

  // Auto-collapse sections when they have data
  useEffect(() => {
    if (!selectedId) return;
    const s = currentData.shipment;
    const shipFilled = !!(s?.length && s?.width && s?.height && s?.weight);
    setShipmentExpanded(!shipFilled);
    setInvControlExpanded(false);
  }, [selectedId]);

  const filteredCombinations = useMemo(() => {
    let result = allCombinations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.label.toLowerCase().includes(query));
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => {
        if (c.id === selectedId) return true;
        const data = localVariantData[c.id];
        const s = data?.status ?? "Active";
        return s === statusFilter;
      });
    }
    return result;
  }, [allCombinations, searchQuery, statusFilter, localVariantData, selectedId]);

  const selectedCombination = allCombinations.find((c) => c.id === selectedId);

  const addIdentifier = () => {
    const newId = Date.now().toString();
    updateCurrentData({
      identifiers: [
        ...currentData.identifiers,
        { id: newId, type: "sku", value: "", isPrimary: false },
      ],
    });
  };

  const updateIdentifier = (id: string, field: string, value: string | boolean) => {
    updateCurrentData({
      identifiers: currentData.identifiers.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const makePrimary = (id: string) => {
    updateCurrentData({
      identifiers: currentData.identifiers.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      })),
    });
  };

  const deleteIdentifier = (id: string) => {
    const filtered = currentData.identifiers.filter((item) => item.id !== id);
    updateCurrentData({ identifiers: filtered });
  };

  const updateCustomLabel = (id: string, label: string) => {
    updateCurrentData({
      customLabels: { ...currentData.customLabels, [id]: label },
    });
  };

  const updateShipment = (field: string, value: string) => {
    updateCurrentData({
      shipment: { ...currentData.shipment, [field]: value },
    });
  };

  const updatePricing = (field: string, value: string) => {
    updateCurrentData({
      pricing: { ...currentData.pricing, [field]: value },
    });
  };

  const addAdditionalPrice = (type: string, label: string) => {
    const existing = currentData.pricing.additionalPrices.find((p) => p.type === type);
    if (!existing) {
      updateCurrentData({
        pricing: {
          ...currentData.pricing,
          additionalPrices: [
            ...currentData.pricing.additionalPrices,
            { type, label, value: "", currency: "inr" },
          ],
        },
      });
    }
  };

  const updateAdditionalPrice = (type: string, value: string) => {
    updateCurrentData({
      pricing: {
        ...currentData.pricing,
        additionalPrices: currentData.pricing.additionalPrices.map((p) =>
          p.type === type ? { ...p, value } : p
        ),
      },
    });
  };

  const updateInventoryLocation = (id: string, field: "committed", value: number) => {
    const updatedInventory = currentData.inventory.map((loc) => {
      if (loc.id === id) {
        const totalUnavailable = getTotalUnavailable(loc.unavailableCategories);
        const updated = { ...loc, [field]: value };
        updated.total = updated.available + updated.committed + totalUnavailable;
        return updated;
      }
      return loc;
    });
    updateCurrentData({ inventory: updatedInventory });
  };

  const handleInventoryUpdate = (
    locationId: string,
    category: keyof UnavailableCategories,
    action: "add" | "moveToSellable" | "delete",
    quantity: number
  ) => {
    const updatedInventory = currentData.inventory.map((loc) => {
      if (loc.id === locationId) {
        const updatedCategories = { ...loc.unavailableCategories };
        let updatedAvailable = loc.available;

        switch (action) {
          case "add":
            updatedCategories[category] += quantity;
            updatedAvailable = Math.max(0, updatedAvailable - quantity);
            break;
          case "moveToSellable":
            updatedCategories[category] = Math.max(0, updatedCategories[category] - quantity);
            updatedAvailable += quantity;
            break;
          case "delete":
            updatedCategories[category] = Math.max(0, updatedCategories[category] - quantity);
            break;
        }

        const totalUnavailable = getTotalUnavailable(updatedCategories);
        return {
          ...loc,
          unavailableCategories: updatedCategories,
          available: updatedAvailable,
          total: updatedAvailable + loc.committed + totalUnavailable,
        };
      }
      return loc;
    });
    updateCurrentData({ inventory: updatedInventory });
  };

  const length = parseFloat(currentData.shipment.length) || 0;
  const width = parseFloat(currentData.shipment.width) || 0;
  const height = parseFloat(currentData.shipment.height) || 0;
  const deadWeight = parseFloat(currentData.shipment.weight) || 0;
  const volumetricWeight = length && width && height ? (length * width * height) / 5 : 0;
  const applicableWeight = Math.max(deadWeight, volumetricWeight);
  const showWeightCalculations = length > 0 && width > 0 && height > 0;
  const [shipmentEnabled, setShipmentEnabled] = useState(true);

  const availableAdditionalPrices = ADDITIONAL_PRICE_OPTIONS.filter(
    (opt) => !currentData.pricing.additionalPrices.some((p) => p.type === opt.type)
  );

  const [additionalPricingOpen, setAdditionalPricingOpen] = useState(false);
  const [variantInventorySearch, setVariantInventorySearch] = useState("");
  const [variantSellableFilter, setVariantSellableFilter] = useState("all");
  const [variantOnHandFilter, setVariantOnHandFilter] = useState("all");

  const filteredVariantInventory = useMemo(() => {
    if (!currentData?.inventory) return [];
    return currentData.inventory.filter((loc) => {
      if (variantInventorySearch && !loc.name.toLowerCase().includes(variantInventorySearch.toLowerCase())) return false;
      if (variantSellableFilter === "inStock" && loc.available <= 0) return false;
      if (variantSellableFilter === "outOfStock" && loc.available > 0) return false;
      if (variantOnHandFilter === "inStock" && loc.total <= 0) return false;
      if (variantOnHandFilter === "outOfStock" && loc.total > 0) return false;
      return true;
    });
  }, [currentData?.inventory, variantInventorySearch, variantSellableFilter, variantOnHandFilter]);

  const [variantAddLocationOpen, setVariantAddLocationOpen] = useState(false);
  const [variantLocationSearch, setVariantLocationSearch] = useState("");
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);

  const variantAvailableLocations = useMemo(() => {
    if (!currentData?.inventory) return [];
    return ALL_LOCATIONS.filter(
      (l) =>
        !currentData.inventory.some((loc) => loc.id === l.id) &&
        l.name.toLowerCase().includes(variantLocationSearch.toLowerCase())
    );
  }, [currentData?.inventory, variantLocationSearch]);

  const addVariantLocation = (locId: string, locName: string) => {
    if (currentData.inventory.some((l) => l.id === locId)) return;
    const newLoc: InventoryLocation = {
      id: locId,
      name: locName,
      unavailableCategories: createDefaultUnavailableCategories(),
      committed: 0,
      available: 0,
      total: 0,
    };
    updateCurrentData({ inventory: [...currentData.inventory, newLoc] });
    setVariantAddLocationOpen(false);
    setVariantLocationSearch("");
  };

  const deleteVariantLocation = (locId: string) => {
    updateCurrentData({ inventory: currentData.inventory.filter((l) => l.id !== locId) });
  };

  // Discount & Margin calculations
  const sellingPriceNum = parseFloat(currentData.pricing.sellingPrice?.replace(/,/g, "") || "") || 0;
  const actualPriceNum = parseFloat(currentData.pricing.actualPrice?.replace(/,/g, "") || "") || 0;
  const costEntry = currentData.pricing.additionalPrices.find((p: any) => p.type === "avgCost");
  const costPriceNum = costEntry ? (parseFloat(costEntry.value?.replace(/,/g, "") || "") || 0) : 0;
  const hasCostPrice = costEntry && costPriceNum > 0;

  const discountAmount = actualPriceNum - sellingPriceNum;
  const discountPercent = actualPriceNum > 0 ? ((discountAmount / actualPriceNum) * 100) : 0;
  const showDiscount = sellingPriceNum > 0 && actualPriceNum > 0 && actualPriceNum > sellingPriceNum;

  const marginAmount = sellingPriceNum - costPriceNum;
  const marginPercent = costPriceNum > 0 ? ((marginAmount / costPriceNum) * 100) : 0;
  const showMargin = hasCostPrice && sellingPriceNum > 0;

  const transferEntry = currentData.pricing.additionalPrices.find((p: any) => p.type === "transfer");
  const transferPriceNum = transferEntry ? (parseFloat(transferEntry.value?.replace(/,/g, "") || "") || 0) : 0;
  const hasTransferPrice = transferEntry && transferPriceNum > 0;
  const transferMarginAmount = transferPriceNum - costPriceNum;
  const transferMarginPercent = costPriceNum > 0 ? ((transferMarginAmount / costPriceNum) * 100) : 0;
  const showTransferMargin = hasCostPrice && hasTransferPrice;

  const formatCurrencyNum = (num: number) => num.toLocaleString('en-IN');

  const filledAdditionalPrices = currentData.pricing.additionalPrices.filter((p: any) => p.value?.trim());
  const showAdditionalSection = currentData.pricing.additionalPrices.length > 0;

  const handleSave = () => {
    if (!product) return;
    const updatedVariants = {
      ...variantsData,
      variantDetailData: localVariantData,
    };
    updateProduct(product.id, { variants: updatedVariants });
    setIsDirty(false);
    navigate("/");
  };

  const handleNavigateToProduct = () => {
    const path = `/edit/${productId}`;
    if (isDirty) {
      setPendingNavPath(path);
      setShowUnsavedWarning(true);
    } else {
      navigate(path);
    }
  };

  const confirmLeave = () => {
    setShowUnsavedWarning(false);
    if (pendingNavPath) navigate(pendingNavPath);
  };

  const handleSelectVariant = (id: string) => {
    setSelectedId(id);
    if (isMobile) setSidebarOpen(false);
  };

  if (!product) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Product not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            Go back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Sidebar content (shared between desktop inline and mobile sheet)
  const sidebarContent = (
    <>
      {/* Product Info */}
      {product && (
        <div className="p-3 border-b border-border flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleNavigateToProduct}>
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-md object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] text-muted-foreground">IMG</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{product.name}</p>
            {product.sku && (
              <p className="text-xs text-muted-foreground truncate">{product.sku}</p>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search variants"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              aria-label="Search variants"
            />
          </div>
          <DropdownMenu open={filterDropdownOpen} onOpenChange={setFilterDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className={cn("h-9 w-9", statusFilter !== "all" && "border-primary text-primary")} aria-label="Filter variants">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setStatusFilter("all"); setFilterDropdownOpen(false); }} className={cn(statusFilter === "all" && "bg-primary/10")}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("Active"); setFilterDropdownOpen(false); }} className={cn(statusFilter === "Active" && "bg-primary/10")}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("InActive"); setFilterDropdownOpen(false); }} className={cn(statusFilter === "InActive" && "bg-primary/10")}>
                Inactive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Variants List */}
      <nav className="flex-1 overflow-y-auto" aria-label="Variant list">
        {filteredCombinations.map((combo) => (
          <button
            key={combo.id}
            type="button"
            onClick={() => handleSelectVariant(combo.id)}
            aria-current={selectedId === combo.id ? "true" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
              selectedId === combo.id
                ? "bg-primary/10 text-primary border-l-2 border-primary"
                : "hover:bg-muted"
            )}
          >
            {combo.image ? (
              <img src={combo.image} alt="" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center" aria-hidden="true">
                <span className="text-[10px] text-muted-foreground">IMG</span>
              </div>
            )}
            <span className="text-sm font-medium truncate flex-1">{combo.label}</span>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
              (localVariantData[combo.id]?.status ?? "Active") === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            )}>
              {(localVariantData[combo.id]?.status ?? "Active") === "Active" ? "Active" : "Inactive"}
            </span>
          </button>
        ))}
      </nav>

      {/* Add Variant Value */}
      <div className="border-t border-border">
        {addingVariantValue ? (
          <div className="p-3 space-y-2">
            <Select value={newVariantGroupId} onValueChange={setNewVariantGroupId}>
              <SelectTrigger className="h-9" aria-label="Select variant type">
                <SelectValue placeholder="Select variant type" />
              </SelectTrigger>
              <SelectContent>
                {(variantsData?.savedVariants || []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Enter value (e.g. XL, Green)"
              value={newVariantLabel}
              onChange={(e) => setNewVariantLabel(e.target.value)}
              className="h-9"
              aria-label="New variant value"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={!newVariantGroupId || !newVariantLabel.trim()}
                onClick={() => {
                  if (!product || !newVariantGroupId || !newVariantLabel.trim()) return;
                  const savedVariants = [...(variantsData?.savedVariants || [])];
                  const groupIdx = savedVariants.findIndex((v) => v.id === newVariantGroupId);
                  if (groupIdx === -1) return;
                  const newValId = `val-${newVariantLabel.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
                  savedVariants[groupIdx] = {
                    ...savedVariants[groupIdx],
                    values: [...savedVariants[groupIdx].values, { id: newValId, label: newVariantLabel.trim() }],
                  };
                  updateProduct(product.id, { variants: { ...variantsData, savedVariants } });
                  setNewVariantLabel("");
                  setNewVariantGroupId("");
                  setAddingVariantValue(false);
                }}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAddingVariantValue(false); setNewVariantGroupId(""); setNewVariantLabel(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-muted/50 transition-colors"
            onClick={() => setAddingVariantValue(true)}
            aria-label="Add variant value"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Variant Value
          </button>
        )}
      </div>
    </>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-57px)]">
        {/* Header */}
        <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/?tab=size-variants')} aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          {isMobile && (
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSidebarOpen(true)} aria-label="Open variant list">
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1">{selectedCombination?.label || "Variant Details"}</h1>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className="w-72 border-r border-border flex flex-col bg-muted/30" aria-label="Variants sidebar">
              {sidebarContent}
            </aside>
          )}

          {/* Mobile Sidebar Sheet */}
          {isMobile && (
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="bottom" className="p-0 max-h-[70vh] flex flex-col rounded-t-2xl">
                <SheetHeader className="sr-only">
                  <SheetTitle>Variants</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
          )}

          {/* Right Content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6" role="main">
            {/* Mobile: current variant selector chip */}
            {isMobile && selectedCombination && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium w-full"
                aria-label="Switch variant"
              >
                {selectedCombination.image ? (
                  <img src={selectedCombination.image} alt="" className="w-6 h-6 rounded object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center" aria-hidden="true">
                    <span className="text-[8px] text-muted-foreground">IMG</span>
                  </div>
                )}
                <span className="truncate flex-1 text-left">{selectedCombination.label}</span>
                <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            )}

            {/* 1. Identification Details */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4" aria-labelledby="package-heading">
              <div className="flex items-center justify-between">
                <h2 id="package-heading" className="text-base font-semibold text-foreground">Identification Details</h2>
                <div className="flex items-center gap-3">
                  {/* Base UOM Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      Base UOM
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Unit in which this product is stocked, priced, and sold.</p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <Select value={product?.baseUom || "EA"} onValueChange={() => {}}>
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BASE_UOM_OPTIONS.map((uom) => (
                          <SelectItem key={uom.code} value={uom.code}>
                            {uom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    (currentData.status ?? "Active") === "Active" ? "text-green-700" : "text-red-600"
                  )}>
                    {(currentData.status ?? "Active") === "Active" ? "Active" : "Inactive"}
                  </span>
                  <Switch
                    checked={(currentData.status ?? "Active") === "Active"}
                    onCheckedChange={(checked) => updateCurrentData({ status: checked ? "Active" : "InActive" })}
                  />
                </div>
              </div>

              <fieldset>
                <legend className="form-label flex items-center gap-1">
                  Identifier
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Identifier help">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Unique product identifier like SKU, EAN, UPC etc.</p>
                    </TooltipContent>
                  </Tooltip>
                </legend>

                <div className="space-y-3">
                  {currentData.identifiers.map((identifier) => (
                    <div key={identifier.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {identifier.type === "custom" ? (
                        <Input
                          placeholder="Label"
                          value={currentData.customLabels[identifier.id] || ""}
                          onChange={(e) => updateCustomLabel(identifier.id, e.target.value)}
                          className="w-20 h-10"
                          aria-label="Custom identifier label"
                        />
                      ) : (
                        <Select
                          value={identifier.type}
                          onValueChange={(val) => updateIdentifier(identifier.id, "type", val)}
                        >
                          <SelectTrigger className="w-20 h-10" aria-label="Identifier type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IDENTIFIER_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        placeholder="Value"
                        value={identifier.value}
                        onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                        className="flex-1 min-w-0 h-10"
                        aria-label={`${identifier.type} value`}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label="Identifier actions">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!identifier.isPrimary && (
                            <DropdownMenuItem onClick={() => makePrimary(identifier.id)}>
                              Make Primary
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteIdentifier(identifier.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {identifier.isPrimary && (
                        <span className="text-xs font-medium text-primary border border-primary/30 rounded-md px-2 py-1 whitespace-nowrap">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addIdentifier}
                  className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline"
                  aria-label="Add another identifier"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add Identifier
                </button>
              </fieldset>
            </section>

            {/* 2. Pricing Section */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4" aria-labelledby="pricing-heading">
              <div className="flex items-center gap-2">
                <h2 id="pricing-heading" className="text-base font-semibold text-foreground">Pricing</h2>
                {product?.baseUom && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (per {BASE_UOM_OPTIONS.find(u => u.code === product.baseUom)?.name ?? product.baseUom})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label flex items-center gap-1" htmlFor="selling-price">
                    Selling Price<span className="text-destructive" aria-hidden="true">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Selling price help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>The price at which product is sold</p></TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="flex items-center">
                    <Select value={currentData.pricing.sellingCurrency} onValueChange={(val) => updatePricing("sellingCurrency", val)}>
                      <SelectTrigger className="w-16 sm:w-20 h-10 rounded-r-none border-r-0" aria-label="Selling price currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inr">INR</SelectItem>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="eur">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="selling-price"
                      placeholder="0"
                      value={currentData.pricing.sellingPrice}
                      onChange={(e) => updatePricing("sellingPrice", e.target.value)}
                      className="flex-1 h-10 rounded-l-none"
                      aria-required="true"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label flex items-center gap-1" htmlFor="actual-price">
                    Full Price<span className="text-destructive" aria-hidden="true">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" aria-label="Full price help">
                          <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>MRP or maximum retail price</p></TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="flex items-center">
                    <Select value={currentData.pricing.actualCurrency} onValueChange={(val) => updatePricing("actualCurrency", val)}>
                      <SelectTrigger className="w-16 sm:w-20 h-10 rounded-r-none border-r-0" aria-label="Actual price currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inr">INR</SelectItem>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="eur">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="actual-price"
                      placeholder="0"
                      value={currentData.pricing.actualPrice}
                      onChange={(e) => updatePricing("actualPrice", e.target.value)}
                      className="flex-1 h-10 rounded-l-none"
                      aria-required="true"
                    />
                  </div>
                </div>
              </div>

              {/* Discount & Margin badges */}
              {(showDiscount || showMargin) && (
                <div className="flex flex-wrap gap-2">
                  {showDiscount && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                      Discount: -₹{formatCurrencyNum(Math.abs(discountAmount))} (-{discountPercent.toFixed(1)}%)
                    </span>
                  )}
                  {showMargin && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                      marginAmount >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                    )}>
                      Margin: {marginAmount >= 0 ? "₹" : "-₹"}{formatCurrencyNum(Math.abs(marginAmount))} ({marginAmount >= 0 ? "+" : ""}{marginPercent.toFixed(1)}%)
                    </span>
                  )}
                </div>
              )}

              {/* Collapsible Additional Price Fields */}
              {showAdditionalSection ? (
                <div className="-mx-5 px-5 border-t border-border mt-2 pt-4">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => setAdditionalPricingOpen(!additionalPricingOpen)}
                  >
                    <h3 className="text-sm font-semibold text-foreground">Additional Pricing Details</h3>
                    <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", additionalPricingOpen && "rotate-180")} />
                  </button>
                  {additionalPricingOpen && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentData.pricing.additionalPrices.map((price) => (
                          <div key={price.type}>
                            <label className="form-label" htmlFor={`addl-price-${price.type}`}>{price.label}</label>
                            <div className="flex items-center">
                              <Select value={price.currency} onValueChange={() => {}}>
                                <SelectTrigger className="w-16 sm:w-20 h-10 rounded-r-none border-r-0" aria-label={`${price.label} currency`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="inr">INR</SelectItem>
                                  <SelectItem value="usd">USD</SelectItem>
                                  <SelectItem value="eur">EUR</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                id={`addl-price-${price.type}`}
                                placeholder="0"
                                value={price.value}
                                onChange={(e) => updateAdditionalPrice(price.type, e.target.value)}
                                className="flex-1 h-10 rounded-l-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Transfer Margin badge */}
                      {showTransferMargin && (
                        <div className="flex flex-wrap gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                            transferMarginAmount >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          )}>
                            Transfer Margin: {transferMarginAmount >= 0 ? "₹" : "-₹"}{formatCurrencyNum(Math.abs(transferMarginAmount))} ({transferMarginAmount >= 0 ? "+" : ""}{transferMarginPercent.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                      {/* Add buttons inside the expanded section */}
                      {availableAdditionalPrices.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {availableAdditionalPrices.map((opt) => (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() => { addAdditionalPrice(opt.type, opt.label); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                              aria-label={`Add ${opt.label}`}
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Filled value chips + add buttons when collapsed */}
                  {!additionalPricingOpen && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {filledAdditionalPrices.map((price) => (
                        <span key={price.type} className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-foreground bg-muted rounded-full">
                          {price.label}: {price.currency.toUpperCase()} {price.value}
                        </span>
                      ))}
                      {availableAdditionalPrices.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => { addAdditionalPrice(opt.type, opt.label); setAdditionalPricingOpen(true); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                          aria-label={`Add ${opt.label}`}
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* No additional prices yet — show add pills */
                <div className="flex flex-wrap gap-2 pt-2">
                  {ADDITIONAL_PRICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => { addAdditionalPrice(opt.type, opt.label); setAdditionalPricingOpen(true); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                      aria-label={`Add ${opt.label}`}
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </section>



            {/* 3. Shipment Details Section */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-5" aria-labelledby="shipment-heading">
              <button
                type="button"
                className="flex items-center justify-between w-full"
                onClick={() => setShipmentExpanded(!shipmentExpanded)}
              >
                <h2 id="shipment-heading" className="text-base font-semibold text-foreground">Shipment Details</h2>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", shipmentExpanded && "rotate-180")} />
              </button>

              {!shipmentExpanded ? (
                /* Collapsed summary */
                <div className="space-y-3">
                  {/* Primary shipment */}
                  <div>
                    {(currentData.additionalShipments?.length ?? 0) > 0 && (
                      <p className="text-xs font-medium text-foreground mb-1.5">Shipment 1</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Dimensions</span>
                        <span className="text-sm font-medium">{currentData.shipment.length || "—"} × {currentData.shipment.width || "—"} × {currentData.shipment.height || "—"} {currentData.shipment.units}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                        <span className="text-sm font-medium">{currentData.shipment.weight || "—"} {currentData.shipment.weightUnit}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Handling</span>
                        <span className="text-sm font-medium">{currentData.handling?.handlingClass || "Standard"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Storage</span>
                        <span className="text-sm font-medium">{currentData.handling?.storageCondition || "Dry"}</span>
                      </div>
                    </div>
                  </div>
                  {/* Additional shipments */}
                  {(currentData.additionalShipments || []).map((shipment, idx) => {
                    const sL = parseFloat(shipment.length) || 0;
                    const sW = parseFloat(shipment.width) || 0;
                    const sH = parseFloat(shipment.height) || 0;
                    const sWeight = parseFloat(shipment.weight) || 0;
                    return (
                      <div key={shipment.id}>
                        <p className="text-xs font-medium text-foreground mb-1.5">{shipment.name || `Shipment ${idx + 2}`}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Dimensions</span>
                            <span className="text-sm font-medium">{sL || "—"} × {sW || "—"} × {sH || "—"} {shipment.units}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                            <span className="text-sm font-medium">{sWeight || "—"} {shipment.weightUnit}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Handling</span>
                            <span className="text-sm font-medium">Standard</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Storage</span>
                            <span className="text-sm font-medium">Dry</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <label className="form-label" htmlFor="ship-length">Length<span className="text-destructive" aria-hidden="true">*</span></label>
                  <Input
                    id="ship-length"
                    value={currentData.shipment.length}
                    onChange={(e) => updateShipment("length", e.target.value)}
                    className="h-10"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ship-width">Width<span className="text-destructive" aria-hidden="true">*</span></label>
                  <Input
                    id="ship-width"
                    value={currentData.shipment.width}
                    onChange={(e) => updateShipment("width", e.target.value)}
                    className="h-10"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="ship-height">Height<span className="text-destructive" aria-hidden="true">*</span></label>
                  <Input
                    id="ship-height"
                    value={currentData.shipment.height}
                    onChange={(e) => updateShipment("height", e.target.value)}
                    className="h-10"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="form-label" id="ship-units-label">Units</label>
                  <Select value={currentData.shipment.units} onValueChange={(val) => updateShipment("units", val)}>
                    <SelectTrigger className="h-10" aria-labelledby="ship-units-label"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">CM</SelectItem>
                      <SelectItem value="in">IN</SelectItem>
                      <SelectItem value="mm">MM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <label className="form-label flex items-center gap-1" htmlFor="product-weight">
                  Product Weight<span className="text-destructive" aria-hidden="true">*</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="Product weight help">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Actual weight including brand packaging.</p></TooltipContent>
                  </Tooltip>
                </label>
                <div className="flex items-center">
                  <Input
                    id="product-weight"
                    placeholder="0"
                    value={currentData.shipment.weight}
                    onChange={(e) => updateShipment("weight", e.target.value)}
                    className="flex-1 h-10 rounded-r-none"
                    aria-required="true"
                  />
                  <Select value={currentData.shipment.weightUnit} onValueChange={(val) => updateShipment("weightUnit", val)}>
                    <SelectTrigger className="w-20 sm:w-24 h-10 rounded-l-none border-l-0" aria-label="Weight unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grams">grams</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="lbs">lbs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showWeightCalculations && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Volumetric Weight:</span>
                    <span className="text-sm font-medium">{volumetricWeight.toFixed(2)} {currentData.shipment.weightUnit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Applicable Weight:</span>
                    <span className="text-sm font-medium text-primary">{applicableWeight.toFixed(2)} {currentData.shipment.weightUnit}</span>
                  </div>
                </div>
              )}

              {/* Additional Shipments */}
              {(currentData.additionalShipments || []).map((shipment) => {
                const sL = parseFloat(shipment.length) || 0;
                const sW = parseFloat(shipment.width) || 0;
                const sH = parseFloat(shipment.height) || 0;
                const sDeadWeight = parseFloat(shipment.weight) || 0;
                const sVolWeight = sL && sW && sH ? (sL * sW * sH) / 5 : 0;
                const sAppWeight = Math.max(sDeadWeight, sVolWeight);
                const sShowCalcs = sL > 0 && sW > 0 && sH > 0;
                const updateAddlShipment = (field: keyof ShipmentEntry, value: string) => {
                  const updated = (currentData.additionalShipments || []).map((s) =>
                    s.id === shipment.id ? { ...s, [field]: value } : s
                  );
                  updateCurrentData({ additionalShipments: updated });
                };
                return (
                  <div key={shipment.id} className="mt-4 p-4 border border-border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      {editingShipmentName === shipment.id ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editingShipmentNameValue}
                            onChange={(e) => setEditingShipmentNameValue(e.target.value)}
                            className="h-8 w-40 text-sm"
                            autoFocus
                          />
                          <button type="button" onClick={() => { updateAddlShipment("name", editingShipmentNameValue); setEditingShipmentName(null); }} className="p-1 hover:bg-muted rounded-md text-primary"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setEditingShipmentName(null)} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{shipment.name}</span>
                          <button type="button" onClick={() => { setEditingShipmentName(shipment.id); setEditingShipmentNameValue(shipment.name); }} className="p-1 hover:bg-muted rounded-md text-muted-foreground"><Pencil className="w-3 h-3" /></button>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateCurrentData({ additionalShipments: (currentData.additionalShipments || []).filter((s) => s.id !== shipment.id) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><label className="form-label">Length</label><Input value={shipment.length} onChange={(e) => updateAddlShipment("length", e.target.value)} className="h-10" /></div>
                      <div><label className="form-label">Width</label><Input value={shipment.width} onChange={(e) => updateAddlShipment("width", e.target.value)} className="h-10" /></div>
                      <div><label className="form-label">Height</label><Input value={shipment.height} onChange={(e) => updateAddlShipment("height", e.target.value)} className="h-10" /></div>
                      <div><label className="form-label">Units</label>
                        <Select value={shipment.units} onValueChange={(val) => updateAddlShipment("units", val)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="cm">CM</SelectItem><SelectItem value="in">IN</SelectItem><SelectItem value="mm">MM</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Weight</label>
                      <div className="flex items-center">
                        <Input value={shipment.weight} onChange={(e) => updateAddlShipment("weight", e.target.value)} className="flex-1 h-10 rounded-r-none" />
                        <Select value={shipment.weightUnit} onValueChange={(val) => updateAddlShipment("weightUnit", val)}>
                          <SelectTrigger className="w-20 sm:w-24 h-10 rounded-l-none border-l-0"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="grams">grams</SelectItem><SelectItem value="kg">kg</SelectItem><SelectItem value="lbs">lbs</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    {sShowCalcs && (
                      <div className="flex items-center gap-6 pt-2 border-t border-border">
                        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Volumetric:</span><span className="text-sm font-medium">{sVolWeight.toFixed(2)} {shipment.weightUnit}</span></div>
                        <div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Applicable:</span><span className="text-sm font-medium text-primary">{sAppWeight.toFixed(2)} {shipment.weightUnit}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline"
                onClick={() => {
                  const existing = currentData.additionalShipments || [];
                  if (existing.length >= 4) return;
                  updateCurrentData({
                    additionalShipments: [
                      ...existing,
                      { id: Date.now().toString(), name: `Shipment ${existing.length + 2}`, length: "", width: "", height: "", units: "cm", weight: "", weightUnit: "grams" },
                    ],
                  });
                }}
              >
                <Plus className="w-4 h-4" />
                Add Shipment
              </button>

              {/* Handling Subsection */}
              <Separator />
              <fieldset>
                <legend className="text-sm font-semibold text-foreground mb-4">Handling</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Handling Class</label>
                    <Select
                      value={currentData.handling?.handlingClass || "Standard"}
                      onValueChange={(val) => updateCurrentData({
                        handling: {
                          handlingClass: val,
                          storageCondition: currentData.handling?.storageCondition || "Dry",
                        },
                      })}
                    >
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Fragile">Fragile</SelectItem>
                        <SelectItem value="Hazardous">Hazardous</SelectItem>
                        <SelectItem value="Perishable">Perishable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="form-label">Storage Condition</label>
                    <Select
                      value={currentData.handling?.storageCondition || "Dry"}
                      onValueChange={(val) => updateCurrentData({
                        handling: {
                          handlingClass: currentData.handling?.handlingClass || "Standard",
                          storageCondition: val,
                        },
                      })}
                    >
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dry">Dry</SelectItem>
                        <SelectItem value="Cool">Cool</SelectItem>
                        <SelectItem value="Frozen">Frozen</SelectItem>
                        <SelectItem value="Refrigerated">Refrigerated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>
              </>
              )}
            </section>

            {/* 4. Inventory Section */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4" aria-labelledby="inventory-heading">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 id="inventory-heading" className="text-base font-semibold text-foreground">Inventory</h2>
                  {product?.baseUom && (
                    <span className="text-xs text-muted-foreground font-normal">
                      (in {BASE_UOM_OPTIONS.find(u => u.code === product.baseUom)?.name ?? product.baseUom})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/inventory")}
                  className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-1.5"
                  aria-label="View inventory adjustment history"
                >
                  <History className="w-3.5 h-3.5" aria-hidden="true" />
                  View adjustment history
                </button>
              </div>

              {/* Search + Filter row */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search location..."
                    className="pl-9 h-9 text-sm"
                    value={variantInventorySearch}
                    onChange={(e) => setVariantInventorySearch(e.target.value)}
                  />
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="h-9 w-9 flex items-center justify-center border border-border rounded-md hover:bg-muted transition-colors" aria-label="Filter inventory">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3 space-y-3" align="end">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Sellable</label>
                      <Select value={variantSellableFilter} onValueChange={setVariantSellableFilter}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="inStock">In Stock</SelectItem>
                          <SelectItem value="outOfStock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">On Hand</label>
                      <Select value={variantOnHandFilter} onValueChange={setVariantOnHandFilter}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="inStock">In Stock</SelectItem>
                          <SelectItem value="outOfStock">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {currentData.inventory.length === 0 ? (
                <div className="border border-border rounded-lg py-10 px-4 text-center">
                  <p className="text-sm text-muted-foreground">No locations added yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add a location to start tracking inventory</p>
                </div>
              ) : (
                <>
                  {/* Desktop: Table layout */}
                  <div className="hidden sm:block border border-border rounded-lg overflow-x-auto">
                    <table className="w-full min-w-[500px]" role="table" aria-label="Inventory by location">
                      <thead className="bg-muted/50">
                        <tr className="border-b border-border">
                          <th scope="col" className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Locations</th>
                          <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Unavailable</th>
                          <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Committed</th>
                          <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Sellable</th>
                          <th scope="col" className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">On hand</th>
                          <th scope="col" className="w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVariantInventory.map((location) => (
                          <tr
                            key={location.id}
                            className="border-b border-border last:border-b-0 group"
                            onMouseEnter={() => setHoveredLocationId(location.id)}
                            onMouseLeave={() => setHoveredLocationId(null)}
                          >
                            <td className="px-4 py-3 text-sm font-medium">{location.name}</td>
                            <td className="px-4 py-3">
                              <InventoryManagementPopover
                                unavailableData={location.unavailableCategories}
                                sellable={location.available}
                                onUpdateInventory={(category, action, quantity) => {
                                  handleInventoryUpdate(location.id, category, action, quantity);
                                }}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input type="number" min="0" value={location.committed} readOnly className="h-9 w-full text-center bg-muted/50" aria-label={`${location.name} committed`} />
                            </td>
                            <td className="px-4 py-3">
                              <Input type="number" min="0" value={location.available} readOnly className="h-9 w-full text-center bg-muted/50" aria-label={`${location.name} sellable`} />
                            </td>
                            <td className="px-4 py-3">
                              <Input type="number" min="0" value={location.total} readOnly className="h-9 w-full text-center bg-muted/50" aria-label={`${location.name} on hand`} />
                            </td>
                            <td className="px-2 py-3">
                              {hoveredLocationId === location.id && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/inventory?location=${encodeURIComponent(location.name)}`)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                                    aria-label={`View ${location.name} in inventory`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteVariantLocation(location.id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    aria-label={`Remove ${location.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: Card layout */}
                  <div className="sm:hidden space-y-3" role="list" aria-label="Inventory by location">
                    {filteredVariantInventory.map((location) => (
                      <div key={location.id} role="listitem" className="border border-border rounded-lg p-3 space-y-3 relative group">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">{location.name}</h3>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/inventory?location=${encodeURIComponent(location.name)}`)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteVariantLocation(location.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Unavailable</span>
                            <InventoryManagementPopover
                              unavailableData={location.unavailableCategories}
                              sellable={location.available}
                              onUpdateInventory={(category, action, quantity) => {
                                handleInventoryUpdate(location.id, category, action, quantity);
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1" htmlFor={`mob-committed-${location.id}`}>Committed</label>
                            <Input id={`mob-committed-${location.id}`} type="number" min="0" value={location.committed} readOnly className="h-9 w-full text-center text-sm bg-muted/50" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">Sellable</span>
                            <Input type="number" min="0" value={location.available} readOnly className="h-9 w-full text-center bg-muted/50 text-sm" aria-label={`${location.name} sellable`} />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block mb-1">On hand</span>
                            <Input type="number" min="0" value={location.total} readOnly className="h-9 w-full text-center bg-muted/50 text-sm" aria-label={`${location.name} on hand`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Add Location dropdown */}
              <Popover open={variantAddLocationOpen} onOpenChange={setVariantAddLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary hover:text-primary/80"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Location
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search locations..."
                      value={variantLocationSearch}
                      onChange={(e) => setVariantLocationSearch(e.target.value)}
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {variantAvailableLocations.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No locations available</p>
                    ) : (
                      variantAvailableLocations.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => addVariantLocation(loc.id, loc.name)}
                          className="w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                        >
                          {loc.name}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </section>



            {/* 5. Inventory Control Section */}
            {(() => {
              const invCtrl = currentData.inventoryControl;
              const updateInvCtrl = (field: string, value: any) => {
                const newState = {
                  inventoryTracked: invCtrl?.inventoryTracked ?? true,
                  incomingQCRequired: invCtrl?.incomingQCRequired ?? false,
                  serialTrackingMode: invCtrl?.serialTrackingMode ?? "NONE",
                  serialAttributeCount: invCtrl?.serialAttributeCount ?? 1,
                  lotTrackingMode: invCtrl?.lotTrackingMode ?? "NONE",
                  rotationMethod: invCtrl?.rotationMethod ?? "FIFO",
                  shelfLifeRequired: invCtrl?.shelfLifeRequired ?? false,
                  shelfLifeDuration: invCtrl?.shelfLifeDuration ?? "",
                  shelfLifeUnit: invCtrl?.shelfLifeUnit ?? "Days",
                  manufacturingDateRequired: invCtrl?.manufacturingDateRequired ?? false,
                  expiryDateRequired: invCtrl?.expiryDateRequired ?? false,
                  minShelfLifeAtInbound: invCtrl?.minShelfLifeAtInbound ?? "",
                  minShelfLifeAtOutbound: invCtrl?.minShelfLifeAtOutbound ?? "",
                  dateRequirement: invCtrl?.dateRequirement ?? "NONE",
                  shelfLifeThresholdsEnabled: invCtrl?.shelfLifeThresholdsEnabled ?? false,
                  [field]: value,
                };

                // When Lot Tracking goes to NONE: reset everything
                if (field === "lotTrackingMode" && value === "NONE") {
                  newState.rotationMethod = "FIFO";
                  newState.dateRequirement = "NONE";
                  newState.expiryDateRequired = false;
                  newState.manufacturingDateRequired = false;
                  newState.shelfLifeRequired = false;
                  newState.shelfLifeThresholdsEnabled = false;
                  newState.shelfLifeDuration = "";
                  newState.shelfLifeUnit = "Days";
                  newState.minShelfLifeAtInbound = "";
                  newState.minShelfLifeAtOutbound = "";
                }

                // When Lot Tracking activated: default rotation FIFO, dateRequirement NONE
                if (field === "lotTrackingMode" && value !== "NONE") {
                  if (!newState.rotationMethod || newState.rotationMethod === "FIFO") {
                    newState.dateRequirement = "NONE";
                  }
                }

                // FEFO selected: force dateRequirement to EXPIRY_DATE default
                if (field === "rotationMethod" && value === "FEFO") {
                  if (!["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(newState.dateRequirement)) {
                    newState.dateRequirement = "EXPIRY_DATE";
                  }
                  newState.expiryDateRequired = true;
                  newState.manufacturingDateRequired = newState.dateRequirement === "EXPIRY_MFG_DATE";
                  if (newState.lotTrackingMode === "NONE") {
                    newState.lotTrackingMode = "INBOUND_ONLY";
                  }
                }

                // FMFO selected: force dateRequirement to MFG_DATE default
                if (field === "rotationMethod" && value === "FMFO") {
                  if (!["MFG_DATE", "EXPIRY_MFG_DATE"].includes(newState.dateRequirement)) {
                    newState.dateRequirement = "MFG_DATE";
                  }
                  newState.manufacturingDateRequired = true;
                  newState.expiryDateRequired = newState.dateRequirement === "EXPIRY_MFG_DATE";
                  if (newState.lotTrackingMode === "NONE") {
                    newState.lotTrackingMode = "INBOUND_ONLY";
                  }
                }

                // FIFO/LIFO selected: dateRequirement = NONE
                if (field === "rotationMethod" && (value === "FIFO" || value === "LIFO")) {
                  newState.dateRequirement = "NONE";
                  newState.expiryDateRequired = false;
                  newState.manufacturingDateRequired = false;
                  newState.shelfLifeRequired = false;
                  newState.shelfLifeThresholdsEnabled = false;
                  newState.shelfLifeDuration = "";
                  newState.shelfLifeUnit = "Days";
                }

                // Derive booleans from dateRequirement dropdown
                if (field === "dateRequirement") {
                  newState.expiryDateRequired = ["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(value);
                  newState.manufacturingDateRequired = ["MFG_DATE", "EXPIRY_MFG_DATE"].includes(value);
                  if (value === "NONE") {
                    newState.shelfLifeRequired = false;
                    newState.shelfLifeThresholdsEnabled = false;
                    newState.shelfLifeDuration = "";
                    newState.shelfLifeUnit = "Days";
                  }
                  // FEFO: prevent non-expiry options
                  if (newState.rotationMethod === "FEFO" && !["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(value)) {
                    newState.dateRequirement = "EXPIRY_DATE";
                    newState.expiryDateRequired = true;
                    newState.manufacturingDateRequired = false;
                  }
                  // FMFO: prevent non-mfg options
                  if (newState.rotationMethod === "FMFO" && !["MFG_DATE", "EXPIRY_MFG_DATE"].includes(value)) {
                    newState.dateRequirement = "MFG_DATE";
                    newState.manufacturingDateRequired = true;
                    newState.expiryDateRequired = false;
                  }
                }

                // Shelf life thresholds: clear values when disabled
                if (field === "shelfLifeThresholdsEnabled" && value === false) {
                  newState.minShelfLifeAtInbound = "";
                  newState.minShelfLifeAtOutbound = "";
                }

                updateCurrentData({ inventoryControl: newState });
              };

              const serialMode = invCtrl?.serialTrackingMode ?? "NONE";
              const lotMode = invCtrl?.lotTrackingMode ?? "NONE";
              const serialLabel = { NONE: "None", PER_UNIT: "Per Unit" }[serialMode] || serialMode;
              const lotLabel = { NONE: "None", INBOUND_ONLY: "Inbound Only", END_TO_END: "End to End" }[lotMode] || lotMode;
              const invTracked = invCtrl?.inventoryTracked !== false;
              const qcRequired = invCtrl?.incomingQCRequired ?? false;
              const rotationMethod = invCtrl?.rotationMethod ?? "FIFO";

              return (
                <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-5" aria-labelledby="inv-control-heading">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full"
                    onClick={() => setInvControlExpanded(!invControlExpanded)}
                  >
                    <h2 id="inv-control-heading" className="text-base font-semibold text-foreground">Inventory Control</h2>
                    <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", invControlExpanded && "rotate-180")} />
                  </button>

                  {!invControlExpanded ? (
                    /* Collapsed summary */
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Inventory Tracked</span>
                        <span className="text-sm font-medium">{invTracked ? "Yes" : "No"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Incoming QC Required</span>
                        <span className="text-sm font-medium">{qcRequired ? "Yes" : "No"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Serial Tracking</span>
                        <span className="text-sm font-medium">{serialLabel}</span>
                      </div>
                      {serialMode === "PER_UNIT" && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Serial Attribute Count</span>
                          <span className="text-sm font-medium">{invCtrl?.serialAttributeCount ?? 1}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Lot Tracking</span>
                        <span className="text-sm font-medium">{lotLabel}</span>
                      </div>
                      {lotMode !== "NONE" && (
                        <div>
                          <span className="text-xs text-muted-foreground block mb-1">Rotation Method</span>
                          <span className="text-sm font-medium">{rotationMethod}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Expanded form */
                    <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        Inventory Tracked
                        <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[240px]">Enable if this product's stock quantity should be tracked across locations.</TooltipContent></Tooltip>
                      </label>
                      <Switch
                        checked={invCtrl?.inventoryTracked !== false}
                        onCheckedChange={(checked) => updateInvCtrl("inventoryTracked", checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-foreground">Incoming QC Required</label>
                      <Switch
                        checked={invCtrl?.incomingQCRequired ?? false}
                        onCheckedChange={(checked) => updateInvCtrl("incomingQCRequired", checked)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Serial & Batch Control */}
                  <fieldset>
                    <legend className="text-sm font-semibold text-foreground mb-4">Serial & Batch Control</legend>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label flex items-center gap-1.5">Serial Tracking Mode <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[260px]">Select how serial numbers are captured for this product during sale or dispatch.</TooltipContent></Tooltip></label>
                          <Select
                            value={invCtrl?.serialTrackingMode ?? "NONE"}
                            onValueChange={(val) => updateInvCtrl("serialTrackingMode", val)}
                          >
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE" description="No serial tracking required">None</SelectItem>
                              <SelectItem value="PER_UNIT" description="Each unit must have a unique serial number">Per Unit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {(invCtrl?.serialTrackingMode === "PER_UNIT") && (
                          <div>
                            <label className="form-label flex items-center gap-1.5">Serial Attribute Count <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]">Number of serial numbers required per unit (e.g., IMEI + secondary code).</TooltipContent></Tooltip></label>
                            <Input
                              type="number"
                              min="1"
                              value={invCtrl?.serialAttributeCount ?? 1}
                              onChange={(e) => updateInvCtrl("serialAttributeCount", Math.max(1, parseInt(e.target.value) || 1))}
                              className="h-10"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="form-label flex items-center gap-1.5">Lot Tracking Mode <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]">Controls how batch or lot numbers are recorded and validated.</TooltipContent></Tooltip></label>
                        <Select
                          value={invCtrl?.lotTrackingMode ?? "NONE"}
                          onValueChange={(val) => updateInvCtrl("lotTrackingMode", val)}
                        >
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE" description="No batch tracking">None</SelectItem>
                            <SelectItem value="INBOUND_ONLY" description="Batch captured at receipt only">Inbound Only</SelectItem>
                            <SelectItem value="END_TO_END" description="Batch tracked from receipt to final sale">End to End</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </fieldset>

                  {/* Conditional fields when Lot Tracking != NONE */}
                  {((invCtrl?.lotTrackingMode ?? "NONE") !== "NONE") && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div>
                          <label className="form-label flex items-center gap-1.5">Rotation Method <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[240px]">Defines how stock is selected for dispatch.</TooltipContent></Tooltip></label>
                          <Select value={invCtrl?.rotationMethod ?? "FIFO"} onValueChange={(val) => updateInvCtrl("rotationMethod", val)}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FIFO" description="Oldest stock first">FIFO</SelectItem>
                              <SelectItem value="LIFO" description="Most recently received stock first">LIFO</SelectItem>
                              <SelectItem value="FEFO" description="Earliest expiry first">FEFO</SelectItem>
                              <SelectItem value="FMFO" description="Earliest manufactured stock first">FMFO</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date Requirements - only for FEFO/FMFO */}
                        {(invCtrl?.rotationMethod === "FEFO" || invCtrl?.rotationMethod === "FMFO") && (
                          <div>
                            <label className="form-label flex items-center gap-1.5">Date Requirements <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[260px]">Choose which dates must be captured for this product's batches.</TooltipContent></Tooltip></label>
                            <Select value={invCtrl?.dateRequirement ?? "NONE"} onValueChange={(val) => updateInvCtrl("dateRequirement", val)}>
                              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {invCtrl?.rotationMethod === "FEFO" ? (
                                  <>
                                    <SelectItem value="EXPIRY_DATE">Expiry Date</SelectItem>
                                    <SelectItem value="EXPIRY_MFG_DATE">Expiry Date & Manufacturing Date</SelectItem>
                                  </>
                                ) : (
                                  <>
                                    <SelectItem value="MFG_DATE">Manufacturing Date</SelectItem>
                                    <SelectItem value="EXPIRY_MFG_DATE">Expiry Date & Manufacturing Date</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Shelf Life - shown when rotation is FEFO or FMFO */}
                        {(invCtrl?.rotationMethod === "FEFO" || invCtrl?.rotationMethod === "FMFO") && (
                          <div className="space-y-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 sm:border-primary/20">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">Shelf Life Thresholds <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]">Enable to enforce minimum remaining shelf life rules during receipt and dispatch.</TooltipContent></Tooltip></label>
                              <Switch checked={invCtrl?.shelfLifeThresholdsEnabled ?? false} onCheckedChange={(checked) => updateInvCtrl("shelfLifeThresholdsEnabled", checked)} />
                            </div>

                            {(invCtrl?.shelfLifeThresholdsEnabled) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="form-label flex items-center gap-1.5">Min Shelf Life at Inbound<span className="text-destructive">*</span> <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]">Minimum remaining shelf life required when stock is received. Items expiring sooner will be rejected at receipt.</TooltipContent></Tooltip></label>
                                  <Input type="number" min="1" value={invCtrl?.minShelfLifeAtInbound ?? ""} onChange={(e) => updateInvCtrl("minShelfLifeAtInbound", e.target.value)} placeholder="0" className={cn("h-10", (!invCtrl?.minShelfLifeAtInbound || parseFloat(invCtrl.minShelfLifeAtInbound) <= 0) && "border-destructive")} />
                                  {(!invCtrl?.minShelfLifeAtInbound || parseFloat(invCtrl.minShelfLifeAtInbound) <= 0) && (
                                    <p className="text-xs text-destructive mt-1">Must be greater than 0</p>
                                  )}
                                </div>
                                <div>
                                  <label className="form-label flex items-center gap-1.5">Min Shelf Life at Outbound<span className="text-destructive">*</span> <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[280px]">Minimum remaining shelf life required when stock is dispatched. Prevents shipping near-expiry stock.</TooltipContent></Tooltip></label>
                                  <Input type="number" min="1" value={invCtrl?.minShelfLifeAtOutbound ?? ""} onChange={(e) => updateInvCtrl("minShelfLifeAtOutbound", e.target.value)} placeholder="0" className={cn("h-10", (!invCtrl?.minShelfLifeAtOutbound || parseFloat(invCtrl.minShelfLifeAtOutbound) <= 0) && "border-destructive")} />
                                  {(!invCtrl?.minShelfLifeAtOutbound || parseFloat(invCtrl.minShelfLifeAtOutbound) <= 0) && (
                                    <p className="text-xs text-destructive mt-1">Must be greater than 0</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {(() => {
                              const shelfMandatory = !!(invCtrl?.shelfLifeThresholdsEnabled && invCtrl?.dateRequirement === "MFG_DATE");
                              return (
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label flex items-center gap-1.5">Shelf Life Duration{shelfMandatory && <span className="text-destructive">*</span>} <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[260px]">Total valid shelf life of the product from manufacturing date.</TooltipContent></Tooltip></label>
                                    <Input type="number" min="1" value={invCtrl?.shelfLifeDuration ?? ""} onChange={(e) => updateInvCtrl("shelfLifeDuration", e.target.value)} placeholder="0" className={cn("h-10", shelfMandatory && (!invCtrl?.shelfLifeDuration || parseFloat(invCtrl.shelfLifeDuration) <= 0) && "border-destructive")} />
                                    {shelfMandatory && (!invCtrl?.shelfLifeDuration || parseFloat(invCtrl.shelfLifeDuration) <= 0) && (
                                      <p className="text-xs text-destructive mt-1">Duration must be greater than 0</p>
                                    )}
                                  </div>
                                  <div>
                                    <label className="form-label flex items-center gap-1.5">Shelf Life Unit{shelfMandatory && <span className="text-destructive">*</span>} <Tooltip><TooltipTrigger asChild><HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent side="top" className="max-w-[240px]">Unit used to calculate shelf life duration.</TooltipContent></Tooltip></label>
                                    <Select value={invCtrl?.shelfLifeUnit ?? "Days"} onValueChange={(val) => updateInvCtrl("shelfLifeUnit", val)}>
                                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Minutes">Minutes</SelectItem>
                                        <SelectItem value="Hours">Hours</SelectItem>
                                        <SelectItem value="Days">Days</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                    </>
                  )}
                </section>
              );
            })()}

            {/* 6. Customs Information (Country of Origin only) */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4" aria-labelledby="customs-heading">
              <h2 id="customs-heading" className="text-base font-semibold text-foreground">Customs Information</h2>
              <div>
                <label className="form-label">Country of Origin</label>
                <Select
                  value={currentData.customsTax?.countryOfOrigin || "india"}
                  onValueChange={(val) => updateCurrentData({ customsTax: { ...(currentData.customsTax || { countryOfOrigin: "india", hsnCode: "", taxRule: "" }), countryOfOrigin: val } })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="india">India</SelectItem>
                    <SelectItem value="usa">United States</SelectItem>
                    <SelectItem value="china">China</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="germany">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* 7. Custom Data Section */}
            <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4" aria-labelledby="custom-data-heading">
              <h2 id="custom-data-heading" className="text-base font-semibold text-foreground">Custom Data</h2>
              {(() => {
                const productCustomData = (product.customData || []) as VariantCustomDataEntry[];
                const variantCustomData = currentData.customData || productCustomData.map(k => ({ id: k.id, key: k.key, value: "" }));
                if (variantCustomData.length === 0) {
                  return (
                    <div className="border border-dashed border-border rounded-lg flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground">No custom data available for this variant</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    {variantCustomData.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 py-3 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="w-full sm:w-40 flex-shrink-0">
                          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {entry.key}
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
                          </span>
                        </div>
                        <div className="flex-1 w-full">
                          <Input
                            value={entry.value}
                            onChange={(e) => {
                              const updatedCustomData = variantCustomData.map(cd =>
                                cd.id === entry.id ? { ...cd, value: e.target.value } : cd
                              );
                              updateCurrentData({ customData: updatedCustomData });
                            }}
                            placeholder={`Enter ${entry.key}`}
                            className="h-9"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </section>
          </main>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 border-t border-border bg-card">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </footer>
      </div>

      {/* Unsaved Changes Warning */}
      <Dialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <DialogContent className="max-w-sm">
          <div className="flex items-start gap-3 pb-2">
            <div className="w-9 h-9 rounded-full bg-[hsl(var(--destructive)/0.1)] flex items-center justify-center shrink-0 mt-0.5">
              <HelpCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Unsaved Changes</h3>
              <p className="text-sm text-muted-foreground mt-1">You have unsaved changes. Are you sure you want to leave? Your changes will be lost.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowUnsavedWarning(false)}>Stay</Button>
            <Button variant="destructive" size="sm" onClick={confirmLeave}>Leave</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default VariantDetailPage;
