import { useState, useEffect } from "react";
import { BASE_UOM_OPTIONS, BaseUomCode } from "@/contexts/ProductsContext";
import { Plus, MoreVertical, HelpCircle, Trash2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ProductFormErrors } from "@/pages/CreateProduct";

interface Identifier {
  id: string;
  type: string;
  value: string;
  isPrimary: boolean;
}

const IDENTIFIER_TYPES = [
  { value: "sku", label: "SKU" },
  { value: "ean", label: "EAN" },
  { value: "upc", label: "UPC" },
  { value: "isbn", label: "ISBN" },
  { value: "alu", label: "ALU" },
  { value: "custom", label: "Custom" },
];

interface PackageDetailsProps {
  errors?: ProductFormErrors;
  formData?: {
    sku: string;
  };
  updateFormData?: (field: "sku", value: string) => void;
  baseUom?: BaseUomCode;
  onBaseUomChange?: (uom: BaseUomCode) => void;
}

export function PackageDetails({ errors, formData, updateFormData, baseUom, onBaseUomChange }: PackageDetailsProps) {
  const [identifiers, setIdentifiers] = useState<Identifier[]>([
    { id: "1", type: "sku", value: formData?.sku || "", isPrimary: true },
  ]);
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  // Sync primary SKU with parent form
  useEffect(() => {
    const primaryIdentifier = identifiers.find(i => i.isPrimary && i.type === "sku");
    if (primaryIdentifier) {
      updateFormData?.("sku", primaryIdentifier.value);
    }
  }, [identifiers]);

  // Hydrate identifiers from parent formData in edit mode (formData arrives async)
  useEffect(() => {
    if (formData?.sku) {
      setIdentifiers(prev => {
        const primary = prev.find(i => i.isPrimary);
        if (primary && !primary.value && formData.sku) {
          return prev.map(i => i.isPrimary ? { ...i, value: formData.sku } : i);
        }
        return prev;
      });
    }
  }, [formData?.sku]);

  const addIdentifier = () => {
    const newId = Date.now().toString();
    setIdentifiers((prev) => [
      ...prev,
      { id: newId, type: "sku", value: "", isPrimary: false },
    ]);
  };

  const updateIdentifier = (id: string, field: keyof Identifier, value: string | boolean) => {
    setIdentifiers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const updateCustomLabel = (id: string, label: string) => {
    setCustomLabels((prev) => ({ ...prev, [id]: label }));
  };

  const makePrimary = (id: string) => {
    setIdentifiers((prev) =>
      prev.map((item) => ({ ...item, isPrimary: item.id === id }))
    );
  };

  const deleteIdentifier = (id: string) => {
    setIdentifiers((prev) => {
      const deletedItem = prev.find((item) => item.id === id);
      const filtered = prev.filter((item) => item.id !== id);
      if (deletedItem?.isPrimary && filtered.length > 0) {
        const nextPrimary = filtered.find((item) => item.type !== "custom");
        if (nextPrimary) {
          nextPrimary.isPrimary = true;
        }
      }
      return filtered;
    });
  };

  const canDeletePrimary = (id: string) => {
    const identifier = identifiers.find((item) => item.id === id);
    if (!identifier?.isPrimary) return true;
    const otherNonCustom = identifiers.filter(
      (item) => item.id !== id && item.type !== "custom"
    );
    return otherNonCustom.length > 0;
  };

  const getTypeLabel = (type: string, id: string) => {
    if (type === "custom") {
      return customLabels[id] || "Custom";
    }
    return IDENTIFIER_TYPES.find((t) => t.value === type)?.label || type.toUpperCase();
  };

  return (
    <div className="form-section animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="form-section-title mb-0">Identification Details</h2>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            Base UOM
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Unit in which this product is stocked, priced, and sold. Inventory quantities and prices are calculated per this unit.</p>
              </TooltipContent>
            </Tooltip>
          </span>
          <Select value={baseUom || "EA"} onValueChange={(val) => onBaseUomChange?.(val as BaseUomCode)}>
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
      </div>

      <div className="space-y-5">
        {/* Identifiers */}
        <div>
          <label className="form-label flex items-center gap-1">
            Identifier
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Unique identifier for your product</p>
              </TooltipContent>
            </Tooltip>
          </label>

          <div className="space-y-3">
            {identifiers.map((identifier) => (
              <div key={identifier.id} className="flex flex-wrap md:flex-nowrap items-center gap-2" data-field={identifier.isPrimary && identifier.type === "sku" ? "sku" : undefined}>
                {/* Type selector */}
                <div className="w-24 md:w-28 shrink-0">
                  <Select
                    value={identifier.type}
                    onValueChange={(val) => updateIdentifier(identifier.id, "type", val)}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTIFIER_TYPES.filter((type) => 
                        !(identifier.isPrimary && type.value === "custom")
                      ).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Value input */}
                <div className="flex-1 min-w-0 relative">
                  {identifier.type === "custom" ? (
                    <div className="flex h-10 w-full rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                      <input
                        type="text"
                        placeholder="Label"
                        value={customLabels[identifier.id] || ""}
                        onChange={(e) => updateCustomLabel(identifier.id, e.target.value)}
                        className="w-16 md:w-20 px-3 py-2 text-sm bg-muted/50 border-r border-input outline-none placeholder:text-muted-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Enter value"
                        value={identifier.value}
                        onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                        className="flex-1 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground bg-transparent"
                      />
                    </div>
                  ) : (
                    <Input
                      placeholder="Enter value"
                      value={identifier.value}
                      onChange={(e) => updateIdentifier(identifier.id, "value", e.target.value)}
                      className={`h-10 ${identifier.isPrimary && identifier.type === "sku" && errors?.sku ? 'border-destructive' : ''}`}
                    />
                  )}
                </div>
                {identifier.isPrimary && identifier.type === "sku" && errors?.sku && (
                  <p className="text-xs text-destructive mt-1">{errors.sku}</p>
                )}

                {/* Kebab menu */}
                {(() => {
                  const canMakePrimary = !identifier.isPrimary && identifier.type !== "custom";
                  const canDelete = canDeletePrimary(identifier.id);
                  const hasActions = canMakePrimary || canDelete;
                  
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 shrink-0"
                          disabled={!hasActions}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canMakePrimary && (
                          <DropdownMenuItem onClick={() => makePrimary(identifier.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            Make Primary
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
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
                  );
                })()}

                {/* Primary badge */}
                <div className="hidden md:block w-16 shrink-0">
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
    </div>
  );
}
