import { useState, forwardRef, useImperativeHandle } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CustomDataEntry {
  id: string;
  key: string;
  value: string;
}

export interface CustomDataRef {
  getData: () => CustomDataEntry[];
}

interface CustomDataProps {
  initialData?: CustomDataEntry[];
}

function CustomDataRow({
  entry,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  entry: CustomDataEntry;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (value: string) => void;
}) {
  const [editValue, setEditValue] = useState(entry.value);

  const handleSave = () => {
    onSave(editValue);
  };

  const handleCancel = () => {
    setEditValue(entry.value);
    onCancelEdit();
  };

  const startEditing = () => {
    setEditValue(entry.value);
    onStartEdit();
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-primary/20 bg-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-start gap-2 sm:gap-4">
          <div className="w-full sm:w-48 flex-shrink-0 pt-0 sm:pt-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              {entry.key}
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
            </span>
          </div>
          <div className="flex-1 w-full">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={`Enter value for ${entry.key}`}
              className="flex-1"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 py-4 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors group"
      onClick={startEditing}
    >
      <div className="w-full sm:w-48 flex-shrink-0">
        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
          {entry.key}
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary cursor-pointer transition-colors" />
        </span>
      </div>
      <div className="flex-1 w-full min-w-0">
        {entry.value ? (
          <div className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 border border-input rounded-md items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-sm">
              {entry.value}
            </span>
          </div>
        ) : (
          <div className="min-h-[40px] px-3 py-2 border border-input rounded-md flex items-center text-muted-foreground text-sm">
            Click to add values...
          </div>
        )}
      </div>
    </div>
  );
}

export const CustomData = forwardRef<CustomDataRef, CustomDataProps>(
  function CustomData({ initialData = [] }, ref) {
    const [entries, setEntries] = useState<CustomDataEntry[]>(initialData);
    const [editingId, setEditingId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getData: () => entries.filter((e) => e.key.trim()),
    }));

    const handleSave = (id: string, value: string) => {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));
      setEditingId(null);
    };


    if (entries.length === 0) {
      return (
        <div className="form-section animate-fade-in">
          <h2 className="form-section-title mb-6">Custom Data</h2>
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">No custom data available for this product</p>
          </div>
        </div>
      );
    }

    return (
      <div className="form-section animate-fade-in">
        <h2 className="form-section-title mb-6">Custom Data</h2>
        <div className="space-y-2">
          {entries.map((entry) => (
            <CustomDataRow
              key={entry.id}
              entry={entry}
              isEditing={editingId === entry.id}
              onStartEdit={() => setEditingId(entry.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(value) => handleSave(entry.id, value)}
            />
          ))}
        </div>
      </div>
    );
  }
);
