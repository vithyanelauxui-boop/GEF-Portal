import { useState, useMemo, useEffect } from "react";
import { BASE_UOM_OPTIONS } from "@/contexts/ProductsContext";
import { Search, Filter, Plus, MoreVertical, HelpCircle, Trash2, Star, Pencil, Check, X, History, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import overrideIcon from "@/assets/override-icon.svg";
import { InventoryManagementPopover, UnavailableCategories } from "./InventoryManagementPopover";
import { useNavigate } from "react-router-dom";

interface VariantCombination {
  id: string;
  label: string;
  image?: string;
  values: string[];
}

interface Identifier {
  id: string;
  type: string;
  value: string;
  isPrimary: boolean;
}

export interface InventoryLocation {
  id: string;
  name: string;
  locationCode?: string;
  unavailableCategories: UnavailableCategories;
  committed: number;
  available: number;
  total: number;
  locSellingPrice?: string;
  locCompareAt?: string;
  locCostPrice?: string;
  locWholesalePrice?: string;
  locTransferPrice?: string;
}

export interface VariantCustomDataEntry {
  id: string;
  key: string;
  value: string;
}

export interface ShipmentEntry {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  units: string;
  weight: string;
  weightUnit: string;
}

export interface VariantDetailData {
  identifiers: Identifier[];
  customLabels: Record<string, string>;
  plpName?: string;
  status?: "Active" | "InActive";
  inventoryTracked?: boolean;
  shipment: {
    length: string;
    width: string;
    height: string;
    units: string;
    weight: string;
    weightUnit: string;
  };
  additionalShipments?: ShipmentEntry[];
  handling?: {
    handlingClass: string;
    storageCondition: string;
  };
  inventoryControl?: {
    inventoryTracked: boolean;
    incomingQCRequired: boolean;
    serialTrackingMode: string;
    serialAttributeCount: number;
    lotTrackingMode: string;
    rotationMethod: string;
    shelfLifeRequired: boolean;
    shelfLifeDuration: string;
    shelfLifeUnit: string;
    manufacturingDateRequired: boolean;
    expiryDateRequired: boolean;
    minShelfLifeAtInbound: string;
    minShelfLifeAtOutbound: string;
    dateRequirement: string;
    shelfLifeThresholdsEnabled: boolean;
  };
  pricing: {
    actualPrice: string;
    actualCurrency: string;
    sellingPrice: string;
    sellingCurrency: string;
    additionalPrices: { type: string; label: string; value: string; currency: string }[];
  };
  inventory: InventoryLocation[];
  customData?: VariantCustomDataEntry[];
  customsTax?: {
    countryOfOrigin: string;
    hsnCode: string;
    taxRule: string;
  };
}

interface PackageDetailsPreset {
  length: string;
  width: string;
  height: string;
  weight: string;
  sku: string;
}

interface VariantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productSku?: string;
  productImage?: string;
  combinations: VariantCombination[];
  selectedCombinationId?: string;
  variantData: Record<string, VariantDetailData>;
  onUpdateVariantData: (combinationId: string, data: VariantDetailData) => void;
  combinationQuantities: Record<string, number>;
  packageDetailsPreset?: PackageDetailsPreset;
  combinationActualPrices?: Record<string, string>;
  combinationSellingPrices?: Record<string, string>;
  plpEnabledCombinationIds?: Set<string>;
  onAddVariantValue?: (groupId: string, value: string) => void;
  variantGroups?: { id: string; name: string }[];
  productCustomDataKeys?: { id: string; key: string }[];
  baseUom?: import("@/contexts/ProductsContext").BaseUomCode;
  isEditMode?: boolean;
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

const createDefaultUnavailableCategories = (): UnavailableCategories => ({
  damaged: 0,
  lost: 0,
  onHold: 0,
  inTransit: 0,
});

const getTotalUnavailable = (categories: UnavailableCategories): number => {
  return categories.damaged + categories.lost + categories.onHold + categories.inTransit;
};

const createDefaultVariantData = (quantity: number = 0, preset?: PackageDetailsPreset): VariantDetailData => ({
  identifiers: [{ id: "1", type: "sku", value: preset?.sku || "", isPrimary: true }],
  customLabels: {},
  shipment: {
    length: preset?.length || "",
    width: preset?.width || "",
    height: preset?.height || "",
    units: "cm",
    weight: preset?.weight || "",
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
      total: quantity 
    },
  ],
});

export function VariantDetailModal({
  isOpen,
  onClose,
  productName,
  productSku,
  productImage,
  combinations,
  selectedCombinationId,
  variantData,
  onUpdateVariantData,
  combinationQuantities,
  packageDetailsPreset,
  combinationActualPrices = {},
  combinationSellingPrices = {},
  plpEnabledCombinationIds = new Set(),
  onAddVariantValue,
  variantGroups = [],
  productCustomDataKeys = [],
  baseUom,
  isEditMode = false,
}: VariantDetailModalProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const [selectedId, setSelectedId] = useState(selectedCombinationId || combinations[0]?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingPLPName, setIsEditingPLPName] = useState(false);
  const [editingPLPName, setEditingPLPName] = useState("");
  const [addingValueMode, setAddingValueMode] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newValueLabel, setNewValueLabel] = useState("");
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false);
  const [shipmentExpanded, setShipmentExpanded] = useState(true);
  const [invControlExpanded, setInvControlExpanded] = useState(true);
  const [editingShipmentName, setEditingShipmentName] = useState<string | null>(null);
  const [editingShipmentNameValue, setEditingShipmentNameValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Active" | "InActive">("all");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [advancedPricingExpanded, setAdvancedPricingExpanded] = useState(false);
  const [advancedInventoryExpanded, setAdvancedInventoryExpanded] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [invSearchQuery, setInvSearchQuery] = useState("");
  const [invFilterOpen, setInvFilterOpen] = useState(false);
  const [sellableFilter, setSellableFilter] = useState<"all" | "available" | "notAvailable">("all");
  const [onHandFilter, setOnHandFilter] = useState<"all" | "available" | "notAvailable">("all");
  const [invPage, setInvPage] = useState(0);
  const INV_PER_PAGE = 5;

  // Sync selectedId when the modal opens with a different combination
  useEffect(() => {
    if (isOpen && selectedCombinationId) {
      setSelectedId(selectedCombinationId);
    }
  }, [isOpen, selectedCombinationId]);

  // Auto-collapse shipment & inventory control when filled, on variant switch
  useEffect(() => {
    const s = currentData.shipment;
    const shipFilled = !!(s.length && s.width && s.height && s.weight);
    setShipmentExpanded(!shipFilled);
    setInvControlExpanded(false);
  }, [selectedId]);


  const currentQuantity = selectedId ? (combinationQuantities[selectedId] || 0) : 0;

  // Get or create data for selected variant
  const currentData = useMemo(() => {
    if (!selectedId) return createDefaultVariantData(0, packageDetailsPreset);
    const existingData = variantData[selectedId];
    
    const tableActualPrice = combinationActualPrices[selectedId] || "";
    const tableSellingPrice = combinationSellingPrices[selectedId] || "";
    
    const syncIdentifiers = (identifiers: Identifier[]): Identifier[] => {
      const presetSku = packageDetailsPreset?.sku || "";
      if (!presetSku) return identifiers;
      return identifiers.map(id => {
        if (id.isPrimary && id.type === "sku" && !id.value) {
          return { ...id, value: presetSku };
        }
        return id;
      });
    };
    
    if (existingData) {
      return {
        ...existingData,
        identifiers: syncIdentifiers(existingData.identifiers),
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
    
    const defaultData = createDefaultVariantData(currentQuantity, packageDetailsPreset);
    return {
      ...defaultData,
      pricing: {
        ...defaultData.pricing,
        actualPrice: tableActualPrice,
        sellingPrice: tableSellingPrice,
      },
    };
  }, [selectedId, variantData, currentQuantity, packageDetailsPreset, combinationActualPrices, combinationSellingPrices]);

  const isLotTracked = (currentData.inventoryControl?.lotTrackingMode ?? "NONE") !== "NONE";

  const filteredInventory = useMemo(() => {
    let result = currentData.inventory;
    if (invSearchQuery.trim()) {
      const q = invSearchQuery.toLowerCase();
      result = result.filter(loc => loc.name.toLowerCase().includes(q) || (loc.locationCode || "").includes(q));
    }
    if (sellableFilter === "available") result = result.filter(loc => loc.available > 0);
    else if (sellableFilter === "notAvailable") result = result.filter(loc => loc.available <= 0);
    if (onHandFilter === "available") result = result.filter(loc => loc.total > 0);
    else if (onHandFilter === "notAvailable") result = result.filter(loc => loc.total <= 0);
    return result;
  }, [currentData.inventory, invSearchQuery, sellableFilter, onHandFilter]);

  const totalInvPages = Math.ceil(filteredInventory.length / INV_PER_PAGE);
  const paginatedInventory = useMemo(() => {
    const start = invPage * INV_PER_PAGE;
    return filteredInventory.slice(start, start + INV_PER_PAGE);
  }, [filteredInventory, invPage]);
  const resetInvPage = () => setInvPage(0);

  const invActiveFilterCount = (sellableFilter !== "all" ? 1 : 0) + (onHandFilter !== "all" ? 1 : 0);

  const updateCurrentData = (updates: Partial<VariantDetailData>) => {
    if (!selectedId) return;
    onUpdateVariantData(selectedId, { ...currentData, ...updates });
  };

  const filteredCombinations = useMemo(() => {
    let result = combinations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => c.label.toLowerCase().includes(query));
    }
    if (statusFilter !== "all") {
      result = result.filter((c) => {
        if (c.id === selectedId) return true; // always keep selected variant visible
        const data = variantData[c.id];
        const s = data?.status ?? "Active";
        return s === statusFilter;
      });
    }
    return result;
  }, [combinations, searchQuery, statusFilter, variantData]);

  const selectedCombination = combinations.find((c) => c.id === selectedId);

  // Identifier helpers
  const addIdentifier = () => {
    const newId = Date.now().toString();
    updateCurrentData({
      identifiers: [
        ...currentData.identifiers,
        { id: newId, type: "sku", value: "", isPrimary: false },
      ],
    });
  };

  const updateIdentifier = (id: string, field: keyof Identifier, value: string | boolean) => {
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
    const deletedItem = currentData.identifiers.find((item) => item.id === id);
    if (deletedItem?.isPrimary && filtered.length > 0) {
      const nextPrimary = filtered.find((item) => item.type !== "custom");
      if (nextPrimary) nextPrimary.isPrimary = true;
    }
    updateCurrentData({ identifiers: filtered });
  };

  const canDeletePrimary = (id: string) => {
    const identifier = currentData.identifiers.find((item) => item.id === id);
    if (!identifier?.isPrimary) return true;
    const otherNonCustom = currentData.identifiers.filter(
      (item) => item.id !== id && item.type !== "custom"
    );
    return otherNonCustom.length > 0;
  };

  const updateCustomLabel = (id: string, label: string) => {
    updateCurrentData({
      customLabels: { ...currentData.customLabels, [id]: label },
    });
  };

  const updateShipment = (field: keyof typeof currentData.shipment, value: string) => {
    updateCurrentData({
      shipment: { ...currentData.shipment, [field]: value },
    });
  };

  const addShipment = () => {
    const existing = currentData.additionalShipments || [];
    if (existing.length >= 4) return; // max 5 total (1 primary + 4 additional)
    const newId = Date.now().toString();
    const newNumber = existing.length + 2;
    updateCurrentData({
      additionalShipments: [
        ...existing,
        { id: newId, name: `Shipment ${newNumber}`, length: "", width: "", height: "", units: "cm", weight: "", weightUnit: "grams" },
      ],
    });
  };

  const updateAdditionalShipment = (shipmentId: string, field: keyof ShipmentEntry, value: string) => {
    const updated = (currentData.additionalShipments || []).map((s) =>
      s.id === shipmentId ? { ...s, [field]: value } : s
    );
    updateCurrentData({ additionalShipments: updated });
  };

  const deleteAdditionalShipment = (shipmentId: string) => {
    updateCurrentData({
      additionalShipments: (currentData.additionalShipments || []).filter((s) => s.id !== shipmentId),
    });
  };

  const updatePricing = (field: keyof typeof currentData.pricing, value: string) => {
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

  const availableAdditionalPrices = ADDITIONAL_PRICE_OPTIONS.filter(
    (opt) => !currentData.pricing.additionalPrices.some((p) => p.type === opt.type)
  );

  // ---- Sidebar content (reused in desktop sidebar and mobile bottom sheet) ----
  const sidebarContent = (
    <>
      {/* Product Info */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        {productImage ? (
          <img src={productImage} alt={productName} className="w-10 h-10 rounded-md object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] text-muted-foreground">IMG</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{productName}</p>
          {productSku && (
            <p className="text-xs text-muted-foreground truncate">{productSku}</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <DropdownMenu open={filterDropdownOpen} onOpenChange={setFilterDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className={cn("h-9 w-9", statusFilter !== "all" && "border-primary text-primary")}>
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
      <div className="flex-1 overflow-y-auto">
        {filteredCombinations.map((combo) => (
          <button
            key={combo.id}
            type="button"
            onClick={() => {
              setSelectedId(combo.id);
              setIsEditingPLPName(false);
              if (isMobile) setVariantSelectorOpen(false);
            }}
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
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">IMG</span>
              </div>
            )}
            <span className="text-sm font-medium truncate flex-1">{combo.label}</span>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0",
              (variantData[combo.id]?.status ?? "Active") === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            )}>
              {(variantData[combo.id]?.status ?? "Active") === "Active" ? "Active" : "Inactive"}
            </span>
          </button>
        ))}
      </div>

      {/* Add Variant Value */}
      {onAddVariantValue && variantGroups.length > 0 && (
        <div className="border-t border-border">
          {!addingValueMode ? (
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-muted/50 transition-colors"
              onClick={() => {
                setAddingValueMode(true);
                setSelectedGroupId(variantGroups.length === 1 ? variantGroups[0].id : "");
                setNewValueLabel("");
              }}
            >
              <Plus className="w-4 h-4" />
              Add Variant Value
            </button>
          ) : (
            <div className="px-3 py-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="h-8 text-sm w-[110px] shrink-0">
                    <SelectValue placeholder="Select Variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variantGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={newValueLabel}
                  onChange={(e) => setNewValueLabel(e.target.value)}
                  className="h-8 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newValueLabel.trim() && selectedGroupId) {
                      onAddVariantValue(selectedGroupId, newValueLabel.trim());
                      setNewValueLabel("");
                    }
                    if (e.key === "Escape") {
                      setAddingValueMode(false);
                    }
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddingValueMode(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!newValueLabel.trim() || !selectedGroupId}
                  onClick={() => {
                    onAddVariantValue(selectedGroupId, newValueLabel.trim());
                    setNewValueLabel("");
                    setAddingValueMode(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Helper for inventory control updates with auto-enforcement
  const updateInventoryControl = (field: string, value: any) => {
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
      // Shelf life available when rotation is FEFO or FMFO (handled in UI), clear if NONE
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

    // Shelf life thresholds validation
    if (field === "shelfLifeThresholdsEnabled" && value === false) {
      newState.minShelfLifeAtInbound = "";
      newState.minShelfLifeAtOutbound = "";
    }

    updateCurrentData({ inventoryControl: newState });
  };

  const updateHandling = (field: string, value: string) => {
    updateCurrentData({
      handling: {
        handlingClass: currentData.handling?.handlingClass ?? "Standard",
        storageCondition: currentData.handling?.storageCondition ?? "Dry",
        [field]: value,
      },
    });
  };

  const invCtrl = currentData.inventoryControl;

  // ---- Main content (right panel) ----
  const mainContent = (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Mobile variant selector chip */}
      {isMobile && (
        <button
          type="button"
          onClick={() => setVariantSelectorOpen(true)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-muted/50 border border-border rounded-lg transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedCombination?.image ? (
              <img src={selectedCombination.image} alt="" className="w-8 h-8 rounded-md object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">IMG</span>
              </div>
            )}
            <span className="text-sm font-medium truncate">{selectedCombination?.label || "Select variant"}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      )}


      {/* 1. Identification Details Section */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Identification Details</h3>
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
              <Select value={baseUom || "EA"} onValueChange={() => {}}>
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

        <div>
          <label className="form-label flex items-center gap-1">
            Identifier
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Unique identifier for this variant</p>
              </TooltipContent>
            </Tooltip>
          </label>

          <div className="space-y-3">
            {currentData.identifiers.map((identifier) => (
              <div key={identifier.id} className="flex items-center gap-2">
                <div className="w-20 md:w-24 shrink-0">
                  <Select
                    value={identifier.type}
                    onValueChange={(val) => updateIdentifier(identifier.id, "type", val)}
                  >
                    <SelectTrigger className="w-full h-10 text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTIFIER_TYPES.filter(
                        (type) => !(identifier.isPrimary && type.value === "custom")
                      ).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-0">
                  {identifier.type === "custom" ? (
                    <div className="flex h-10 w-full rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                      <input
                        type="text"
                        placeholder="Label"
                        value={currentData.customLabels[identifier.id] || ""}
                        onChange={(e) => updateCustomLabel(identifier.id, e.target.value)}
                        className="w-16 px-2 py-2 text-sm bg-muted/50 border-r border-input outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={identifier.value}
                        onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                        className="flex-1 px-3 py-2 text-sm outline-none bg-transparent"
                      />
                    </div>
                  ) : (
                    <Input
                      placeholder="0"
                      value={identifier.value}
                      onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                      className="h-10"
                    />
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={
                        !(
                          (!identifier.isPrimary && identifier.type !== "custom") ||
                          canDeletePrimary(identifier.id)
                        )
                      }
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!identifier.isPrimary && identifier.type !== "custom" && (
                      <DropdownMenuItem onClick={() => makePrimary(identifier.id)}>
                        <Star className="w-4 h-4 mr-2" />
                        Make Primary
                      </DropdownMenuItem>
                    )}
                    {canDeletePrimary(identifier.id) && (
                      <DropdownMenuItem
                        onClick={() => deleteIdentifier(identifier.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-16 shrink-0 hidden md:block">
                  {identifier.isPrimary && (
                    <span className="badge-primary">Primary</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIdentifier}
            className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline"
          >
            <Plus className="w-4 h-4" />
            Add Identifier
          </button>
        </div>
      </div>

      {/* 2. Pricing Section */}
      {(() => {
        const sellingPriceNum = parseFloat(currentData.pricing.sellingPrice.replace(/,/g, "")) || 0;
        const compareAtPriceNum = parseFloat(currentData.pricing.actualPrice.replace(/,/g, "")) || 0;
        const costEntry = currentData.pricing.additionalPrices.find(p => p.type === "avgCost");
        const costPriceNum = costEntry ? (parseFloat(costEntry.value.replace(/,/g, "")) || 0) : 0;
        const hasCostPrice = costEntry && costPriceNum > 0;
        const showDiscount = sellingPriceNum > 0 && compareAtPriceNum > 0 && compareAtPriceNum > sellingPriceNum;
        const discountAmount = compareAtPriceNum - sellingPriceNum;
        const discountPercent = compareAtPriceNum > 0 ? ((discountAmount / compareAtPriceNum) * 100) : 0;
        const showMargin = hasCostPrice && sellingPriceNum > 0;
        const marginAmount = sellingPriceNum - costPriceNum;
        const marginPercent = costPriceNum > 0 ? ((marginAmount / costPriceNum) * 100) : 0;
        const formatCurrency = (n: number) => n.toLocaleString('en-IN');
        const hasAdditionalPrices = currentData.pricing.additionalPrices.length > 0;
        const CURRENCY_MAP: Record<string, string> = { inr: "INR", usd: "USD", eur: "EUR" };

        return (
        <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Pricing</h3>
            {baseUom && (
              <span className="text-xs text-muted-foreground font-normal">
                (per {BASE_UOM_OPTIONS.find(u => u.code === baseUom)?.name ?? baseUom})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-1">
                Selling Price<span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The price at which you sell this product</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div className="flex items-center">
                <Select
                  value={currentData.pricing.sellingCurrency}
                  onValueChange={(val) => updatePricing("sellingCurrency", val)}
                >
                  <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">INR</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="0"
                  value={currentData.pricing.sellingPrice}
                  onChange={(e) => updatePricing("sellingPrice", e.target.value)}
                  className="flex-1 h-10 rounded-l-none"
                />
              </div>
            </div>

            <div>
              <label className="form-label flex items-center gap-1">
                Full Price<span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The original/MRP price of the product</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <div className="flex items-center">
                <Select
                  value={currentData.pricing.actualCurrency}
                  onValueChange={(val) => updatePricing("actualCurrency", val)}
                >
                  <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">INR</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="0"
                  value={currentData.pricing.actualPrice}
                  onChange={(e) => updatePricing("actualPrice", e.target.value)}
                  className="flex-1 h-10 rounded-l-none"
                />
              </div>
            </div>
          </div>

          {/* Compact Discount & Margin banners */}
          {(showDiscount || showMargin) && (
            <div className="flex flex-wrap gap-2">
              {showDiscount && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-destructive/10 text-destructive font-medium">
                  Discount: -₹{formatCurrency(Math.abs(discountAmount))} (-{discountPercent.toFixed(1)}%)
                </span>
              )}
              {showMargin && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                  marginAmount >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                )}>
                  Margin: {marginAmount >= 0 ? "₹" : "-₹"}{formatCurrency(Math.abs(marginAmount))} ({marginAmount >= 0 ? "+" : ""}{marginPercent.toFixed(1)}%)
                </span>
              )}
            </div>
          )}

          {/* Additional Price Fields with Collapsible */}
          {(() => {
            const transferEntry = currentData.pricing.additionalPrices.find(p => p.type === "transfer");
            const transferPriceNum = transferEntry ? (parseFloat(transferEntry.value.replace(/,/g, "")) || 0) : 0;
            const hasTransferPrice = transferEntry && transferPriceNum > 0;
            const showTransferMargin = hasCostPrice && hasTransferPrice;
            const transferMargin = transferPriceNum - costPriceNum;
            const transferMarginPercent = costPriceNum > 0 ? ((transferMargin / costPriceNum) * 100) : 0;

            return hasAdditionalPrices ? (
              <div className="border-t border-border pt-4 mt-2">
                <button
                  type="button"
                  className="flex items-center justify-between w-full"
                  onClick={() => setAdvancedPricingExpanded(!advancedPricingExpanded)}
                >
                  <h4 className="text-sm font-semibold text-foreground">Additional Pricing Details</h4>
                  <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", advancedPricingExpanded && "rotate-180")} />
                </button>
                {advancedPricingExpanded ? (
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentData.pricing.additionalPrices.map((price) => (
                        <div key={price.type}>
                          <label className="form-label">{price.label}</label>
                          <div className="flex items-center">
                            <Select value={price.currency} onValueChange={() => {}}>
                              <SelectTrigger className="w-20 h-10 rounded-r-none border-r-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inr">INR</SelectItem>
                                <SelectItem value="usd">USD</SelectItem>
                                <SelectItem value="eur">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="0"
                              value={price.value}
                              onChange={(e) => updateAdditionalPrice(price.type, e.target.value)}
                              className="flex-1 h-10 rounded-l-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {showTransferMargin && (
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                        transferMargin >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      )}>
                        Transfer Margin: {transferMargin >= 0 ? "₹" : "-₹"}{formatCurrency(Math.abs(transferMargin))} ({transferMargin >= 0 ? "+" : ""}{transferMarginPercent.toFixed(1)}%)
                      </span>
                    )}
                    {/* Add remaining price pills inside expanded view */}
                    {availableAdditionalPrices.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {availableAdditionalPrices.map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => addAdditionalPrice(opt.type, opt.label)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {currentData.pricing.additionalPrices.filter(p => p.value.trim()).map((price) => (
                      <span key={price.type} className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-foreground bg-muted rounded-full">
                        {price.label}: {CURRENCY_MAP[price.currency] || price.currency.toUpperCase()} {price.value}
                      </span>
                    ))}
                    {showTransferMargin && (
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium",
                        transferMargin >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      )}>
                        Transfer Margin: {transferMargin >= 0 ? "₹" : "-₹"}{formatCurrency(Math.abs(transferMargin))} ({transferMargin >= 0 ? "+" : ""}{transferMarginPercent.toFixed(1)}%)
                      </span>
                    )}
                    {availableAdditionalPrices.length > 0 && availableAdditionalPrices.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => { addAdditionalPrice(opt.type, opt.label); setAdvancedPricingExpanded(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
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
                    onClick={() => { addAdditionalPrice(opt.type, opt.label); setAdvancedPricingExpanded(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-background border border-border rounded-full hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
        );
      })()}



      {/* 3. Shipment Details Section */}
      {(() => {
        const shipmentFilled = !!(currentData.shipment.length && currentData.shipment.width && currentData.shipment.height && currentData.shipment.weight);
        const handlingClass = currentData.handling?.handlingClass || "Standard";
        const storageCondition = currentData.handling?.storageCondition || "Dry";
        const handlingLabel = handlingClass;
        const storageLabel = storageCondition;

        return (
          <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-5">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => setShipmentExpanded(!shipmentExpanded)}
            >
              <h3 className="text-base font-semibold text-foreground">Shipment Details</h3>
              <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", shipmentExpanded && "rotate-180")} />
            </button>

            {!shipmentExpanded && shipmentFilled ? (
              /* Collapsed summary */
              <div className="space-y-3">
                {/* Primary shipment */}
                <div>
                  {(currentData.additionalShipments?.length ?? 0) > 0 && (
                    <p className="text-xs font-medium text-foreground mb-1.5">Shipment 1</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Dimensions</span>
                      <span className="text-sm font-medium">{currentData.shipment.length} × {currentData.shipment.width} × {currentData.shipment.height} {currentData.shipment.units}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                      <span className="text-sm font-medium">{currentData.shipment.weight} {currentData.shipment.weightUnit}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Handling</span>
                      <span className="text-sm font-medium">{handlingLabel}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Storage</span>
                      <span className="text-sm font-medium">{storageLabel}</span>
                    </div>
                  </div>
                </div>
                {/* Additional shipments */}
                {(currentData.additionalShipments || []).map((shipment, idx) => (
                  <div key={shipment.id}>
                    <p className="text-xs font-medium text-foreground mb-1.5">{shipment.name || `Shipment ${idx + 2}`}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Dimensions</span>
                        <span className="text-sm font-medium">{shipment.length || "—"} × {shipment.width || "—"} × {shipment.height || "—"} {shipment.units}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                        <span className="text-sm font-medium">{shipment.weight || "—"} {shipment.weightUnit}</span>
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
                ))}
              </div>
            ) : (
              /* Expanded form */
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div>
                    <label className="form-label">Length<span className="text-destructive">*</span></label>
                    <Input placeholder="" value={currentData.shipment.length} onChange={(e) => updateShipment("length", e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <label className="form-label">Width<span className="text-destructive">*</span></label>
                    <Input placeholder="" value={currentData.shipment.width} onChange={(e) => updateShipment("width", e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <label className="form-label">Height<span className="text-destructive">*</span></label>
                    <Input placeholder="" value={currentData.shipment.height} onChange={(e) => updateShipment("height", e.target.value)} className="h-10" />
                  </div>
                  <div>
                    <label className="form-label">Units</label>
                    <Select value={currentData.shipment.units} onValueChange={(val) => updateShipment("units", val)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">CM</SelectItem>
                        <SelectItem value="in">IN</SelectItem>
                        <SelectItem value="mm">MM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-label flex items-center gap-1">
                    Product Weight<span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Actual weight of the product including brand packaging.</p>
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <div className="flex items-center">
                    <Input placeholder="0" value={currentData.shipment.weight} onChange={(e) => updateShipment("weight", e.target.value)} className="flex-1 h-10 rounded-r-none" />
                    <Select value={currentData.shipment.weightUnit} onValueChange={(val) => updateShipment("weightUnit", val)}>
                      <SelectTrigger className="w-24 h-10 rounded-l-none border-l-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grams">grams</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="lbs">lbs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showWeightCalculations && (
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Volumetric Weight:</span>
                      <span className="text-sm font-medium">{volumetricWeight.toFixed(2)} {currentData.shipment.weightUnit}</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex"><HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" /></button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-medium mb-1">Volumetric Weight</p>
                          <p className="text-xs text-muted-foreground">(Length × Width × Height) / 5</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Applicable Weight:</span>
                      <span className="text-sm font-medium text-primary">{applicableWeight.toFixed(2)} {currentData.shipment.weightUnit}</span>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex"><HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" /></button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Higher of volumetric or product weight, used for package suggestions and delivery fee calculation.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}

                {/* Additional Shipments */}
                {(currentData.additionalShipments || []).map((shipment) => {
                  const sLength = parseFloat(shipment.length) || 0;
                  const sWidth = parseFloat(shipment.width) || 0;
                  const sHeight = parseFloat(shipment.height) || 0;
                  const sWeight = parseFloat(shipment.weight) || 0;
                  const sVolumetric = sLength && sWidth && sHeight ? (sLength * sWidth * sHeight) / 5 : 0;
                  const sApplicable = Math.max(sWeight, sVolumetric);
                  const sShowCalc = sLength > 0 && sWidth > 0 && sHeight > 0;

                  return (
                    <div key={shipment.id} className="mt-4 p-4 border border-border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {editingShipmentName === shipment.id ? (
                            <>
                              <Input
                                value={editingShipmentNameValue}
                                onChange={(e) => setEditingShipmentNameValue(e.target.value)}
                                className="h-7 w-40 text-sm"
                                autoFocus
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                updateAdditionalShipment(shipment.id, "name", editingShipmentNameValue || shipment.name);
                                setEditingShipmentName(null);
                              }}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingShipmentName(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-foreground">{shipment.name}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setEditingShipmentName(shipment.id);
                                setEditingShipmentNameValue(shipment.name);
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAdditionalShipment(shipment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div>
                          <label className="form-label">Length<span className="text-destructive">*</span></label>
                          <Input placeholder="" value={shipment.length} onChange={(e) => updateAdditionalShipment(shipment.id, "length", e.target.value)} className="h-10" />
                        </div>
                        <div>
                          <label className="form-label">Width<span className="text-destructive">*</span></label>
                          <Input placeholder="" value={shipment.width} onChange={(e) => updateAdditionalShipment(shipment.id, "width", e.target.value)} className="h-10" />
                        </div>
                        <div>
                          <label className="form-label">Height<span className="text-destructive">*</span></label>
                          <Input placeholder="" value={shipment.height} onChange={(e) => updateAdditionalShipment(shipment.id, "height", e.target.value)} className="h-10" />
                        </div>
                        <div>
                          <label className="form-label">Units</label>
                          <Select value={shipment.units} onValueChange={(val) => updateAdditionalShipment(shipment.id, "units", val)}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cm">CM</SelectItem>
                              <SelectItem value="in">IN</SelectItem>
                              <SelectItem value="mm">MM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Product Weight<span className="text-destructive">*</span></label>
                        <div className="flex items-center">
                          <Input placeholder="0" value={shipment.weight} onChange={(e) => updateAdditionalShipment(shipment.id, "weight", e.target.value)} className="flex-1 h-10 rounded-r-none" />
                          <Select value={shipment.weightUnit} onValueChange={(val) => updateAdditionalShipment(shipment.id, "weightUnit", val)}>
                            <SelectTrigger className="w-24 h-10 rounded-l-none border-l-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grams">grams</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="lbs">lbs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {sShowCalc && (
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 pt-3 border-t border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Volumetric Weight:</span>
                            <span className="text-sm font-medium">{sVolumetric.toFixed(2)} {shipment.weightUnit}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Applicable Weight:</span>
                            <span className="text-sm font-medium text-primary">{sApplicable.toFixed(2)} {shipment.weightUnit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {(1 + (currentData.additionalShipments || []).length) < 5 && (
                  <button type="button" onClick={addShipment} className="flex items-center gap-1 text-primary text-sm font-medium mt-3 hover:underline">
                    <Plus className="w-4 h-4" />Add Shipment
                  </button>
                )}

                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Handling</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Handling Class</label>
                      <Select value={handlingClass} onValueChange={(val) => updateHandling("handlingClass", val)}>
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
                      <Select value={storageCondition} onValueChange={(val) => updateHandling("storageCondition", val)}>
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
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* 4. Inventory Section */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">Inventory</h3>
          {baseUom && (
            <span className="text-xs text-muted-foreground font-normal">
              (in {BASE_UOM_OPTIONS.find(u => u.code === baseUom)?.name ?? baseUom})
            </span>
          )}
        </div>

        {/* Search, Filter & History */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search location..."
              value={invSearchQuery}
              onChange={(e) => { setInvSearchQuery(e.target.value); resetInvPage(); }}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Popover open={invFilterOpen} onOpenChange={setInvFilterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-9 w-9 flex items-center justify-center rounded-md border border-border hover:bg-muted transition-colors",
                  (sellableFilter !== "all" || onHandFilter !== "all") && "border-primary text-primary"
                )}
                aria-label="Filter inventory"
              >
                <Filter className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-3 space-y-3 bg-popover z-50">
              <div>
                <label className="text-sm font-medium text-foreground">Sellable</label>
                <Select value={sellableFilter} onValueChange={(v: any) => { setSellableFilter(v); resetInvPage(); }}>
                  <SelectTrigger className="h-9 w-full text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="notAvailable">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">On Hand</label>
                <Select value={onHandFilter} onValueChange={(v: any) => { setOnHandFilter(v); resetInvPage(); }}>
                  <SelectTrigger className="h-9 w-full text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="notAvailable">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={() => {
              onClose();
              setTimeout(() => { navigate("/inventory"); }, 150);
            }}
            className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-1.5 ml-auto"
          >
            <History className="w-3.5 h-3.5" />
            View adjustment history
          </button>
        </div>

        {currentData.inventory.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">No locations added yet</p>
          </div>
        ) : (
          <>
            {/* Desktop inventory table */}
            <div className="hidden md:block">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Locations</th>
                      {isEditMode && <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Unavailable</th>}
                      {isEditMode && <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Committed</th>}
                      {isEditMode && <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">Sellable</th>}
                      <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">On hand</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInventory.map((location) => (
                      <tr key={location.id} className="border-b border-border last:border-b-0 group">
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {location.name}
                            {location.locationCode && <span className="text-xs text-muted-foreground">({location.locationCode})</span>}
                          </div>
                        </td>
                        {isEditMode && (
                        <td className="px-4 py-3">
                          <InventoryManagementPopover
                            unavailableData={location.unavailableCategories}
                            sellable={location.available}
                            onUpdateInventory={(category, action, quantity) => {
                              handleInventoryUpdate(location.id, category, action, quantity);
                            }}
                          />
                        </td>
                        )}
                        {isEditMode && (
                        <td className="px-4 py-3">
                          <Input type="number" min="0" value={location.committed} readOnly className="h-9 w-full text-center bg-muted/50" />
                        </td>
                        )}
                        {isEditMode && (
                        <td className="px-4 py-3">
                          <Input type="number" min="0" value={location.available} readOnly className="h-9 w-full text-center bg-muted/50" />
                        </td>
                        )}
                        <td className="px-4 py-3">
                          {isEditMode ? (
                          <Input type="number" min="0" value={location.total} readOnly className="h-9 w-full text-center bg-muted/50" title="Unavailable + Committed + Sellable" />
                          ) : (
                          <Input
                            type="number"
                            min="0"
                            value={location.total}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              const updatedInventory = currentData.inventory.map(loc =>
                                loc.id === location.id ? { ...loc, total: val, available: val } : loc
                              );
                              updateCurrentData({ inventory: updatedInventory });
                            }}
                            className="h-9 w-full text-center"
                          />
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedInventory = currentData.inventory.filter(loc => loc.id !== location.id);
                              updateCurrentData({ inventory: updatedInventory });
                            }}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile inventory cards */}
            <div className="md:hidden space-y-3">
              {paginatedInventory.map((location) => (
                <div key={location.id} className="border border-border rounded-lg p-4 space-y-3 group">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      {location.name}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => {
                            const primaryId = currentData.identifiers.find(i => i.isPrimary);
                            const params = new URLSearchParams();
                            if (primaryId?.value) params.set("identifier", primaryId.value);
                            params.set("location", location.name);
                            onClose();
                            setTimeout(() => navigate(`/inventory?${params.toString()}`), 150);
                          }}
                          className="ml-2 inline-flex text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const updatedInventory = currentData.inventory.filter(loc => loc.id !== location.id);
                        updateCurrentData({ inventory: updatedInventory });
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {isEditMode && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Unavailable</label>
                      <InventoryManagementPopover
                        unavailableData={location.unavailableCategories}
                        sellable={location.available}
                        onUpdateInventory={(category, action, quantity) => {
                          handleInventoryUpdate(location.id, category, action, quantity);
                        }}
                      />
                    </div>
                    )}
                    {isEditMode && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Committed</label>
                      <Input type="number" min="0" value={location.committed} readOnly className="h-9 text-center bg-muted/50" />
                    </div>
                    )}
                    {isEditMode && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Sellable</label>
                      <Input type="number" min="0" value={location.available} readOnly className="h-9 text-center bg-muted/50" />
                    </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">On hand</label>
                      {isEditMode ? (
                      <Input type="number" min="0" value={location.total} readOnly className="h-9 text-center bg-muted/50" />
                      ) : (
                      <Input
                        type="number"
                        min="0"
                        value={location.total}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const updatedInventory = currentData.inventory.map(loc =>
                            loc.id === location.id ? { ...loc, total: val, available: val } : loc
                          );
                          updateCurrentData({ inventory: updatedInventory });
                        }}
                        className="h-9 text-center"
                      />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add Location */}
        <Popover open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-primary hover:text-primary/80">
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
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {AVAILABLE_LOCATIONS
                .filter(l => !currentData.inventory.some(inv => inv.id === l.id) && l.name.toLowerCase().includes(locationSearchQuery.toLowerCase()))
                .map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      const newLoc: InventoryLocation = {
                        id: loc.id,
                        name: loc.name,
                        locationCode: loc.code,
                        unavailableCategories: createDefaultUnavailableCategories(),
                        committed: 0,
                        available: 0,
                        total: 0,
                      };
                      updateCurrentData({ inventory: [...currentData.inventory, newLoc] });
                      setLocationPickerOpen(false);
                      setLocationSearchQuery("");
                    }}
                    className="w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                  >
                    {loc.name} <span className="text-xs text-muted-foreground">({loc.code})</span>
                  </button>
                ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* 5. Inventory Control Section */}
      {(() => {
        const invCtrl = currentData.inventoryControl;
        const serialMode = invCtrl?.serialTrackingMode ?? "NONE";
        const lotMode = invCtrl?.lotTrackingMode ?? "NONE";
        const rotationMethod = invCtrl?.rotationMethod ?? "FIFO";
        const serialLabel = { NONE: "None", PER_UNIT: "Per Unit" }[serialMode] || serialMode;
        const lotLabel = { NONE: "None", INBOUND_ONLY: "Inbound Only", END_TO_END: "End to End" }[lotMode] || lotMode;
        const invTracked = invCtrl?.inventoryTracked !== false;
        const qcRequired = invCtrl?.incomingQCRequired ?? false;
        const hasInput = serialMode !== "NONE" || lotMode !== "NONE" || qcRequired;

        return (
          <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-5">
            <button
              type="button"
              className="flex items-center justify-between w-full"
              onClick={() => setInvControlExpanded(!invControlExpanded)}
            >
              <h3 className="text-base font-semibold text-foreground">Inventory Control</h3>
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
                    <label className="text-sm font-medium text-foreground">Inventory Tracked</label>
                    <Switch
                      checked={invCtrl?.inventoryTracked !== false}
                      onCheckedChange={(checked) => updateInventoryControl("inventoryTracked", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Incoming QC Required</label>
                    <Switch
                      checked={invCtrl?.incomingQCRequired ?? false}
                      onCheckedChange={(checked) => updateInventoryControl("incomingQCRequired", checked)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Serial & Batch Control */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Serial & Batch Control</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Serial Tracking Mode</label>
                        <Select value={invCtrl?.serialTrackingMode ?? "NONE"} onValueChange={(val) => updateInventoryControl("serialTrackingMode", val)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="PER_UNIT">Per Unit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(invCtrl?.serialTrackingMode === "PER_UNIT") && (
                        <div>
                          <label className="form-label">Serial Attribute Count</label>
                          <Input type="number" min="1" value={invCtrl?.serialAttributeCount ?? 1} onChange={(e) => updateInventoryControl("serialAttributeCount", Math.max(1, parseInt(e.target.value) || 1))} className="h-10" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Lot Tracking Mode</label>
                      <Select value={invCtrl?.lotTrackingMode ?? "NONE"} onValueChange={(val) => updateInventoryControl("lotTrackingMode", val)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="INBOUND_ONLY">Inbound Only</SelectItem>
                          <SelectItem value="END_TO_END">End to End</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Conditional fields when Lot Tracking != NONE */}
                {((invCtrl?.lotTrackingMode ?? "NONE") !== "NONE") && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div>
                        <label className="form-label">Rotation Method</label>
                        <Select value={invCtrl?.rotationMethod ?? "FIFO"} onValueChange={(val) => updateInventoryControl("rotationMethod", val)}>
                          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIFO">FIFO</SelectItem>
                            <SelectItem value="LIFO">LIFO</SelectItem>
                            <SelectItem value="FEFO">FEFO</SelectItem>
                            <SelectItem value="FMFO">FMFO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Requirements - only for FEFO/FMFO */}
                      {(invCtrl?.rotationMethod === "FEFO" || invCtrl?.rotationMethod === "FMFO") && (
                        <div>
                          <label className="form-label">Date Requirements</label>
                          <Select value={invCtrl?.dateRequirement ?? "NONE"} onValueChange={(val) => updateInventoryControl("dateRequirement", val)}>
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
                        <div className="space-y-4 pl-0 md:pl-4 border-l-0 md:border-l-2 md:border-primary/20">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Shelf Life Thresholds</label>
                            <Switch checked={invCtrl?.shelfLifeThresholdsEnabled ?? false} onCheckedChange={(checked) => updateInventoryControl("shelfLifeThresholdsEnabled", checked)} />
                          </div>

                          {(invCtrl?.shelfLifeThresholdsEnabled) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">Min Shelf Life at Inbound<span className="text-destructive">*</span></label>
                                <Input type="number" min="1" value={invCtrl?.minShelfLifeAtInbound ?? ""} onChange={(e) => updateInventoryControl("minShelfLifeAtInbound", e.target.value)} placeholder="0" className={cn("h-10", (!invCtrl?.minShelfLifeAtInbound || parseFloat(invCtrl.minShelfLifeAtInbound) <= 0) && "border-destructive")} />
                                {(!invCtrl?.minShelfLifeAtInbound || parseFloat(invCtrl.minShelfLifeAtInbound) <= 0) && (
                                  <p className="text-xs text-destructive mt-1">Must be greater than 0</p>
                                )}
                              </div>
                              <div>
                                <label className="form-label">Min Shelf Life at Outbound<span className="text-destructive">*</span></label>
                                <Input type="number" min="1" value={invCtrl?.minShelfLifeAtOutbound ?? ""} onChange={(e) => updateInventoryControl("minShelfLifeAtOutbound", e.target.value)} placeholder="0" className={cn("h-10", (!invCtrl?.minShelfLifeAtOutbound || parseFloat(invCtrl.minShelfLifeAtOutbound) <= 0) && "border-destructive")} />
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
                                  <label className="form-label">Shelf Life Duration{shelfMandatory && <span className="text-destructive">*</span>}</label>
                                  <Input type="number" min="1" value={invCtrl?.shelfLifeDuration ?? ""} onChange={(e) => updateInventoryControl("shelfLifeDuration", e.target.value)} placeholder="0" className={cn("h-10", shelfMandatory && (!invCtrl?.shelfLifeDuration || parseFloat(invCtrl.shelfLifeDuration) <= 0) && "border-destructive")} />
                                  {shelfMandatory && (!invCtrl?.shelfLifeDuration || parseFloat(invCtrl.shelfLifeDuration) <= 0) && (
                                    <p className="text-xs text-destructive mt-1">Duration must be greater than 0</p>
                                  )}
                                </div>
                                <div>
                                  <label className="form-label">Shelf Life Unit{shelfMandatory && <span className="text-destructive">*</span>}</label>
                                  <Select value={invCtrl?.shelfLifeUnit ?? "Days"} onValueChange={(val) => updateInventoryControl("shelfLifeUnit", val)}>
                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Minute">Minute</SelectItem>
                                      <SelectItem value="Hour">Hour</SelectItem>
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
          </div>
        );
      })()}


      {/* 6. Customs Information (Country of Origin only - no collapse) */}
      {(() => {
        const ct = currentData.customsTax;
        const countryVal = ct?.countryOfOrigin || "india";

        return (
          <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Customs Information</h3>
            <div>
              <label className="form-label">Country of Origin</label>
              <Select
                value={countryVal}
                onValueChange={(val) => updateCurrentData({ customsTax: { ...(ct || { countryOfOrigin: "india", hsnCode: "", taxRule: "" }), countryOfOrigin: val } })}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="usa">United States</SelectItem>
                  <SelectItem value="china">China</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="germany">Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })()}

      {/* 7. Custom Data Section */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Custom Data</h3>
        {(() => {
          const variantCustomData = currentData.customData || productCustomDataKeys.map(k => ({ id: k.id, key: k.key, value: "" }));
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
      </div>
    </div>
  );

  // ---- Footer ----
  const footer = (
    <div className="flex items-center justify-end gap-3 px-4 md:px-6 py-4 border-t border-border bg-muted/30 shrink-0">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onClose}>Save</Button>
    </div>
  );

  // ---- Mobile: Drawer ----
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h2 className="text-base font-semibold truncate">{selectedCombination?.label || "Variant Details"}</h2>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-1 rounded-sm hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>
            {mainContent}
            {footer}
          </DrawerContent>
        </Drawer>

        {/* Variant selector bottom sheet */}
        <Sheet open={variantSelectorOpen} onOpenChange={setVariantSelectorOpen}>
          <SheetContent side="bottom" className="max-h-[70vh] flex flex-col rounded-t-xl p-0">
            <SheetHeader className="px-4 py-3 border-b border-border">
              <SheetTitle className="text-base">Select Variant</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto flex flex-col">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ---- Desktop: Dialog ----
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl p-0 gap-0 h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{selectedCombination?.label || "Variant Details"}</h2>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-80 border-r border-border flex flex-col bg-muted/30">
            {sidebarContent}
          </div>

          {/* Right Content */}
          {mainContent}
        </div>

        {footer}
      </DialogContent>
    </Dialog>
  );
}
