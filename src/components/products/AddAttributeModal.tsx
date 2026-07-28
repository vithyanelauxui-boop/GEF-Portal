import { useState, useEffect, useMemo } from "react";
import { X, Plus, HelpCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/contexts/ProductsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Attribute } from "@/contexts/AttributesContext";

const DATA_TYPES = [
  { value: "single_line_text", label: "Single Line Text" },
  { value: "multi_line_text", label: "Multi Line Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "integer", label: "Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "dimensions", label: "Dimensions" },
  { value: "volume", label: "Volume" },
  { value: "weight", label: "Weight" },
  { value: "duration", label: "Duration" },
  { value: "date", label: "Date" },
  { value: "true_or_false", label: "True or False" },
  { value: "color", label: "Color" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "file", label: "File" },
  { value: "url", label: "URL" },
] as const;

export type DataType = typeof DATA_TYPES[number]["value"];

const FILE_TYPE_OPTIONS = [
  "jpeg", "jpg", "png", "gif", "mp4", "pdf", "doc", "docx", "xls", "xlsx", "csv", "tsv",
];

interface ColorValue {
  id: string;
  hex: string;
  name: string;
}

interface AddAttributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (attribute: {
    name: string;
    description?: string;
    dataType: string;
    validation: Record<string, unknown>;
    isFilterable: boolean;
    acceptMultipleValues: boolean;
  }) => void;
  editAttribute?: Attribute | null;
  onUpdate?: (id: string, updates: {
    displayName?: string;
    description?: string;
    validation: Record<string, unknown>;
    isFilterable: boolean;
    acceptMultipleValues: boolean;
  }) => void;
}

export function AddAttributeModal({ open, onOpenChange, onSave, editAttribute, onUpdate }: AddAttributeModalProps) {
  const { products } = useProducts();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<DataType | "">("");
  const [isFilterable, setIsFilterable] = useState(true);
  const [acceptMultipleValues, setAcceptMultipleValues] = useState(true);

  // Validation toggle
  const [enableValidation, setEnableValidation] = useState(false);

  // Validation states
  const [enablePredefined, setEnablePredefined] = useState(false);
  const [availableValues, setAvailableValues] = useState<string[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [newValueInput, setNewValueInput] = useState("");
  const [minCharCount, setMinCharCount] = useState("");
  const [maxCharCount, setMaxCharCount] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState("mm");
  const [selectedDimensionUnits, setSelectedDimensionUnits] = useState<string[]>([]);
  const [selectedVolumeUnits, setSelectedVolumeUnits] = useState<string[]>([]);
  const [volumeUnit, setVolumeUnit] = useState("ml");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [selectedDurationUnits, setSelectedDurationUnits] = useState<string[]>([]);
  const [durationUnit, setDurationUnit] = useState("minute");
  const [unitValidation, setUnitValidation] = useState<Record<string, { minValue?: string; maxValue?: string }>>({});
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [defaultBoolValue, setDefaultBoolValue] = useState("true");
  const [enableColorPresets, setEnableColorPresets] = useState(true);
  const [colorValues, setColorValues] = useState<ColorValue[]>([{ id: "1", hex: "#000000", name: "" }]);
  const [htmlCode, setHtmlCode] = useState("<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Heading</h1>\n  </body>\n</html>");
  const [jsonCode, setJsonCode] = useState('{\n  "key": "value"\n}');

  // File type validation
  const [allowedFileTypes, setAllowedFileTypes] = useState<string[]>([]);
  const [maxFileSize, setMaxFileSize] = useState("");

  // URL validation
  const [whitelistedDomains, setWhitelistedDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState("");

  const isEditing = !!editAttribute;

  // Compute per-value usage counts for dropdown/color attributes
  const valueUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!editAttribute) return map;
    for (const product of products) {
      const pa = product.attributes?.find(a => a.id === editAttribute.id);
      if (pa) {
        for (const v of pa.values) {
          map.set(v.value, (map.get(v.value) || 0) + 1);
        }
      }
    }
    return map;
  }, [editAttribute, products]);

  // Populate form when editing
  useEffect(() => {
    if (editAttribute && open) {
      setName(editAttribute.displayName || editAttribute.name);
      setDescription(editAttribute.description || "");
      setDataType(editAttribute.dataType as DataType);
      setIsFilterable(editAttribute.isFilterable);
      setAcceptMultipleValues(editAttribute.acceptMultipleValues ?? (editAttribute.dataType !== "true_or_false"));

      const v = editAttribute.validation || {};
      const hasValidation = Object.keys(v).length > 0;
      setEnableValidation(hasValidation);

      // Restore validation state based on type
      if (v.predefinedValues) {
        setEnablePredefined(true);
        setAvailableValues(v.predefinedValues as string[]);
        setSelectedValues(v.predefinedValues as string[]);
      }
      if (v.minCharCount !== undefined) setMinCharCount(String(v.minCharCount));
      if (v.maxCharCount !== undefined) setMaxCharCount(String(v.maxCharCount));
      if (v.minValue !== undefined) setMinValue(String(v.minValue));
      if (v.maxValue !== undefined) setMaxValue(String(v.maxValue));
      if (v.unit) {
        if (editAttribute.dataType === "dimensions") setDimensionUnit(v.unit as string);
        if (editAttribute.dataType === "volume") setVolumeUnit(v.unit as string);
        if (editAttribute.dataType === "weight") setWeightUnit(v.unit as string);
        if (editAttribute.dataType === "duration") setDurationUnit(v.unit as string);
      }
      if (v.units) {
        if (editAttribute.dataType === "dimensions") setSelectedDimensionUnits(v.units as string[]);
        if (editAttribute.dataType === "volume") setSelectedVolumeUnits(v.units as string[]);
        if (editAttribute.dataType === "duration") setSelectedDurationUnits(v.units as string[]);
      }
      if (v.unitValidation) {
        const uv = v.unitValidation as Record<string, { minValue?: number; maxValue?: number }>;
        const restored: Record<string, { minValue?: string; maxValue?: string }> = {};
        Object.entries(uv).forEach(([unit, vals]) => {
          restored[unit] = {
            minValue: vals.minValue !== undefined ? String(vals.minValue) : undefined,
            maxValue: vals.maxValue !== undefined ? String(vals.maxValue) : undefined,
          };
        });
        setUnitValidation(restored);
      }
      if (v.fromDate) setFromDate(new Date(v.fromDate as string));
      if (v.toDate) setToDate(new Date(v.toDate as string));
      if (v.defaultValue !== undefined) setDefaultBoolValue(v.defaultValue ? "true" : "false");
      if (v.enablePresets !== undefined) setEnableColorPresets(v.enablePresets as boolean);
      if (v.colors) setColorValues((v.colors as Array<{hex:string;name:string}>).map((c, i) => ({ id: String(i), ...c })));
      if (v.code && editAttribute.dataType === "html") setHtmlCode(v.code as string);
      if (v.code && editAttribute.dataType === "json") setJsonCode(v.code as string);
      if (v.allowedFileTypes) setAllowedFileTypes(v.allowedFileTypes as string[]);
      if (v.maxFileSize !== undefined) setMaxFileSize(String(v.maxFileSize));
      if (v.whitelistedDomains) setWhitelistedDomains(v.whitelistedDomains as string[]);
    }
  }, [editAttribute, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setDataType("");
    setIsFilterable(true);
    setAcceptMultipleValues(true);
    setEnableValidation(false);
    setEnablePredefined(false);
    setAvailableValues([]);
    setSelectedValues([]);
    setNewValueInput("");
    setMinCharCount("");
    setMaxCharCount("");
    setMinValue("");
    setMaxValue("");
    setDimensionUnit("mm");
    setSelectedDimensionUnits([]);
    setSelectedVolumeUnits([]);
    setVolumeUnit("ml");
    setWeightUnit("kg");
    setSelectedDurationUnits([]);
    setDurationUnit("minute");
    setUnitValidation({});
    setFromDate(undefined);
    setToDate(undefined);
    setDefaultBoolValue("true");
    setEnableColorPresets(true);
    setColorValues([{ id: "1", hex: "#000000", name: "" }]);
    setHtmlCode("<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Heading</h1>\n  </body>\n</html>");
    setJsonCode('{\n  "key": "value"\n}');
    setAllowedFileTypes([]);
    setMaxFileSize("");
    setWhitelistedDomains([]);
    setNewDomainInput("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const buildValidation = (): Record<string, unknown> => {
    const validation: Record<string, unknown> = {};

    switch (dataType) {
      case "single_line_text":
        if (enableValidation) {
          if (minCharCount) validation.minCharCount = parseInt(minCharCount);
          if (maxCharCount) validation.maxCharCount = parseInt(maxCharCount);
        }
        break;
      case "dropdown":
        validation.predefinedValues = availableValues.filter(v => v.trim());
        break;
      case "multi_line_text":
        if (enableValidation) {
          if (minCharCount) validation.minCharCount = parseInt(minCharCount);
          if (maxCharCount) validation.maxCharCount = parseInt(maxCharCount);
        }
        break;
      case "integer":
      case "decimal":
        if (enableValidation) {
          if (minValue) validation.minValue = parseFloat(minValue);
          if (maxValue) validation.maxValue = parseFloat(maxValue);
        }
        break;
      case "dimensions":
        validation.units = selectedDimensionUnits;
        if (enableValidation) {
          const uv: Record<string, { minValue?: number; maxValue?: number }> = {};
          selectedDimensionUnits.forEach(u => {
            const v = unitValidation[u];
            if (v?.minValue || v?.maxValue) {
              uv[u] = {};
              if (v.minValue) uv[u].minValue = parseFloat(v.minValue);
              if (v.maxValue) uv[u].maxValue = parseFloat(v.maxValue);
            }
          });
          if (Object.keys(uv).length > 0) validation.unitValidation = uv;
        }
        break;
      case "volume":
        validation.units = selectedVolumeUnits;
        if (enableValidation) {
          const uv: Record<string, { minValue?: number; maxValue?: number }> = {};
          selectedVolumeUnits.forEach(u => {
            const v = unitValidation[u];
            if (v?.minValue || v?.maxValue) {
              uv[u] = {};
              if (v.minValue) uv[u].minValue = parseFloat(v.minValue);
              if (v.maxValue) uv[u].maxValue = parseFloat(v.maxValue);
            }
          });
          if (Object.keys(uv).length > 0) validation.unitValidation = uv;
        }
        break;
      case "weight":
        if (enableValidation) {
          if (minValue) validation.minValue = parseFloat(minValue);
          if (maxValue) validation.maxValue = parseFloat(maxValue);
        }
        validation.unit = weightUnit;
        break;
      case "duration":
        validation.units = selectedDurationUnits;
        if (enableValidation) {
          const uv: Record<string, { minValue?: number; maxValue?: number }> = {};
          selectedDurationUnits.forEach(u => {
            const v = unitValidation[u];
            if (v?.minValue || v?.maxValue) {
              uv[u] = {};
              if (v.minValue) uv[u].minValue = parseFloat(v.minValue);
              if (v.maxValue) uv[u].maxValue = parseFloat(v.maxValue);
            }
          });
          if (Object.keys(uv).length > 0) validation.unitValidation = uv;
        }
        break;
      case "date":
        if (enableValidation) {
          if (fromDate) validation.fromDate = fromDate;
          if (toDate) validation.toDate = toDate;
        }
        break;
      case "true_or_false":
        validation.defaultValue = defaultBoolValue === "true";
        break;
      case "color":
        validation.enablePresets = enableColorPresets;
        if (enableColorPresets) {
          validation.colors = colorValues.filter(c => c.name).map(c => ({ hex: c.hex, name: c.name }));
        }
        break;
      case "html":
        validation.code = htmlCode;
        break;
      case "json":
        validation.code = jsonCode;
        break;
      case "file":
        if (enableValidation) {
          if (allowedFileTypes.length > 0) validation.allowedFileTypes = allowedFileTypes;
          if (maxFileSize) validation.maxFileSize = parseFloat(maxFileSize);
        }
        break;
      case "url":
        if (enableValidation) {
          if (whitelistedDomains.length > 0) validation.whitelistedDomains = whitelistedDomains;
        }
        break;
    }

    return validation;
  };

  const handleSave = () => {
    if (!name || !dataType) return;

    // Check for duplicate values
    if (dataType === "dropdown") {
      const trimmed = availableValues.map(v => v.trim().toLowerCase()).filter(Boolean);
      if (new Set(trimmed).size !== trimmed.length) return;
    }
    if (dataType === "color" && enableColorPresets) {
      const names = colorValues.map(c => c.name.trim().toLowerCase()).filter(Boolean);
      if (new Set(names).size !== names.length) return;
    }

    const validation = buildValidation();

    if (isEditing && editAttribute && onUpdate) {
      onUpdate(editAttribute.id, {
        displayName: name !== editAttribute.name ? name : editAttribute.displayName,
        description: description || undefined,
        validation,
        isFilterable,
        acceptMultipleValues,
      });
    } else {
      onSave({
        name,
        description: description || undefined,
        dataType,
        validation,
        isFilterable,
        acceptMultipleValues,
      });
    }
    handleClose();
  };

  const addColorValue = () => {
    setColorValues([...colorValues, { id: Date.now().toString(), hex: "#000000", name: "" }]);
  };

  const updateColorValue = (id: string, updates: Partial<ColorValue>) => {
    setColorValues(colorValues.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const toggleFileType = (ft: string) => {
    setAllowedFileTypes(prev =>
      prev.includes(ft) ? prev.filter(t => t !== ft) : [...prev, ft]
    );
  };

  const addDomain = () => {
    const trimmed = newDomainInput.trim();
    if (trimmed && !whitelistedDomains.includes(trimmed)) {
      setWhitelistedDomains([...whitelistedDomains, trimmed]);
      setNewDomainInput("");
    }
  };

  const removeDomain = (domain: string) => {
    setWhitelistedDomains(whitelistedDomains.filter(d => d !== domain));
  };

  // Types that always show their specific config (not behind validation toggle)
  const alwaysShowConfig = ["true_or_false", "color", "html", "json", "dropdown", "dimensions", "volume", "duration"];
  // Types that have validation behind toggle
  const hasValidationConfig = ["single_line_text", "multi_line_text", "integer", "decimal", "dimensions", "volume", "weight", "duration", "date", "file", "url"];

  const DIMENSION_UNITS = [
    { value: "mm", label: "mm" }, { value: "cm", label: "cm" }, { value: "m", label: "m" }, { value: "in", label: "in" }, { value: "ft", label: "ft" },
  ];
  const VOLUME_UNITS = [
    { value: "ml", label: "ml" }, { value: "l", label: "L" }, { value: "gal", label: "gal" }, { value: "oz", label: "oz" },
  ];
  const DURATION_UNITS = [
    { value: "second", label: "Second" }, { value: "minute", label: "Minute" }, { value: "hour", label: "Hour" },
    { value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "year", label: "Year" },
  ];

  const toggleUnit = (unit: string, selected: string[], setSelected: (v: string[]) => void) => {
    setSelected(
      selected.includes(unit) ? selected.filter(u => u !== unit) : [...selected, unit]
    );
  };

  const renderUnitChips = (
    units: { value: string; label: string }[],
    selected: string[],
    setSelected: (v: string[]) => void,
    label: string
  ) => (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Allowed {label} Units*</h3>
        <p className="text-xs text-muted-foreground">Select at least one unit</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {units.map((u) => (
          <button
            key={u.value}
            type="button"
            onClick={() => toggleUnit(u.value, selected, setSelected)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              selected.includes(u.value)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-foreground hover:bg-muted"
            }`}
          >
            {u.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderValidationDetails = () => {
    if (!dataType) return null;

    return (
      <div className="space-y-4 pt-4 border-t border-border">
        {/* Always-shown config for specific types */}
        {dataType === "true_or_false" && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Default Value</Label>
            <RadioGroup value={defaultBoolValue} onValueChange={setDefaultBoolValue}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true" className="font-normal">True</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="false" id="false" />
                <Label htmlFor="false" className="font-normal">False</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {dataType === "color" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enableColorPresets"
                checked={enableColorPresets}
                onCheckedChange={(checked) => setEnableColorPresets(checked === true)}
              />
              <Label htmlFor="enableColorPresets" className="text-sm">
                Enable predefined color values for this attribute
              </Label>
            </div>
            {enableColorPresets ? (
              <div className="space-y-3">
                {colorValues.map((cv) => {
                  const usage = valueUsageMap.get(cv.name) || 0;
                  const isDuplicate = cv.name.trim() && colorValues.filter(c => c.name.trim().toLowerCase() === cv.name.trim().toLowerCase()).length > 1;
                  return (
                    <div key={cv.id} className="space-y-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={cv.hex}
                          onChange={(e) => updateColorValue(cv.id, { hex: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-border"
                        />
                        <Input
                          placeholder="Black"
                          value={cv.name}
                          onChange={(e) => updateColorValue(cv.id, { name: e.target.value })}
                          className={`flex-1 ${isDuplicate ? 'border-destructive' : ''}`}
                        />
                        {isEditing && cv.name.trim() && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{usage} {usage > 1 ? 'products' : 'product'}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setColorValues(colorValues.filter(c => c.id !== cv.id))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {isDuplicate && (
                        <p className="text-xs text-destructive ml-[52px]">Duplicate colour name</p>
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={addColorValue} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                  <Plus className="w-4 h-4" /> Add Color Value
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs text-primary">i</span>
                </div>
                Preset colors are disabled — you can define your own wherever this attribute appears.
              </div>
            )}
          </div>
        )}

        {/* Dropdown: Always show predefined values config */}
        {dataType === "dropdown" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Predefined Values</h3>
              <p className="text-xs text-muted-foreground">Define the options available in the dropdown</p>
            </div>
            <div className="space-y-3">
              {availableValues.map((val, index) => {
                const usage = valueUsageMap.get(val) || 0;
                const isDuplicate = val.trim() && availableValues.filter(v => v.trim().toLowerCase() === val.trim().toLowerCase()).length > 1;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input value={val} onChange={(e) => {
                        const nv = [...availableValues]; nv[index] = e.target.value; setAvailableValues(nv);
                      }} placeholder="E.g: Option 1" className={`flex-1 ${isDuplicate ? 'border-destructive' : ''}`} />
                      {isEditing && val.trim() && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{usage} {usage > 1 ? 'products' : 'product'}</span>
                      )}
                      <button type="button" onClick={() => setAvailableValues(availableValues.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {isDuplicate && (
                      <p className="text-xs text-destructive">Duplicate value</p>
                    )}
                  </div>
                );
              })}
              {availableValues.length === 0 && (
                <Input value={newValueInput} onChange={(e) => setNewValueInput(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter" && newValueInput.trim()) { e.preventDefault(); setAvailableValues([newValueInput.trim()]); setNewValueInput(""); }
                }} placeholder="E.g: Small" />
              )}
              <button type="button" onClick={() => {
                if (availableValues.length === 0 && newValueInput.trim()) { setAvailableValues([newValueInput.trim()]); setNewValueInput(""); }
                else { setAvailableValues([...availableValues, ""]); }
              }} className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                <Plus className="w-4 h-4" /> Add Value
              </button>
            </div>
          </div>
        )}

        {/* Dimensions: unit selection */}
        {dataType === "dimensions" && renderUnitChips(DIMENSION_UNITS, selectedDimensionUnits, setSelectedDimensionUnits, "Dimension")}

        {/* Volume: unit selection */}
        {dataType === "volume" && renderUnitChips(VOLUME_UNITS, selectedVolumeUnits, setSelectedVolumeUnits, "Volume")}

        {/* Duration: unit selection */}
        {dataType === "duration" && renderUnitChips(DURATION_UNITS, selectedDurationUnits, setSelectedDurationUnits, "Duration")}

        {dataType === "html" && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Default HTML Template</Label>
            <Textarea
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              className="font-mono text-sm min-h-[200px] bg-muted/30"
              placeholder="Enter HTML code..."
            />
          </div>
        )}

        {dataType === "json" && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Default JSON Template</Label>
            <Textarea
              value={jsonCode}
              onChange={(e) => setJsonCode(e.target.value)}
              className="font-mono text-sm min-h-[200px] bg-muted/30"
              placeholder='{"key": "value"}'
            />
          </div>
        )}

        {/* Validation toggle for types that support it */}
        {hasValidationConfig.includes(dataType) && (
          <>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-sm font-medium">Validation</p>
                <p className="text-xs text-muted-foreground">Turn on to configure validation rules</p>
              </div>
              <Switch checked={enableValidation} onCheckedChange={setEnableValidation} />
            </div>

            {enableValidation && renderValidationConfig()}
          </>
        )}

        {/* Accept multiple values - shown for all except boolean */}
        {dataType !== "true_or_false" && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium">Accept multiple values</p>
              <p className="text-xs text-muted-foreground">Allow multiple values for this attribute</p>
            </div>
            <Switch checked={acceptMultipleValues} onCheckedChange={setAcceptMultipleValues} />
          </div>
        )}

        {/* Make filterable toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            <p className="text-sm font-medium">Make this attribute filterable</p>
            <p className="text-xs text-muted-foreground">
              Allows narrowing of product results
            </p>
          </div>
          <Switch checked={isFilterable} onCheckedChange={setIsFilterable} />
        </div>
      </div>
    );
  };

  const renderValidationConfig = () => {
    switch (dataType) {
      case "single_line_text":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Minimum character count</Label>
              <Input type="number" value={minCharCount} onChange={(e) => setMinCharCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Maximum character count</Label>
              <Input type="number" placeholder="75" value={maxCharCount} onChange={(e) => setMaxCharCount(e.target.value)} className="bg-muted/50" />
            </div>
          </div>
        );

      case "multi_line_text":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Minimum character count</Label>
              <Input type="number" value={minCharCount} onChange={(e) => setMinCharCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Maximum character count</Label>
              <Input type="number" placeholder="500" value={maxCharCount} onChange={(e) => setMaxCharCount(e.target.value)} className="bg-muted/50" />
            </div>
          </div>
        );

      case "integer":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Minimum Value</Label>
              <Input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Maximum Value</Label>
              <Input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
            </div>
          </div>
        );

      case "decimal":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Minimum Value</Label>
              <Input type="number" step="0.1" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Maximum Value</Label>
              <Input type="number" step="0.1" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
            </div>
          </div>
        );

      case "dimensions":
        return renderPerUnitValidation(selectedDimensionUnits, DIMENSION_UNITS);

      case "volume":
        return renderPerUnitValidation(selectedVolumeUnits, VOLUME_UNITS);

      case "weight":
        return renderUnitValidation(weightUnit, setWeightUnit, [
          { value: "kg", label: "kg" }, { value: "g", label: "g" }, { value: "lb", label: "lb" }, { value: "oz", label: "oz" },
        ]);

      case "duration":
        return renderPerUnitValidation(selectedDurationUnits, DURATION_UNITS);

      case "date":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "MMM dd, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      case "file":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Allowed File Types</Label>
              <div className="flex flex-wrap gap-2">
                {FILE_TYPE_OPTIONS.map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => toggleFileType(ft)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      allowedFileTypes.includes(ft)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    .{ft}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Max File Size (MB)</Label>
              <Input type="number" min="1" placeholder="E.g: 10" value={maxFileSize} onChange={(e) => setMaxFileSize(e.target.value)} />
            </div>
          </div>
        );

      case "url":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Domain Whitelisting</Label>
              <p className="text-xs text-muted-foreground">Only allow URLs from these domains</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                placeholder="E.g: example.com"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDomain(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addDomain} disabled={!newDomainInput.trim()}>
                Add
              </Button>
            </div>
            {whitelistedDomains.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {whitelistedDomains.map((domain) => (
                  <span key={domain} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm">
                    {domain}
                    <button type="button" onClick={() => removeDomain(domain)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderUnitValidation = (
    unit: string,
    setUnit: (v: string) => void,
    units: { value: string; label: string }[]
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Unit</Label>
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Minimum Value</Label>
          <Input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Maximum Value</Label>
          <Input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderPerUnitValidation = (
    selectedUnits: string[],
    allUnits: { value: string; label: string }[]
  ) => {
    if (selectedUnits.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic">Select at least one unit above to configure validation per unit.</p>
      );
    }
    return (
      <div className="space-y-4">
        {selectedUnits.map((unitKey) => {
          const unitLabel = allUnits.find(u => u.value === unitKey)?.label || unitKey;
          const uv = unitValidation[unitKey] || {};
          return (
            <div key={unitKey} className="space-y-2">
              <Label className="text-sm font-medium">{unitLabel}</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min Value</Label>
                  <Input
                    type="number"
                    value={uv.minValue || ""}
                    onChange={(e) => setUnitValidation(prev => ({ ...prev, [unitKey]: { ...prev[unitKey], minValue: e.target.value } }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max Value</Label>
                  <Input
                    type="number"
                    value={uv.maxValue || ""}
                    onChange={(e) => setUnitValidation(prev => ({ ...prev, [unitKey]: { ...prev[unitKey], maxValue: e.target.value } }))}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const multiUnitTypes = ["dimensions", "volume", "duration"] as const;
  const getSelectedUnits = (dt: string) => {
    if (dt === "dimensions") return selectedDimensionUnits;
    if (dt === "volume") return selectedVolumeUnits;
    if (dt === "duration") return selectedDurationUnits;
    return [];
  };

  const canSave = name.trim() && dataType
    && (dataType !== "dropdown" || availableValues.filter(v => v.trim()).length > 0)
    && (!multiUnitTypes.includes(dataType as any) || getSelectedUnits(dataType).length > 0);

  const isMobile = useIsMobile();

  const title = isEditing ? "Edit Attribute" : dataType ? "Create Attributes" : "Add Attribute";

  const formContent = (
    <>
      <div className="space-y-4 py-4">
        {isEditing && editAttribute && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Slug</Label>
            <Input value={editAttribute.name} disabled className="opacity-60 font-mono text-sm" />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-1">
              {isEditing ? "Display Name" : "Name*"}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={-1} className="cursor-help"><HelpCircle className="w-3.5 h-3.5" /></span>
                  </TooltipTrigger>
                  <TooltipContent>{isEditing ? "Display name can be changed" : "Name of the attribute"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              placeholder="E.g: Storage"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data Type*</Label>
            <Select value={dataType} onValueChange={(val) => setDataType(val as DataType)} disabled={isEditing}>
              <SelectTrigger className={isEditing ? "opacity-60" : ""}>
                <SelectValue placeholder="E.g: Single Line Input" />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description (optional) */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-1">
            Description
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={-1} className="cursor-help"><HelpCircle className="w-3.5 h-3.5" /></span>
                </TooltipTrigger>
                <TooltipContent>Shown as a tooltip on the product form and as notes in bulk import templates</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Textarea
            placeholder="E.g: Internal storage capacity of the device in GB"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px] resize-none"
            rows={2}
          />
        </div>

        {renderValidationDetails()}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave}>{isEditing ? "Update" : "Save"}</Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
