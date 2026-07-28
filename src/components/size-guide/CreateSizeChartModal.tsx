import { useState, useEffect } from "react";
import { X, Plus, Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { SizeChart, SizeChartColumn, SizeChartRow, ColumnDataType, DimensionUnit } from "@/contexts/SizeGuidesContext";

interface CreateSizeChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (chart: SizeChart) => void;
  initialChart?: SizeChart | null;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function createDefaultColumns(): SizeChartColumn[] {
  return [
    { id: generateId(), header: "", dataType: "text" },
    { id: generateId(), header: "", dataType: "text" },
  ];
}

function createDefaultRow(columns: SizeChartColumn[]): SizeChartRow {
  const values: Record<string, string> = {};
  columns.forEach((col) => { values[col.id] = ""; });
  return { id: generateId(), values };
}

const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: "cm", label: "cm" },
  { value: "inches", label: "inches" },
  { value: "mm", label: "mm" },
  { value: "m", label: "m" },
  { value: "ft", label: "ft" },
  { value: "yd", label: "yd" },
];

export function CreateSizeChartModal({ open, onOpenChange, onSave, initialChart }: CreateSizeChartModalProps) {
  const isMobile = useIsMobile();
  const [unit, setUnit] = useState<"cm" | "inches">(initialChart?.unit || "cm");
  const [columns, setColumns] = useState<SizeChartColumn[]>(
    initialChart?.columns?.length ? initialChart.columns : createDefaultColumns()
  );
  const [rows, setRows] = useState<SizeChartRow[]>(
    initialChart?.rows?.length ? initialChart.rows : [createDefaultRow(createDefaultColumns())]
  );
  const [description, setDescription] = useState(initialChart?.description || "");
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialChart?.mediaUrl || null);

  useEffect(() => {
    if (open) {
      setUnit(initialChart?.unit || "cm");
      const cols = initialChart?.columns?.length ? initialChart.columns : createDefaultColumns();
      setColumns(cols);
      setRows(initialChart?.rows?.length ? initialChart.rows : [createDefaultRow(cols)]);
      setDescription(initialChart?.description || "");
      setMediaUrl(initialChart?.mediaUrl || null);
    }
  }, [open]);

  const addColumn = () => {
    const newCol: SizeChartColumn = { id: generateId(), header: "", dataType: "text" };
    setColumns((prev) => [...prev, newCol]);
    setRows((prev) => prev.map((row) => ({ ...row, values: { ...row.values, [newCol.id]: "" } })));
  };

  const removeColumn = (colId: string) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    setRows((prev) => prev.map((row) => {
      const newValues = { ...row.values };
      delete newValues[colId];
      return { ...row, values: newValues };
    }));
  };

  const updateColumnHeader = (colId: string, header: string) => {
    setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, header } : c));
  };

  const updateColumnDataType = (colId: string, dataType: ColumnDataType) => {
    setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, dataType, dimensionUnit: dataType === "dimension" ? (c.dimensionUnit || "cm") : undefined } : c));
  };

  const updateColumnDimensionUnit = (colId: string, dimensionUnit: DimensionUnit) => {
    setColumns((prev) => prev.map((c) => c.id === colId ? { ...c, dimensionUnit } : c));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createDefaultRow(columns)]);
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const updateCellValue = (rowId: string, colId: string, value: string) => {
    setRows((prev) => prev.map((r) =>
      r.id === rowId ? { ...r, values: { ...r.values, [colId]: value } } : r
    ));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => setMediaUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = () => {
    onSave({ unit, columns, rows, description, mediaUrl });
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
        <h2 className="text-lg font-bold text-foreground">Create Size Chart</h2>
        <button onClick={() => onOpenChange(false)} className="p-1 rounded-sm hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">
        {/* Unit selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm font-medium text-foreground">All measurements are in</span>
          <Select value={unit} onValueChange={(v) => setUnit(v as "cm" | "inches")}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">cm</SelectItem>
              <SelectItem value="inches">inches</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Size Chart Grid */}
        <div className="bg-muted/30 rounded-lg border border-border p-4 mb-0">
          <div className="flex items-start">
            {/* Scrollable columns area */}
            <div className="flex-1 overflow-x-auto -mx-1 px-1">
              <div className="inline-flex gap-4">
                {/* Row delete column spacer - only show when rows > 1 */}
                {rows.length > 1 && (
                  <div className="flex flex-col gap-2.5 w-[32px] shrink-0">
                    {/* Spacers for column header area: delete btn + data type + unit (conditional) + header */}
                    <div className="h-[30px]" /> {/* delete col btn */}
                    <div className="h-9" /> {/* data type */}
                    <div className="h-9" /> {/* header */}
                    {/* Row delete buttons */}
                    {rows.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => removeRow(row.id)}
                        className="h-9 w-9 flex items-center justify-center border border-border rounded hover:bg-muted transition-colors shrink-0"
                        title="Remove row"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
                {columns.map((col) => (
                  <div key={col.id} className="flex flex-col gap-2.5 w-[160px] shrink-0">
                    {/* Delete column */}
                    <div className="flex justify-center">
                      <button onClick={() => removeColumn(col.id)} className="p-1 border border-border rounded hover:bg-muted transition-colors" title="Remove column">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    {/* Data Type selector */}
                    <Select value={col.dataType} onValueChange={(v) => updateColumnDataType(col.id, v as ColumnDataType)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="dimension">Dimension</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Dimension Unit selector - only when dimension */}
                    {col.dataType === "dimension" && (
                      <Select value={col.dimensionUnit || "cm"} onValueChange={(v) => updateColumnDimensionUnit(col.id, v as DimensionUnit)}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIMENSION_UNITS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {/* Header */}
                    <Input
                      placeholder="Custom Header"
                      value={col.header}
                      onChange={(e) => updateColumnHeader(col.id, e.target.value)}
                      className="h-9 text-sm"
                    />
                    {/* Values per row */}
                    {rows.map((row) => (
                      <Input
                        key={row.id}
                        placeholder="Enter Value"
                        value={row.values[col.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (col.dataType === "number" || col.dataType === "dimension") {
                            if (val !== "" && !/^-?\d*\.?\d*$/.test(val)) return;
                          }
                          updateCellValue(row.id, col.id, val);
                        }}
                        className="h-9 text-sm"
                        inputMode={col.dataType === "number" || col.dataType === "dimension" ? "decimal" : "text"}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* Add column button */}
            <div className="flex items-center ml-2 shrink-0" style={{ paddingTop: "36px" }}>
              <button onClick={addColumn} className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-colors" title="Add column">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Add row button */}
          <button
            onClick={addRow}
            className="w-full mt-4 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Separator */}
        <Separator className="my-6" />

        {/* Description */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-foreground mb-3">Description</h3>
          <Textarea
            placeholder="Add a description for sizing instructions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[140px]"
          />
        </div>

        {/* Media */}
        <div>
          <h3 className="text-base font-bold text-foreground mb-3">Media</h3>
          {mediaUrl ? (
            <div className="relative inline-block">
              <img src={mediaUrl} alt="Size guide media" className="max-h-40 rounded-lg border border-border" />
              <button onClick={() => setMediaUrl(null)} className="absolute -top-2 -right-2 p-0.5 bg-background border border-border rounded-full hover:bg-destructive hover:text-white hover:border-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-4 p-4 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary flex flex-col items-center justify-center gap-1 shrink-0">
                <Upload className="w-5 h-5 text-primary" />
                <span className="text-[10px] text-primary font-medium">Add Media</span>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Make your size guide more effective with visuals</p>
                <ul className="list-disc list-inside text-xs">
                  <li>Accepted formats: Images (png, jpeg, webp, bmp)</li>
                  <li>Max size: 25MB</li>
                </ul>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleMediaUpload} />
            </label>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
        <Button variant="outline" className="rounded-full px-7 h-10" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button className="rounded-full px-7 h-10" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-2 max-h-[95vh]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "overflow-hidden"
          )}
        >
          {content}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
