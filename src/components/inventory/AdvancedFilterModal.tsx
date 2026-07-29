import React, { useState, useEffect } from "react";
import { Plus, Trash2, Copy, Save, BookOpen, Globe, Lock, Loader2, Check, Search, X as XIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// ─── Searchable multi-select for text field values ────────────
function TextFieldMultiSelect({
  options,
  selectedValues,
  onChange,
}: {
  options: string[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [popOpen, setPopOpen] = useState(false);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  return (
    <Popover open={popOpen} onOpenChange={setPopOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex-1 flex items-center justify-between h-9 px-3 rounded-md border border-input bg-card text-xs text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
        >
          <span className="truncate text-muted-foreground">
            {selectedValues.length === 0
              ? "Select values…"
              : `${selectedValues.length} selected`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-60 p-0 z-50 bg-popover border border-border shadow-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>
        {/* Selected tags */}
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-border">
            {selectedValues.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-primary/10 text-primary text-[11px]"
              >
                {v}
                <button onClick={() => toggle(v)}>
                  <XIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Options */}
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="text-xs text-muted-foreground px-3 py-2">No options</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors text-left"
              >
                <Checkbox
                  checked={selectedValues.includes(opt)}
                  className="h-3.5 w-3.5 pointer-events-none"
                />
                <span className="truncate">{opt}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Field definitions ────────────────────────────────────────
type FieldType = "text" | "number" | "date";

interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
}

const FILTER_FIELDS: FieldDef[] = [
  { id: "location", label: "Location", type: "text" },
  { id: "primaryIdentifier", label: "Primary Identifier", type: "text" },
  { id: "sku", label: "SKU", type: "text" },
  { id: "barcode", label: "Barcode", type: "text" },
  { id: "customCode", label: "Custom Code", type: "text" },
  { id: "baseUom", label: "Base UOM", type: "text" },
  { id: "variant", label: "Variant", type: "text" },
  { id: "productType", label: "Product Type", type: "text" },
  { id: "onHand", label: "On Hand", type: "number" },
  { id: "sellable", label: "Sellable", type: "number" },
  { id: "committed", label: "Committed", type: "number" },
  { id: "damaged", label: "Damaged", type: "number" },
  { id: "sellingPrice", label: "Selling Price", type: "number" },
  { id: "compareAt", label: "Full Price", type: "number" },
  { id: "costPrice", label: "Cost Price", type: "number" },
  { id: "transferPrice", label: "Transfer Price", type: "number" },
  { id: "discount", label: "Discount", type: "number" },
  { id: "margin", label: "Margin", type: "number" },
  { id: "transferMargin", label: "Transfer Margin", type: "number" },
  { id: "createdBy", label: "Created By", type: "text" },
  { id: "updatedBy", label: "Updated By", type: "text" },
  { id: "createdAt", label: "Created At", type: "date" },
  { id: "updatedAt", label: "Updated At", type: "date" },
];

const TEXT_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "in", label: "In" },
  { value: "not_in", label: "Not In" },
];

const NUMBER_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "between", label: "Between" },
];

const DATE_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "greater_than", label: "After" },
  { value: "less_than", label: "Before" },
  { value: "between", label: "Between" },
];

function getOperators(type: FieldType) {
  switch (type) {
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

// ─── Types ────────────────────────────────────────────────────
export interface AdvancedFilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2: string;
}

export interface FilterGroup {
  id: string;
  conditions: AdvancedFilterCondition[];
}

/** Groups are OR'd together; conditions within a group are AND'd */
export interface AdvancedFilterState {
  groups: FilterGroup[];
}

// Keep backward compat for InventoryPage — count total conditions
export function countAdvancedConditions(state: AdvancedFilterState): number {
  return state.groups.reduce((sum, g) => sum + g.conditions.length, 0);
}

export function emptyAdvancedFilter(): AdvancedFilterState {
  return { groups: [] };
}

export interface SavedFilterView {
  id: string;
  name: string;
  is_public: boolean;
  filters: AdvancedFilterState;
  created_at: string;
}

const FILTER_VIEWS_STORAGE_KEY = "gef-portal.saved_filter_views";

export function getStoredFilterViews(): SavedFilterView[] {
  try {
    const raw = localStorage.getItem(FILTER_VIEWS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFilterView[]) : [];
  } catch {
    return [];
  }
}

function setStoredFilterViews(views: SavedFilterView[]) {
  localStorage.setItem(FILTER_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

interface AdvancedFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterState: AdvancedFilterState;
  onApply: (state: AdvancedFilterState) => void;
  savedViews: SavedFilterView[];
  onViewsChanged: () => void;
  /** Unique values per text field id for searchable dropdowns */
  fieldOptions: Record<string, string[]>;
}

let counter = 0;
function uid() {
  counter += 1;
  return `af-${counter}`;
}

function newCondition(): AdvancedFilterCondition {
  return {
    id: uid(),
    field: FILTER_FIELDS[0].id,
    operator: "equals",
    value: "",
    value2: "",
  };
}

function newGroup(): FilterGroup {
  return { id: uid(), conditions: [newCondition()] };
}

export function AdvancedFilterModal({
  open,
  onOpenChange,
  filterState,
  onApply,
  savedViews,
  onViewsChanged,
  fieldOptions,
}: AdvancedFilterModalProps) {
  const isMobile = useIsMobile();
  const [groups, setGroups] = useState<FilterGroup[]>(
    filterState.groups.length > 0 ? filterState.groups : [newGroup()]
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);

  React.useEffect(() => {
    if (open) {
      setGroups(
        filterState.groups.length > 0 ? filterState.groups : [newGroup()]
      );
    }
  }, [open, filterState]);

  // ─── Group operations ──────────────────────────────────────
  const addGroup = () => setGroups((prev) => [...prev, newGroup()]);

  const duplicateGroup = (groupId: string) => {
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.id === groupId);
      if (idx === -1) return prev;
      const original = prev[idx];
      const copy: FilterGroup = {
        id: uid(),
        conditions: original.conditions.map((c) => ({ ...c, id: uid() })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const removeGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // ─── Condition operations ──────────────────────────────────
  const addCondition = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, newCondition()] }
          : g
      )
    );
  };

  const updateCondition = (
    groupId: string,
    condId: string,
    patch: Partial<AdvancedFilterCondition>
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === condId ? { ...c, ...patch } : c
              ),
            }
          : g
      )
    );
  };

  const removeCondition = (groupId: string, condId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((c) => c.id !== condId) }
          : g
      )
    );
  };

  const handleApply = () => {
    // Remove empty conditions and empty groups
    const cleaned: FilterGroup[] = groups
      .map((g) => ({
        ...g,
        conditions: g.conditions.filter((c) => c.value.trim() !== ""),
      }))
      .filter((g) => g.conditions.length > 0);
    onApply({ groups: cleaned });
    onOpenChange(false);
  };

  const handleClear = () => {
    onApply(emptyAdvancedFilter());
    onOpenChange(false);
  };

  // ─── Render a single condition row ─────────────────────────
  const renderCondition = (
    group: FilterGroup,
    cond: AdvancedFilterCondition,
    condIdx: number
  ) => {
    const fieldDef = FILTER_FIELDS.find((f) => f.id === cond.field);
    const operators = getOperators(fieldDef?.type ?? "text");
    const isBetween = cond.operator === "between";
    const isTextField = fieldDef?.type === "text";
    const inputType =
      fieldDef?.type === "number"
        ? "number"
        : fieldDef?.type === "date"
        ? "date"
        : "text";

    // For text fields, parse comma-separated values
    const selectedValues = isTextField
      ? cond.value.split("|||").filter(Boolean)
      : [];
    const options = isTextField ? (fieldOptions[cond.field] ?? []) : [];

    return (
      <div key={cond.id} className="space-y-2">
        {condIdx > 0 && (
          <span className="text-xs font-medium text-muted-foreground pl-1">
            and
          </span>
        )}
        <div
          className={
            isMobile ? "flex flex-col gap-2" : "flex items-start gap-2"
          }
        >
          <Select
            value={cond.field}
            onValueChange={(v) => {
              const fd = FILTER_FIELDS.find((f) => f.id === v);
              const ops = getOperators(fd?.type ?? "text");
              updateCondition(group.id, cond.id, {
                field: v,
                operator: ops[0].value,
                value: "",
                value2: "",
              });
            }}
          >
            <SelectTrigger
              className={isMobile ? "h-9 text-xs" : "w-40 h-9 text-xs"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_FIELDS.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={cond.operator}
            onValueChange={(v) =>
              updateCondition(group.id, cond.id, {
                operator: v,
                value: "",
                value2: "",
              })
            }
          >
            <SelectTrigger
              className={isMobile ? "h-9 text-xs" : "w-36 h-9 text-xs"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem
                  key={op.value}
                  value={op.value}
                  className="text-xs"
                >
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 flex-1">
            {isTextField ? (
              <TextFieldMultiSelect
                options={options}
                selectedValues={selectedValues}
                onChange={(vals) =>
                  updateCondition(group.id, cond.id, {
                    value: vals.join("|||"),
                  })
                }
              />
            ) : (
              <>
                <Input
                  type={inputType}
                  placeholder="Value"
                  value={cond.value}
                  onChange={(e) =>
                    updateCondition(group.id, cond.id, {
                      value: e.target.value,
                    })
                  }
                  className="flex-1 h-9 text-xs"
                />
                {isBetween && (
                  <>
                    <span className="text-xs text-muted-foreground">and</span>
                    <Input
                      type={inputType}
                      placeholder="Value"
                      value={cond.value2}
                      onChange={(e) =>
                        updateCondition(group.id, cond.id, {
                          value2: e.target.value,
                        })
                      }
                      className="flex-1 h-9 text-xs"
                    />
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => removeCondition(group.id, cond.id)}
              disabled={group.conditions.length === 1}
              className="p-1.5 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Body ──────────────────────────────────────────────────
  const filterBody = (
    <div className="flex-1 overflow-y-auto space-y-4 py-3 px-1">
      {groups.map((group, groupIdx) => (
        <div key={group.id}>
          {/* OR connector between groups */}
          {groupIdx > 0 && (
            <div className="flex items-center gap-3 py-3 pl-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Group card */}
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
            {/* Group header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Group {groupIdx + 1}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => duplicateGroup(group.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Duplicate group"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeGroup(group.id)}
                  disabled={groups.length === 1}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conditions */}
            {group.conditions.map((cond, condIdx) =>
              renderCondition(group, cond, condIdx)
            )}

            {/* Add filter */}
            <button
              type="button"
              onClick={() => addCondition(group.id)}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add filter
            </button>
          </div>
        </div>
      ))}

      {/* Add group */}
      <div className="flex items-center gap-3 pt-1 pl-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          or
        </span>
        <button
          type="button"
          onClick={addGroup}
          className="inline-flex items-center gap-1.5 text-xs border border-dashed border-border rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add filter group
        </button>
      </div>
    </div>
  );

  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    setSaving(true);
    try {
      const cleaned: FilterGroup[] = groups
        .map((g) => ({
          ...g,
          conditions: g.conditions.filter((c) => c.value.trim() !== ""),
        }))
        .filter((g) => g.conditions.length > 0);

      const newView: SavedFilterView = {
        id: crypto.randomUUID(),
        name: viewName.trim(),
        is_public: isPublic,
        filters: { groups: cleaned },
        created_at: new Date().toISOString(),
      };
      setStoredFilterViews([...getStoredFilterViews(), newView]);

      toast.success("View saved successfully");
      setViewName("");
      setIsPublic(false);
      setSaveDialogOpen(false);
      onViewsChanged();
    } catch (err: any) {
      toast.error("Failed to save view: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadView = (view: SavedFilterView) => {
    setGroups(view.filters.groups.length > 0 ? view.filters.groups : [newGroup()]);
    setLoadMenuOpen(false);
    toast.success(`Loaded view "${view.name}"`);
  };

  const handleDeleteView = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStoredFilterViews(getStoredFilterViews().filter((v) => v.id !== viewId));
    toast.success("View deleted");
    onViewsChanged();
  };

  const footerContent = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button variant="ghost" size="sm" onClick={handleClear}>
        Clear All
      </Button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          className="gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          Save as View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleApply}>
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const savedViewsBar = savedViews.length > 0 ? (
    <div className="px-5 py-2 border-b border-border">
      <div className="flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground font-medium flex-shrink-0">Saved Views:</span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {savedViews.map((view) => (
            <button
              key={view.id}
              onClick={() => handleLoadView(view)}
              className="group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border border-border bg-card hover:bg-muted transition-colors flex-shrink-0"
            >
              {view.is_public ? (
                <Globe className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
              <span>{view.name}</span>
              <button
                onClick={(e) => handleDeleteView(view.id, e)}
                className="ml-0.5 p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  const saveDialog = (
    <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Save Filter View</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="view-name" className="text-sm">View Name</Label>
            <Input
              id="view-name"
              placeholder="e.g. Low Stock Items"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              className="h-9"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="view-visibility" className="text-sm">Visible to everyone</Label>
              <p className="text-xs text-muted-foreground">Make this view available to all team members</p>
            </div>
            <Switch
              id="view-visibility"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSaveView} disabled={!viewName.trim() || saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="text-base">Advanced Filters</DrawerTitle>
            </DrawerHeader>
            {savedViewsBar}
            {filterBody}
            <DrawerFooter>{footerContent}</DrawerFooter>
          </DrawerContent>
        </Drawer>
        {saveDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sm:max-w-lg w-full flex flex-col p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-base">Advanced Filters</SheetTitle>
          </SheetHeader>
          {savedViewsBar}
          <div className="flex-1 overflow-y-auto px-5">{filterBody}</div>
          <SheetFooter className="px-6 py-4 border-t border-border">
            {footerContent}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {saveDialog}
    </>
  );
}