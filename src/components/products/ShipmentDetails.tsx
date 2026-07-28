import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, HelpCircle, Trash2, Pencil, Check, X, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ProductFormErrors } from "@/pages/CreateProduct";

interface Shipment {
  id: string;
  name: string;
  length: string;
  width: string;
  height: string;
  units: string;
  weight: string;
  weightUnit: string;
}

const HANDLING_CLASS_OPTIONS = ["Standard", "Fragile", "Hazardous", "Perishable"];
const STORAGE_CONDITION_OPTIONS = ["Dry", "Cool", "Frozen", "Refrigerated"];

export interface ShipmentDetailsData {
  shipments: Shipment[];
}

export interface ShipmentDetailsRef {
  getData: () => ShipmentDetailsData;
}

interface ShipmentDetailsProps {
  errors?: ProductFormErrors;
  formData?: {
    length: string;
    width: string;
    height: string;
    weight: string;
  };
  updateFormData?: (field: "length" | "width" | "height" | "weight", value: string) => void;
  isEditMode?: boolean;
}

export const ShipmentDetails = forwardRef<ShipmentDetailsRef, ShipmentDetailsProps>(
  ({ errors, formData, updateFormData, isEditMode }, ref) => {
    const [shipments, setShipments] = useState<Shipment[]>([
      {
        id: "1",
        name: "Shipment 1",
        length: formData?.length || "",
        width: formData?.width || "",
        height: formData?.height || "",
        units: "cm",
        weight: formData?.weight || "",
        weightUnit: "grams",
      },
    ]);
    const [editingShipmentId, setEditingShipmentId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [handlingClass, setHandlingClass] = useState("Standard");
    const [storageCondition, setStorageCondition] = useState("Dry");

    // Always collapsed in edit mode, expanded in create mode
    const [expanded, setExpanded] = useState(!isEditMode);

    // Sync first shipment dimensions with parent form
    useEffect(() => {
      const first = shipments[0];
      if (first) {
        updateFormData?.("length", first.length);
        updateFormData?.("width", first.width);
        updateFormData?.("height", first.height);
        updateFormData?.("weight", first.weight);
      }
    }, [shipments]);

    // Hydrate shipment from parent formData in edit mode (formData arrives async)
    useEffect(() => {
      if (formData?.length || formData?.width || formData?.height || formData?.weight) {
        setShipments(prev => {
          const first = prev[0];
          if (first && !first.length && !first.width && !first.height && !first.weight) {
            return [{ ...first, length: formData.length || "", width: formData.width || "", height: formData.height || "", weight: formData.weight || "" }, ...prev.slice(1)];
          }
          return prev;
        });
      }
    }, [formData?.length, formData?.width, formData?.height, formData?.weight]);

    useImperativeHandle(ref, () => ({
      getData: () => ({ shipments }),
    }));

    // Build collapsed summary for all shipments
    const renderCollapsedSummary = () => (
      <div className="space-y-3">
        {shipments.map((shipment, idx) => {
          const length = parseFloat(shipment.length) || 0;
          const width = parseFloat(shipment.width) || 0;
          const height = parseFloat(shipment.height) || 0;
          const deadWeight = parseFloat(shipment.weight) || 0;
          const volumetricWeight = length > 0 && width > 0 && height > 0 ? (length * width * height) / 5 : 0;
          const applicableWeight = Math.max(deadWeight, volumetricWeight);

          return (
            <div key={shipment.id} className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
              {shipments.length > 1 && (
                <div className="col-span-full">
                  <span className="text-xs font-medium text-foreground">{shipment.name}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Dimensions</span>
                <span className="text-sm font-medium">
                  {length > 0 && width > 0 && height > 0
                    ? `${shipment.length} × ${shipment.width} × ${shipment.height} ${shipment.units}`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Weight</span>
                <span className="text-sm font-medium">
                  {deadWeight > 0 ? `${shipment.weight} ${shipment.weightUnit}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Handling</span>
                <span className="text-sm font-medium">{handlingClass}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Storage</span>
                <span className="text-sm font-medium">{storageCondition}</span>
              </div>
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="form-section animate-fade-in">
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setExpanded(!expanded)}
        >
          <h2 className="form-section-title mb-0">Shipment Details</h2>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>

        {!expanded ? (
          <div className="mt-4">
            {renderCollapsedSummary()}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {shipments.map((shipment, index) => {
              const showHeader = shipments.length > 1;

              return (
                <div
                  key={shipment.id}
                  className={showHeader ? "p-4 border border-border rounded-lg" : ""}
                >
                  {showHeader && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {editingShipmentId === shipment.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 w-40"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setShipments((prev) => prev.map((s) => s.id === shipment.id ? { ...s, name: editingName || s.name } : s));
                              setEditingShipmentId(null);
                            }}>
                              <Check className="w-4 h-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingShipmentId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium">{shipment.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingShipmentId(shipment.id); setEditingName(shipment.name); }}>
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                      </div>
                      {shipments.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setShipments((prev) => prev.filter((s) => s.id !== shipment.id))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div data-field="length">
                      <label className="form-label">Length<span className="text-destructive">*</span></label>
                      <Input
                        placeholder=""
                        className={`h-10 ${index === 0 && errors?.length ? "border-destructive" : ""}`}
                        value={shipment.length}
                        onChange={(e) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, length: e.target.value } : s)))}
                      />
                      {index === 0 && errors?.length && <p className="text-xs text-destructive mt-1">{errors.length}</p>}
                    </div>
                    <div data-field="width">
                      <label className="form-label">Width<span className="text-destructive">*</span></label>
                      <Input
                        placeholder=""
                        className={`h-10 ${index === 0 && errors?.width ? "border-destructive" : ""}`}
                        value={shipment.width}
                        onChange={(e) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, width: e.target.value } : s)))}
                      />
                      {index === 0 && errors?.width && <p className="text-xs text-destructive mt-1">{errors.width}</p>}
                    </div>
                    <div data-field="height">
                      <label className="form-label">Height<span className="text-destructive">*</span></label>
                      <Input
                        placeholder=""
                        className={`h-10 ${index === 0 && errors?.height ? "border-destructive" : ""}`}
                        value={shipment.height}
                        onChange={(e) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, height: e.target.value } : s)))}
                      />
                      {index === 0 && errors?.height && <p className="text-xs text-destructive mt-1">{errors.height}</p>}
                    </div>
                    <div>
                      <label className="form-label">Units</label>
                      <Select value={shipment.units} onValueChange={(val) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, units: val } : s)))}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">CM</SelectItem>
                          <SelectItem value="in">IN</SelectItem>
                          <SelectItem value="m">M</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div data-field="weight">
                      <label className="form-label flex items-center gap-1">
                        Product Weight<span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger><HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent><p>Actual weight of the product including brand packaging.</p></TooltipContent>
                        </Tooltip>
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="0"
                          className={`flex-1 h-10 ${index === 0 && errors?.weight ? "border-destructive" : ""}`}
                          value={shipment.weight}
                          onChange={(e) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, weight: e.target.value } : s)))}
                        />
                        <Select value={shipment.weightUnit} onValueChange={(val) => setShipments((prev) => prev.map((s) => (s.id === shipment.id ? { ...s, weightUnit: val } : s)))}>
                          <SelectTrigger className="w-24 h-10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grams">grams</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="lbs">lbs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {index === 0 && errors?.weight && <p className="text-xs text-destructive mt-1">{errors.weight}</p>}
                    </div>
                  </div>

                  {/* Calculated Weights */}
                  {(() => {
                    const l = parseFloat(shipment.length) || 0;
                    const w = parseFloat(shipment.width) || 0;
                    const h = parseFloat(shipment.height) || 0;
                    const dw = parseFloat(shipment.weight) || 0;
                    const vw = (l * w * h) / 5;
                    const aw = Math.max(dw, vw);
                    if (!(l > 0 && w > 0 && h > 0)) return null;
                    return (
                      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Volumetric Weight:</span>
                          <span className="text-sm font-medium">{vw.toFixed(2)} {shipment.weightUnit}</span>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild><button type="button" className="inline-flex"><HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" /></button></TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs"><p className="font-medium mb-1">Volumetric Weight</p><p className="text-xs text-muted-foreground">(Length × Width × Height) / 5</p></TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Applicable Weight:</span>
                          <span className="text-sm font-medium text-primary">{aw.toFixed(2)} {shipment.weightUnit}</span>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild><button type="button" className="inline-flex"><HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-help" /></button></TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs"><p>Higher of volumetric or product weight, used for package suggestions and delivery fee calculation.</p></TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {shipments.length < 5 && (
              <button
                type="button"
                onClick={() => {
                  const newId = Date.now().toString();
                  const newNumber = shipments.length + 1;
                  setShipments((prev) => [...prev, { id: newId, name: `Shipment ${newNumber}`, length: "", width: "", height: "", units: "cm", weight: "", weightUnit: "grams" }]);
                }}
                className="flex items-center gap-1 text-primary text-sm font-medium hover:underline mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Shipment
              </button>
            )}

            {/* Handling Section */}
            <div className="border-t border-border pt-4 mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Handling</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Handling Class</label>
                  <Select value={handlingClass} onValueChange={setHandlingClass}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {HANDLING_CLASS_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="form-label">Storage Condition</label>
                  <Select value={storageCondition} onValueChange={setStorageCondition}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STORAGE_CONDITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ShipmentDetails.displayName = "ShipmentDetails";
