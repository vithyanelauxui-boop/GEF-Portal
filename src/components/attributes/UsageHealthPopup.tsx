import { X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Attribute } from "@/contexts/AttributesContext";
import { Product } from "@/contexts/ProductsContext";

interface UsageHealthData {
  totalUsage: number;
  validCount: number;
  invalidCount: number;
  dataTypeMismatches: Record<string, number>; // actualType -> count
  multiValueMismatches: number;
  expectedDataType: string;
  expectedMultiValue: boolean;
}

export function computeUsageHealth(
  attribute: Attribute,
  products: Product[]
): UsageHealthData {
  let totalUsage = 0;
  let validCount = 0;
  let invalidCount = 0;
  const dataTypeMismatches: Record<string, number> = {};
  let multiValueMismatches = 0;

  for (const product of products) {
    const prodAttr = product.attributes?.find((a) => a.id === attribute.id);
    if (!prodAttr) continue;

    totalUsage++;

    const typeMatch = prodAttr.dataType === attribute.dataType;
    const isMultiValued = prodAttr.values.length > 1;
    const multiMatch = attribute.acceptMultipleValues ? true : !isMultiValued;

    if (typeMatch && multiMatch) {
      validCount++;
    } else {
      invalidCount++;
      if (!typeMatch) {
        const actualType = prodAttr.dataType || "unknown";
        dataTypeMismatches[actualType] = (dataTypeMismatches[actualType] || 0) + 1;
      }
      if (!multiMatch) {
        multiValueMismatches++;
      }
    }
  }

  return {
    totalUsage,
    validCount,
    invalidCount,
    dataTypeMismatches,
    multiValueMismatches,
    expectedDataType: attribute.dataType,
    expectedMultiValue: attribute.acceptMultipleValues,
  };
}

const dataTypeLabels: Record<string, string> = {
  integer: "Integer",
  decimal: "Decimal",
  single_line_text: "Single line text",
  multi_line_text: "Multi line text",
  dropdown: "Dropdown",
  dimensions: "Dimensions",
  weight: "Weight",
  volume: "Volume",
  color: "Color",
  date: "Date",
  true_or_false: "True or False",
  html: "HTML",
  json: "JSON",
  duration: "Duration",
  file: "File",
  url: "URL",
};

interface UsageHealthPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: Attribute;
  health: UsageHealthData;
}

export function UsageHealthPopup({
  open,
  onOpenChange,
  attribute,
  health,
}: UsageHealthPopupProps) {
  const hasDataTypeMismatch = Object.keys(health.dataTypeMismatches).length > 0;
  const hasMultiValueMismatch = health.multiValueMismatches > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Usage Health – {attribute.displayName || attribute.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-semibold text-foreground">{health.totalUsage}</p>
              <p className="text-xs text-muted-foreground mt-1">Total usage</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-semibold text-green-600">{health.validCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Matches config</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <p className="text-2xl font-semibold text-destructive">{health.invalidCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Doesn't match</p>
            </div>
          </div>

          {/* Data type mismatch breakdown */}
          {hasDataTypeMismatch && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium text-foreground">Data type mismatch</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Expected: <span className="font-medium text-foreground">{dataTypeLabels[health.expectedDataType] || health.expectedDataType}</span>
              </p>
              <div className="space-y-1 pt-1">
                <p className="text-xs text-muted-foreground">Found:</p>
                {Object.entries(health.dataTypeMismatches).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm pl-2">
                    <span className="text-muted-foreground">{dataTypeLabels[type] || type}</span>
                    <span className="font-mono text-xs text-foreground">({count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-value mismatch breakdown */}
          {hasMultiValueMismatch && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium text-foreground">Multi-value mismatch</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Expected: <span className="font-medium text-foreground">{health.expectedMultiValue ? "Multiple values" : "Single value"}</span>
              </p>
              <p className="text-sm text-muted-foreground pl-2">
                Found: {health.expectedMultiValue ? "Single value" : "Multi value"}{" "}
                <span className="font-mono text-xs text-foreground">({health.multiValueMismatches})</span>
              </p>
            </div>
          )}

          {/* All good state */}
          {!hasDataTypeMismatch && !hasMultiValueMismatch && health.totalUsage > 0 && (
            <div className="rounded-lg border border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">All usages match the configured data type and value settings.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
