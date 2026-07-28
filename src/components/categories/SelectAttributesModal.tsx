import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AttributeItem {
  id: string;
  name: string;
  type: string; // e.g., "Product Attribute", "SKU Variant Attribute", "Dimensions", etc.
}

interface SelectAttributesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableAttributes: AttributeItem[];
  selectedAttributeIds: string[];
  onSave: (selectedIds: string[]) => void;
}

export function SelectAttributesModal({
  open,
  onOpenChange,
  availableAttributes,
  selectedAttributeIds,
  onSave,
}: SelectAttributesModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedAttributeIds);

  // Reset local state when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSelectedIds(selectedAttributeIds);
      setSearchQuery("");
      setFilterType("all");
    }
    onOpenChange(isOpen);
  };

  // Get unique types for filter
  const attributeTypes = useMemo(() => {
    const types = new Set(availableAttributes.map((a) => a.type));
    return Array.from(types);
  }, [availableAttributes]);

  // Filter attributes
  const filteredAttributes = useMemo(() => {
    return availableAttributes.filter((attr) => {
      const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || attr.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [availableAttributes, searchQuery, filterType]);

  const toggleAttribute = (id: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setLocalSelectedIds([]);
  };

  const handleSelectAll = () => {
    setLocalSelectedIds(availableAttributes.map((a) => a.id));
  };

  const handleSave = () => {
    onSave(localSelectedIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Attribute</DialogTitle>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {attributeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attributes List */}
        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          <div className="divide-y divide-border">
            {filteredAttributes.map((attr) => (
              <label
                key={attr.id}
                className="flex items-start gap-3 py-4 cursor-pointer hover:bg-muted/50 -mx-6 px-6"
              >
                <Checkbox
                  checked={localSelectedIds.includes(attr.id)}
                  onCheckedChange={() => toggleAttribute(attr.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{attr.name}</p>
                  <p className="text-sm text-muted-foreground">{attr.type}</p>
                </div>
              </label>
            ))}
            {filteredAttributes.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No attributes found
              </div>
            )}
          </div>
        </div>

        {/* Selection Bar */}
        {localSelectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-foreground text-background rounded-lg px-4 py-2 -mx-2">
            <div className="flex items-center gap-2">
              <button onClick={handleClearSelection} className="p-1 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">
                {localSelectedIds.length} of {availableAttributes.length} Selected
              </span>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium hover:opacity-70"
            >
              Select All {availableAttributes.length} Attributes
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
