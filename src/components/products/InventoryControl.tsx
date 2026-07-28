import { useState, forwardRef, useImperativeHandle } from "react";
import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface InventoryControlData {
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
}

export interface InventoryControlRef {
  getData: () => InventoryControlData;
}

interface InventoryControlProps {
  initialData?: Partial<InventoryControlData>;
  isEditMode?: boolean;
  onLotTrackingModeChange?: (mode: string) => void;
}

const defaultData: InventoryControlData = {
  inventoryTracked: true,
  incomingQCRequired: false,
  serialTrackingMode: "NONE",
  serialAttributeCount: 1,
  lotTrackingMode: "NONE",
  rotationMethod: "FIFO",
  shelfLifeRequired: false,
  shelfLifeDuration: "",
  shelfLifeUnit: "Days",
  manufacturingDateRequired: false,
  expiryDateRequired: false,
  minShelfLifeAtInbound: "",
  minShelfLifeAtOutbound: "",
  dateRequirement: "NONE",
  shelfLifeThresholdsEnabled: false,
};

export const InventoryControl = forwardRef<InventoryControlRef, InventoryControlProps>(
  ({ initialData, isEditMode, onLotTrackingModeChange }, ref) => {
    const [data, setData] = useState<InventoryControlData>({ ...defaultData, ...initialData });
    const [expanded, setExpanded] = useState(!isEditMode);

    useImperativeHandle(ref, () => ({
      getData: () => data,
    }));

    const update = (field: string, value: any) => {
      setData((prev) => {
        const newState = { ...prev, [field]: value };

        if (field === "lotTrackingMode") {
          onLotTrackingModeChange?.(value);
        }

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

        if (field === "lotTrackingMode" && value !== "NONE") {
          if (!newState.rotationMethod || newState.rotationMethod === "FIFO") {
            newState.dateRequirement = "NONE";
          }
        }

        if (field === "rotationMethod" && value === "FEFO") {
          if (!["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(newState.dateRequirement)) {
            newState.dateRequirement = "EXPIRY_DATE";
          }
          newState.expiryDateRequired = true;
          newState.manufacturingDateRequired = newState.dateRequirement === "EXPIRY_MFG_DATE";
          if (newState.lotTrackingMode === "NONE") newState.lotTrackingMode = "INBOUND_ONLY";
        }

        if (field === "rotationMethod" && value === "FMFO") {
          if (!["MFG_DATE", "EXPIRY_MFG_DATE"].includes(newState.dateRequirement)) {
            newState.dateRequirement = "MFG_DATE";
          }
          newState.manufacturingDateRequired = true;
          newState.expiryDateRequired = newState.dateRequirement === "EXPIRY_MFG_DATE";
          if (newState.lotTrackingMode === "NONE") newState.lotTrackingMode = "INBOUND_ONLY";
        }

        if (field === "rotationMethod" && (value === "FIFO" || value === "LIFO")) {
          newState.dateRequirement = "NONE";
          newState.expiryDateRequired = false;
          newState.manufacturingDateRequired = false;
          newState.shelfLifeRequired = false;
          newState.shelfLifeThresholdsEnabled = false;
          newState.shelfLifeDuration = "";
          newState.shelfLifeUnit = "Days";
        }

        if (field === "dateRequirement") {
          newState.expiryDateRequired = ["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(value);
          newState.manufacturingDateRequired = ["MFG_DATE", "EXPIRY_MFG_DATE"].includes(value);
          if (value === "NONE") {
            newState.shelfLifeRequired = false;
            newState.shelfLifeThresholdsEnabled = false;
            newState.shelfLifeDuration = "";
            newState.shelfLifeUnit = "Days";
          }
          if (newState.rotationMethod === "FEFO" && !["EXPIRY_DATE", "EXPIRY_MFG_DATE"].includes(value)) {
            newState.dateRequirement = "EXPIRY_DATE";
            newState.expiryDateRequired = true;
            newState.manufacturingDateRequired = false;
          }
          if (newState.rotationMethod === "FMFO" && !["MFG_DATE", "EXPIRY_MFG_DATE"].includes(value)) {
            newState.dateRequirement = "MFG_DATE";
            newState.manufacturingDateRequired = true;
            newState.expiryDateRequired = false;
          }
        }

        if (field === "shelfLifeThresholdsEnabled" && value === false) {
          newState.minShelfLifeAtInbound = "";
          newState.minShelfLifeAtOutbound = "";
        }

        return newState;
      });
    };

    const serialLabel = { NONE: "None", PER_UNIT: "Per Unit" }[data.serialTrackingMode] || data.serialTrackingMode;
    const lotLabel = { NONE: "None", INBOUND_ONLY: "Inbound Only", END_TO_END: "End to End" }[data.lotTrackingMode] || data.lotTrackingMode;

    return (
      <div className="form-section animate-fade-in">
        <button
          type="button"
          className="flex items-center justify-between w-full"
          onClick={() => setExpanded(!expanded)}
        >
          <h2 className="form-section-title mb-0">Inventory Control</h2>
          <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>

        {!expanded ? (
          /* Collapsed summary */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mt-4">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Inventory Tracked</span>
              <span className="text-sm font-medium">{data.inventoryTracked ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Incoming QC Required</span>
              <span className="text-sm font-medium">{data.incomingQCRequired ? "Yes" : "No"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Serial Tracking</span>
              <span className="text-sm font-medium">{serialLabel}</span>
            </div>
            {data.serialTrackingMode === "PER_UNIT" && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Serial Attribute Count</span>
                <span className="text-sm font-medium">{data.serialAttributeCount}</span>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Lot Tracking</span>
              <span className="text-sm font-medium">{lotLabel}</span>
            </div>
            {data.lotTrackingMode !== "NONE" && (
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Rotation Method</span>
                <span className="text-sm font-medium">{data.rotationMethod}</span>
              </div>
            )}
          </div>
        ) : (
          /* Expanded form */
          <div className="mt-4 space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Inventory Tracked</label>
                <Switch checked={data.inventoryTracked} onCheckedChange={(checked) => update("inventoryTracked", checked)} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Incoming QC Required</label>
                <Switch checked={data.incomingQCRequired} onCheckedChange={(checked) => update("incomingQCRequired", checked)} />
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
                    <Select value={data.serialTrackingMode} onValueChange={(val) => update("serialTrackingMode", val)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="PER_UNIT">Per Unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {data.serialTrackingMode === "PER_UNIT" && (
                    <div>
                      <label className="form-label">Serial Attribute Count</label>
                      <Input type="number" min="1" value={data.serialAttributeCount} onChange={(e) => update("serialAttributeCount", Math.max(1, parseInt(e.target.value) || 1))} className="h-10" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">Lot Tracking Mode</label>
                  <Select value={data.lotTrackingMode} onValueChange={(val) => update("lotTrackingMode", val)}>
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
            {data.lotTrackingMode !== "NONE" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Rotation Method</label>
                    <Select value={data.rotationMethod} onValueChange={(val) => update("rotationMethod", val)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIFO">FIFO</SelectItem>
                        <SelectItem value="LIFO">LIFO</SelectItem>
                        <SelectItem value="FEFO">FEFO</SelectItem>
                        <SelectItem value="FMFO">FMFO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(data.rotationMethod === "FEFO" || data.rotationMethod === "FMFO") && (
                    <div>
                      <label className="form-label">Date Requirements</label>
                      <Select value={data.dateRequirement} onValueChange={(val) => update("dateRequirement", val)}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {data.rotationMethod === "FEFO" ? (
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

                  {(data.rotationMethod === "FEFO" || data.rotationMethod === "FMFO") && (
                    <div className="space-y-4 pl-0 md:pl-4 border-l-0 md:border-l-2 md:border-primary/20">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Shelf Life Thresholds</label>
                        <Switch checked={data.shelfLifeThresholdsEnabled} onCheckedChange={(checked) => update("shelfLifeThresholdsEnabled", checked)} />
                      </div>

                      {data.shelfLifeThresholdsEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Min Shelf Life at Inbound<span className="text-destructive">*</span></label>
                            <Input type="number" min="1" value={data.minShelfLifeAtInbound} onChange={(e) => update("minShelfLifeAtInbound", e.target.value)} placeholder="0" className={cn("h-10", (!data.minShelfLifeAtInbound || parseFloat(data.minShelfLifeAtInbound) <= 0) && "border-destructive")} />
                          </div>
                          <div>
                            <label className="form-label">Min Shelf Life at Outbound<span className="text-destructive">*</span></label>
                            <Input type="number" min="1" value={data.minShelfLifeAtOutbound} onChange={(e) => update("minShelfLifeAtOutbound", e.target.value)} placeholder="0" className={cn("h-10", (!data.minShelfLifeAtOutbound || parseFloat(data.minShelfLifeAtOutbound) <= 0) && "border-destructive")} />
                          </div>
                        </div>
                      )}

                      {(() => {
                        const shelfMandatory = !!(data.shelfLifeThresholdsEnabled && data.dateRequirement === "MFG_DATE");
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label">Shelf Life Duration{shelfMandatory && <span className="text-destructive">*</span>}</label>
                              <Input type="number" min="1" value={data.shelfLifeDuration} onChange={(e) => update("shelfLifeDuration", e.target.value)} placeholder="0" className={cn("h-10", shelfMandatory && (!data.shelfLifeDuration || parseFloat(data.shelfLifeDuration) <= 0) && "border-destructive")} />
                            </div>
                            <div>
                              <label className="form-label">Shelf Life Unit{shelfMandatory && <span className="text-destructive">*</span>}</label>
                              <Select value={data.shelfLifeUnit} onValueChange={(val) => update("shelfLifeUnit", val)}>
                                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Days">Days</SelectItem>
                                  <SelectItem value="Hours">Hours</SelectItem>
                                  <SelectItem value="Minutes">Minutes</SelectItem>
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
          </div>
        )}
      </div>
    );
  }
);

InventoryControl.displayName = "InventoryControl";
