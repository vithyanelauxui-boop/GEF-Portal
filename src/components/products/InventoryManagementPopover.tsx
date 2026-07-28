import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface UnavailableCategories {
  damaged: number;
  lost: number;
  onHold: number;
  inTransit: number;
}

interface InventoryManagementPopoverProps {
  unavailableData: UnavailableCategories;
  sellable: number;
  onUpdateInventory: (
    category: keyof UnavailableCategories,
    action: "add" | "moveToSellable" | "delete",
    quantity: number
  ) => void;
}

type CategoryKey = keyof UnavailableCategories;

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  damaged: "Damaged",
  lost: "Lost",
  onHold: "On Hold",
  inTransit: "In Transit",
};

export function InventoryManagementPopover({
  unavailableData,
  sellable,
  onUpdateInventory,
}: InventoryManagementPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [action, setAction] = useState<"add" | "moveToSellable" | "delete">("add");
  const [quantity, setQuantity] = useState(0);

  const totalUnavailable = unavailableData.damaged + unavailableData.lost + unavailableData.onHold + unavailableData.inTransit;

  const handleCategoryClick = (category: CategoryKey) => {
    setSelectedCategory(category);
    setAction("add");
    setQuantity(0);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setQuantity(0);
  };

  const handleDone = () => {
    if (selectedCategory && quantity > 0) {
      onUpdateInventory(selectedCategory, action, quantity);
    }
    setSelectedCategory(null);
    setQuantity(0);
  };

  const handleCancel = () => {
    setSelectedCategory(null);
    setQuantity(0);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedCategory(null);
      setQuantity(0);
    }
  };

  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(0, q - 1));

  // Validate max quantity for certain actions
  const getMaxQuantity = () => {
    if (!selectedCategory) return Infinity;
    if (action === "moveToSellable" || action === "delete") {
      return unavailableData[selectedCategory];
    }
    return Infinity;
  };

  const maxQty = getMaxQuantity();
  const isQuantityValid = quantity <= maxQty;

  const getActionLabel = () => {
    switch (action) {
      case "add":
        return "Add Inventory";
      case "moveToSellable":
        return "Move to Sellable";
      case "delete":
        return "Delete Inventory";
      default:
        return "Add Inventory";
    }
  };

  const isMobile = useIsMobile();

  const triggerButton = (
    <button
      type="button"
      onClick={isMobile ? () => handleOpenChange(true) : undefined}
      className="h-9 w-full flex items-center justify-between px-3 border border-input rounded-md bg-card hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Unavailable inventory: ${totalUnavailable}. Click to manage`}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      <span className="text-sm">{totalUnavailable}</span>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      )}
    </button>
  );

  const content = (
    <>
      {!selectedCategory ? (
        <div>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">Unavailable Inventory</h3>
          </div>
          <div className="py-1">
            {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                aria-label={`${CATEGORY_LABELS[category]}: ${unavailableData[category]} items`}
              >
                <span className="text-sm">{CATEGORY_LABELS[category]}</span>
                <span className="text-sm text-primary">{unavailableData[category]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
            <button
              type="button"
              onClick={handleBack}
              className="p-1 hover:bg-muted rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to category list"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <h3 className="font-semibold text-sm">
              Add {CATEGORY_LABELS[selectedCategory]} Inventory
            </h3>
          </div>

          <div className="p-4 space-y-4">
            <Select value={action} onValueChange={(val) => setAction(val as typeof action)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue>{getActionLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Inventory</SelectItem>
                <SelectItem value="moveToSellable">Move to Sellable</SelectItem>
                <SelectItem value="delete">Delete Inventory</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Quantity</label>
              <div className="flex items-center border border-input rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={decrementQuantity}
                  disabled={quantity <= 0}
                  className="p-2.5 hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 text-center py-2 text-sm outline-none bg-transparent focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Quantity"
                  min="0"
                  max={maxQty === Infinity ? undefined : maxQty}
                />
                <button
                  type="button"
                  onClick={incrementQuantity}
                  disabled={quantity >= maxQty}
                  className="p-2.5 hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {!isQuantityValid && (
                <p className="text-xs text-destructive mt-1">
                  Maximum available: {maxQty}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDone}
              disabled={quantity <= 0 || !isQuantityValid}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={isOpen} onOpenChange={handleOpenChange}>
          <DrawerContent className="pb-6">
            {content}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {content}
      </PopoverContent>
    </Popover>
  );
}
