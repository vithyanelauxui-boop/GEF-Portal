import { useState, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Plus, GripVertical, Trash2, Puzzle, ChevronDown, ChevronUp, Search, Check } from "lucide-react";

// Predefined extension block types
const EXTENSION_BLOCK_TYPES = [
  { value: "loyalty-program", label: "Loyalty Program" },
  { value: "analytics-widget", label: "Analytics Widget" },
  { value: "custom-pricing", label: "Custom Pricing" },
  { value: "product-recommendations", label: "Product Recommendations" },
  { value: "inventory-alerts", label: "Inventory Alerts" },
  { value: "order-tracking", label: "Order Tracking" },
  { value: "customer-feedback", label: "Customer Feedback" },
  { value: "promotions-engine", label: "Promotions Engine" },
  { value: "shipping-calculator", label: "Shipping Calculator" },
  { value: "tax-calculator", label: "Tax Calculator" },
  { value: "crm-integration", label: "CRM Integration" },
  { value: "payment-gateway", label: "Payment Gateway" },
  { value: "social-media", label: "Social Media" },
  { value: "chatbot", label: "Chatbot" },
  { value: "custom", label: "Custom Extension" },
];

export interface ExtensionBlock {
  id: string;
  type: string;
  name: string;
  description: string;
  collapsed: boolean;
}

interface SortableBlockProps {
  block: ExtensionBlock;
  onRemove: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

function SortableBlock({ block, onRemove, onToggleCollapse }: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeLabel = EXTENSION_BLOCK_TYPES.find(t => t.value === block.type)?.label || block.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg overflow-hidden transition-shadow",
        isDragging && "shadow-lg ring-2 ring-primary/20 z-10 relative"
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-0.5 touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Puzzle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground flex-1">
          {block.name || typeLabel}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{typeLabel}</span>
        <button onClick={() => onToggleCollapse(block.id)} className="text-muted-foreground hover:text-foreground p-1">
          {block.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <button onClick={() => onRemove(block.id)} className="text-muted-foreground hover:text-destructive p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {!block.collapsed && (
        <div className="p-5">
          <p className="text-sm text-muted-foreground">{block.description || "No description provided"}</p>
          <div className="mt-3 p-4 border border-dashed border-border rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Extension content will be rendered here based on integration configuration.</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExtensionBlocksProps {
  blocks: ExtensionBlock[];
  onBlocksChange: (blocks: ExtensionBlock[]) => void;
}

export default function ExtensionBlocks({ blocks, onBlocksChange }: ExtensionBlocksProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newType, setNewType] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const filteredTypes = useMemo(
    () => EXTENSION_BLOCK_TYPES.filter(t => t.label.toLowerCase().includes(typeSearch.toLowerCase())),
    [typeSearch]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleAdd = () => {
    if (!newType) return;
    onBlocksChange([
      ...blocks,
      { id: crypto.randomUUID(), type: newType, name: newName.trim(), description: newDescription.trim(), collapsed: false },
    ]);
    setNewType("");
    setNewName("");
    setNewDescription("");
    setTypeSearch("");
    setAddModalOpen(false);
  };

  const handleRemove = (id: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
  };

  const handleToggleCollapse = (id: string) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? { ...b, collapsed: !b.collapsed } : b)));
  };

  const selectedTypeLabel = EXTENSION_BLOCK_TYPES.find(t => t.value === newType)?.label;

  return (
    <>
      {blocks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {blocks.map((block) => (
                <SortableBlock key={block.id} block={block} onRemove={handleRemove} onToggleCollapse={handleToggleCollapse} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        onClick={() => setAddModalOpen(true)}
        className="w-full border-2 border-dashed border-border rounded-lg py-4 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Extension Block
      </button>

      <Dialog open={addModalOpen} onOpenChange={(open) => { setAddModalOpen(open); if (!open) { setNewType(""); setNewName(""); setNewDescription(""); setTypeSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Add Extension Block</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Extension Block Type - Required, Searchable Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Extension Block<span className="text-destructive">*</span></Label>
              <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 focus:border-primary",
                      !newType && "text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{selectedTypeLabel || "Choose extension block type..."}</span>
                    <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="p-2 border-b border-border">
                    <div className="flex items-center gap-2 px-2">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        value={typeSearch}
                        onChange={(e) => setTypeSearch(e.target.value)}
                        placeholder="Search extension blocks..."
                        className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {filteredTypes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No extension blocks found</p>
                    ) : (
                      filteredTypes.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => { setNewType(type.value); setTypeDropdownOpen(false); setTypeSearch(""); }}
                          className={cn(
                            "flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent text-left",
                            newType === type.value && "bg-accent"
                          )}
                        >
                          {newType === type.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <span className={cn(newType !== type.value && "pl-5.5")}>{type.label}</span>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Block Name - Optional */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Block Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Optional custom name for this block" />
            </div>

            {/* Description - Optional */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What does this extension block do?" rows={3} />
            </div>

            <Button className="w-full" onClick={handleAdd} disabled={!newType}>
              Add Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
