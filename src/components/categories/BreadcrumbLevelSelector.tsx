import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight, ArrowLeft, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type BreadcrumbLevel } from "@/contexts/CategoriesContext";

// Re-export for convenience
export type { BreadcrumbLevel };

// Predefined breadcrumb level types
const LEVEL_TYPES = [
  { id: "brand", name: "Brand", description: "List of products belonging to a specific brand" },
  { id: "collection", name: "Collection", description: "A Page displaying 1 specific collection of items" },
  { id: "category", name: "Category", description: "Display all products under one category" },
];

// Sample values for each type (in real app, these would come from context/API)
const LEVEL_VALUES: Record<string, string[]> = {
  brand: ["Zara", "Adidas", "Louis Vuitton", "H&M", "Aditya Birla", "Nike", "Puma"],
  collection: ["Summer 2024", "Winter Collection", "New Arrivals", "Best Sellers"],
  category: ["Men", "Women", "Kids", "Accessories", "Home & Living"],
};

interface BreadcrumbLevelSelectorProps {
  levels: BreadcrumbLevel[];
  onLevelsChange: (levels: BreadcrumbLevel[]) => void;
}

export function BreadcrumbLevelSelector({ levels, onLevelsChange }: BreadcrumbLevelSelectorProps) {
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [drillDownType, setDrillDownType] = useState<{ index: number; typeId: string; typeName: string } | null>(null);

  const handleAddLevel = () => {
    const newLevel: BreadcrumbLevel = {
      id: Date.now().toString(),
      typeId: "",
      typeName: "",
      value: "",
    };
    onLevelsChange([...levels, newLevel]);
  };

  const handleRemoveLevel = (index: number) => {
    const newLevels = levels.filter((_, i) => i !== index);
    onLevelsChange(newLevels);
    setOpenDropdownIndex(null);
    setDrillDownType(null);
  };

  const handleSelectType = (index: number, typeId: string, typeName: string) => {
    // Check if this type has values to drill down
    const values = LEVEL_VALUES[typeId];
    if (values && values.length > 0) {
      setDrillDownType({ index, typeId, typeName });
    } else {
      // No drill-down, just select the type
      const newLevels = [...levels];
      newLevels[index] = {
        ...newLevels[index],
        typeId,
        typeName,
        value: "",
      };
      onLevelsChange(newLevels);
      setOpenDropdownIndex(null);
    }
  };

  const handleSelectValue = (index: number, value: string) => {
    if (!drillDownType) return;
    
    const newLevels = [...levels];
    newLevels[index] = {
      ...newLevels[index],
      typeId: drillDownType.typeId,
      typeName: drillDownType.typeName,
      value,
    };
    onLevelsChange(newLevels);
    setOpenDropdownIndex(null);
    setDrillDownType(null);
  };

  const handleBackToTypes = () => {
    setDrillDownType(null);
  };

  const getDisplayValue = (level: BreadcrumbLevel) => {
    if (level.value && level.typeName) {
      return `${level.value}/${level.typeName}`;
    }
    return "";
  };

  return (
    <div className="space-y-3">
      {levels.map((level, index) => (
        <div key={level.id} className="relative">
          <label className="text-sm text-muted-foreground mb-1.5 block">Levels</label>
          <div className="flex items-center gap-2">
            <div
              onClick={() => {
                if (openDropdownIndex === index) {
                  setOpenDropdownIndex(null);
                  setDrillDownType(null);
                } else {
                  setOpenDropdownIndex(index);
                  setDrillDownType(null);
                }
              }}
              className={cn(
                "flex-1 flex items-center justify-between h-10 px-3 rounded-md border cursor-pointer transition-colors",
                openDropdownIndex === index
                  ? "border-primary ring-2 ring-ring ring-offset-0"
                  : "border-input hover:border-muted-foreground/50"
              )}
            >
              <span className={cn(
                "text-sm",
                getDisplayValue(level) ? "text-foreground" : "text-muted-foreground"
              )}>
                {getDisplayValue(level) || "E.g: Brand"}
              </span>
              {openDropdownIndex === index ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            
            {levels.length > 1 && (
              <button
                onClick={() => handleRemoveLevel(index)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {openDropdownIndex === index && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {drillDownType && drillDownType.index === index ? (
                // Show values for selected type
                <div>
                  <button
                    onClick={handleBackToTypes}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-foreground bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {drillDownType.typeName}
                  </button>
                  <div className="max-h-60 overflow-y-auto">
                    {LEVEL_VALUES[drillDownType.typeId]?.map((value) => (
                      <button
                        key={value}
                        onClick={() => handleSelectValue(index, value)}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Show type options
                <div className="max-h-60 overflow-y-auto">
                  {LEVEL_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(index, type.id, type.name)}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 text-left hover:bg-primary/10 transition-colors",
                        level.typeId === type.id && "bg-primary/10"
                      )}
                    >
                      <div>
                        <div className={cn(
                          "text-sm font-medium",
                          level.typeId === type.id ? "text-primary" : "text-foreground"
                        )}>
                          {type.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {type.description}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 flex-shrink-0",
                        level.typeId === type.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleAddLevel}
        className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Another Level
      </button>
    </div>
  );
}
