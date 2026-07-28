import { useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { BASE_UOM_OPTIONS, BaseUomCode } from "@/contexts/ProductsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, Filter, History, Plus, Trash2, ChevronDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InventoryManagementPopover, UnavailableCategories } from "./InventoryManagementPopover";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface InventoryLocation {
  id: string;
  name: string;
  unavailableCategories: UnavailableCategories;
  committed: number;
  available: number;
  total: number;
}

export interface InventoryData {
  tracked: boolean;
  locations: InventoryLocation[];
}

export interface InventoryRef {
  getData: () => InventoryData;
}

export const createDefaultUnavailableCategories = (): UnavailableCategories => ({
  damaged: 0,
  lost: 0,
  onHold: 0,
  inTransit: 0,
});

const getTotalUnavailable = (categories: UnavailableCategories): number => {
  return categories.damaged + categories.lost + categories.onHold + categories.inTransit;
};

export const ALL_LOCATIONS = [
  { id: "shop", name: "Shop location" },
  { id: "warehouse-1", name: "Warehouse 1" },
  { id: "warehouse-2", name: "Warehouse 2" },
  { id: "store-front", name: "Store Front" },
  { id: "distribution-center", name: "Distribution Center" },
  { id: "pop-up", name: "Pop-up Store" },
];

type SellableFilter = "all" | "available" | "not_available";
type OnHandFilter = "all" | "available" | "not_available";

interface InventoryProps {
  initialData?: InventoryData;
  virtualBundle?: boolean;
  baseUom?: BaseUomCode;
  isEditMode?: boolean;
  lotTrackingMode?: string;
  /** If provided, used as the primary identifier for linking to inventory page */
  primaryIdentifier?: string;
}

export const Inventory = forwardRef<InventoryRef, InventoryProps>(
  ({ initialData, virtualBundle, baseUom, isEditMode = false, lotTrackingMode = "NONE", primaryIdentifier }, ref) => {
    const navigate = useNavigate();
    const [tracked, setTracked] = useState(initialData?.tracked ?? true);
    const [locations, setLocations] = useState<InventoryLocation[]>(
      initialData?.locations || []
    );
    const [addLocationOpen, setAddLocationOpen] = useState(false);
    const [locationSearch, setLocationSearch] = useState("");
    const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);
    const [sellableFilter, setSellableFilter] = useState<SellableFilter>("all");
    const [onHandFilter, setOnHandFilter] = useState<OnHandFilter>("all");
    const [inventoryLocationSearch, setInventoryLocationSearch] = useState("");

    useImperativeHandle(ref, () => ({
      getData: () => ({ tracked, locations }),
    }));

    const isLotTrackingEnabled = lotTrackingMode !== "NONE";

    const updateLocation = (id: string, field: "committed" | "available", value: number) => {
      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id === id) {
            const updated = { ...loc, [field]: value };
            const totalUnavailable = getTotalUnavailable(updated.unavailableCategories);
            updated.total = updated.available + updated.committed + totalUnavailable;
            return updated;
          }
          return loc;
        })
      );
    };

    const handleInventoryUpdate = (
      locationId: string,
      category: keyof UnavailableCategories,
      action: "add" | "moveToSellable" | "delete",
      quantity: number
    ) => {
      setLocations((prev) =>
        prev.map((loc) => {
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
        })
      );
    };

    const deleteLocation = (id: string) => {
      setLocations((prev) => prev.filter((loc) => loc.id !== id));
    };

    const addLocation = (locId: string, locName: string) => {
      if (locations.some((l) => l.id === locId)) return;
      setLocations((prev) => [
        ...prev,
        {
          id: locId,
          name: locName,
          unavailableCategories: createDefaultUnavailableCategories(),
          committed: 0,
          available: 0,
          total: 0,
        },
      ]);
      setAddLocationOpen(false);
      setLocationSearch("");
    };

    const isMobile = useIsMobile();

    const isIntegerOnly = baseUom === "EA";
    const qtyStep = isIntegerOnly ? "1" : "any";

    const parseQty = (val: string): number => {
      const n = isIntegerOnly ? parseInt(val) : parseFloat(val);
      return isNaN(n) ? 0 : n;
    };

    const availableLocations = ALL_LOCATIONS.filter(
      (l) =>
        !locations.some((loc) => loc.id === l.id) &&
        l.name.toLowerCase().includes(locationSearch.toLowerCase())
    );

    // In edit mode, On Hand is never editable. In create mode, editable only if lot tracking is NONE and not virtual bundle
    const isOnHandEditable = !virtualBundle && !isEditMode && !isLotTrackingEnabled;

    // Apply filters
    const filteredLocations = useMemo(() => {
      return locations.filter((loc) => {
        if (inventoryLocationSearch && !loc.name.toLowerCase().includes(inventoryLocationSearch.toLowerCase())) return false;
        if (sellableFilter === "available" && loc.available <= 0) return false;
        if (sellableFilter === "not_available" && loc.available > 0) return false;
        if (onHandFilter === "available" && loc.total <= 0) return false;
        if (onHandFilter === "not_available" && loc.total > 0) return false;
        return true;
      });
    }, [locations, sellableFilter, onHandFilter, inventoryLocationSearch]);

    const navigateToInventoryForLocation = (locationName: string) => {
      const params = new URLSearchParams();
      if (primaryIdentifier) params.set("identifier", primaryIdentifier);
      params.set("location", locationName);
      navigate(`/inventory?${params.toString()}`);
    };

    // Show stock columns only in edit mode
    const showStockBuckets = isEditMode;

    return (
      <div className="form-section animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="form-section-title mb-0">Inventory</h2>
            {baseUom && (
              <span className="text-xs text-muted-foreground font-normal">
                (in {BASE_UOM_OPTIONS.find(u => u.code === baseUom)?.name ?? baseUom})
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Search + Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search location..."
                value={inventoryLocationSearch}
                onChange={(e) => setInventoryLocationSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <Filter className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 space-y-3" align="end">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">Sellable</span>
                  <Select value={sellableFilter} onValueChange={(v) => setSellableFilter(v as SellableFilter)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="not_available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-foreground">On Hand</span>
                  <Select value={onHandFilter} onValueChange={(v) => setOnHandFilter(v as OnHandFilter)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="not_available">Not Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 ml-auto text-primary hover:text-primary/80 text-xs"
              onClick={() => navigate("/inventory")}
            >
              <History className="w-3.5 h-3.5" />
              View adjustment history
            </Button>
          </div>

          {locations.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">No locations added yet</p>
              <p className="text-xs text-muted-foreground">Add a location to start tracking inventory</p>
            </div>
          ) : isMobile ? (
            /* Mobile: Card-based layout */
            <div className="space-y-3">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  className="border border-border rounded-lg p-3 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {location.name}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => navigateToInventoryForLocation(location.name)}
                          className="ml-2 inline-flex text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteLocation(location.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {showStockBuckets && (
                      <>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Unavailable</label>
                          {virtualBundle ? (
                            <Input type="number" value={0} disabled className="h-9 w-full text-center text-sm bg-muted/50" />
                          ) : (
                            <InventoryManagementPopover
                              unavailableData={location.unavailableCategories}
                              sellable={location.available}
                              onUpdateInventory={(category, action, quantity) => {
                                handleInventoryUpdate(location.id, category, action, quantity);
                              }}
                            />
                          )}
                        </div>
                        {!virtualBundle && (
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Committed</label>
                            <Input
                              type="number"
                              min="0"
                              step={qtyStep}
                              value={location.committed}
                              readOnly
                              className="h-9 w-full text-center text-sm bg-muted/50"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Sellable</label>
                          <Input
                            type="number"
                            min="0"
                            step={qtyStep}
                            value={location.available}
                            readOnly
                            className="h-9 w-full text-center text-sm bg-muted/50"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">On Hand</label>
                      <Input
                        type="number"
                        min="0"
                        step={qtyStep}
                        value={location.total}
                        readOnly={!isOnHandEditable}
                        onChange={(e) => {
                          if (!isOnHandEditable) return;
                          const val = parseQty(e.target.value);
                          setLocations(prev => prev.map(loc => loc.id === location.id ? { ...loc, total: val, available: val } : loc));
                        }}
                        className={`h-9 w-full text-center text-sm ${!isOnHandEditable ? 'bg-muted/50' : ''}`}
                        disabled={virtualBundle}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Desktop: Table layout */
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      Locations
                    </th>
                    {showStockBuckets && (
                      <>
                        <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">
                          Unavailable
                        </th>
                        {!virtualBundle && (
                          <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">
                            Committed
                          </th>
                        )}
                        <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">
                          Sellable
                        </th>
                      </>
                    )}
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-28">
                      On Hand
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => (
                    <tr
                      key={location.id}
                      className="border-b border-border last:border-b-0 group"
                      onMouseEnter={() => setHoveredLocationId(location.id)}
                      onMouseLeave={() => setHoveredLocationId(null)}
                    >
                      <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                        {location.name}
                      </td>
                      {showStockBuckets && (
                        <>
                          <td className="px-4 py-3">
                            {virtualBundle ? (
                              <Input type="number" value={0} disabled className="h-9 w-full text-center text-sm bg-muted/50" />
                            ) : (
                              <InventoryManagementPopover
                                unavailableData={location.unavailableCategories}
                                sellable={location.available}
                                onUpdateInventory={(category, action, quantity) => {
                                  handleInventoryUpdate(location.id, category, action, quantity);
                                }}
                              />
                            )}
                          </td>
                          {!virtualBundle && (
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                step={qtyStep}
                                value={location.committed}
                                readOnly
                                className="h-9 w-full text-center text-sm bg-muted/50"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              step={qtyStep}
                              value={location.available}
                              readOnly
                              className="h-9 w-full text-center text-sm bg-muted/50"
                            />
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step={qtyStep}
                          value={location.total}
                          readOnly={!isOnHandEditable}
                          onChange={(e) => {
                            if (!isOnHandEditable) return;
                            const val = parseQty(e.target.value);
                            setLocations(prev => prev.map(loc => loc.id === location.id ? { ...loc, total: val, available: val } : loc));
                          }}
                          className={`h-9 w-full text-center text-sm ${!isOnHandEditable ? 'bg-muted/50' : ''}`}
                          disabled={virtualBundle}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isEditMode && (
                            <button
                              type="button"
                              onClick={() => navigateToInventoryForLocation(location.name)}
                              className="p-1 rounded hover:bg-muted text-primary hover:text-primary/80 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteLocation(location.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Location dropdown */}
          <Popover open={addLocationOpen} onOpenChange={setAddLocationOpen}>
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
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {availableLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No locations available</p>
                ) : (
                  availableLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => addLocation(loc.id, loc.name)}
                      className="w-full text-left px-2.5 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    >
                      {loc.name}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }
);

Inventory.displayName = "Inventory";
