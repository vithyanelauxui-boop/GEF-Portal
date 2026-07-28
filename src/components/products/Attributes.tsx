import { useMemo, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, HelpCircle, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import emptyAttributesImg from "@/assets/empty-attributes.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AddAttributeModal } from "./AddAttributeModal";
import { useCategories } from "@/contexts/CategoriesContext";
import { useAttributes } from "@/contexts/AttributesContext";

const suggestedAttributes = [
  "Carrier",
  "Bezel Thickness",
  "Notch Type",
  "Encrypted Backup Options",
  "Multitasking",
  "Display",
];

interface AttributeValue {
  id: string;
  value: string;
}

interface Attribute {
  id: string;
  name: string;
  description?: string;
  dataType: string;
  values: AttributeValue[];
  validation?: Record<string, unknown>;
  hasPredefinedValues?: boolean;
}

interface SortableValueItemProps {
  item: AttributeValue;
  onUpdate: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  showControls: boolean;
  dataType: string;
}

function SortableValueItem({ item, onUpdate, onDelete, showControls, dataType }: SortableValueItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Render appropriate input based on data type
  const renderInput = () => {
    switch (dataType) {
      case "integer":
        return (
          <Input
            type="number"
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder="Enter integer value"
            className="flex-1"
          />
        );
      case "decimal":
        return (
          <Input
            type="number"
            step="0.01"
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder="Enter decimal value"
            className="flex-1"
          />
        );
      case "dimensions":
      case "volume":
      case "weight":
      case "duration":
        return (
          <div className="flex-1 flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={item.value}
              onChange={(e) => onUpdate(item.id, e.target.value)}
              placeholder="Enter value"
              className="flex-1"
            />
          </div>
        );
      case "url":
        return (
          <Input
            type="url"
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder="https://example.com"
            className="flex-1"
          />
        );
      case "file":
        return (
          <Input
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder="Enter file reference"
            className="flex-1"
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            className="flex-1"
          />
        );
      case "color":
        return (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={item.value || "#000000"}
              onChange={(e) => onUpdate(item.id, e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <Input
              value={item.value}
              onChange={(e) => onUpdate(item.id, e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        );
      default:
        return (
          <Input
            value={item.value}
            onChange={(e) => onUpdate(item.id, e.target.value)}
            placeholder="E.g: IOS 17"
            className="flex-1"
          />
        );
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {showControls && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {renderInput()}
      {showControls && (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface AttributeRowProps {
  attribute: Attribute;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: AttributeValue[]) => void;
  onDelete: () => void;
}

function AttributeRow({ attribute, isEditing, onStartEdit, onCancelEdit, onSaveEdit, onDelete }: AttributeRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Initialize with one empty value if attribute has no values
  const getInitialValues = () => 
    attribute.values.length > 0 ? attribute.values : [{ id: Date.now().toString(), value: "" }];
  
  const [editValues, setEditValues] = useState<AttributeValue[]>(getInitialValues);

  // Special state for True/False
  const [boolValue, setBoolValue] = useState<boolean>(
    attribute.values[0]?.value === "true" || attribute.validation?.defaultValue === true
  );

  // Special state for HTML / JSON
  const [jsonValue, setJsonValue] = useState<string>(
    attribute.values[0]?.value || (attribute.validation?.code as string) || (attribute.dataType === "html" ? "" : "{}")
  );

  // Update edit values when isEditing changes to true
  useEffect(() => {
    if (isEditing) {
      setEditValues(getInitialValues());
    }
  }, [isEditing]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditValues((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddValue = () => {
    setEditValues([...editValues, { id: Date.now().toString(), value: "" }]);
  };

  const handleUpdateValue = (id: string, value: string) => {
    setEditValues(editValues.map((v) => (v.id === id ? { ...v, value } : v)));
  };

  const handleDeleteValue = (id: string) => {
    setEditValues(editValues.filter((v) => v.id !== id));
  };

  const handleSave = () => {
    // Handle special types
    if (attribute.dataType === "true_or_false") {
      onSaveEdit([{ id: "1", value: boolValue.toString() }]);
    } else if (attribute.dataType === "html" || attribute.dataType === "json") {
      onSaveEdit([{ id: "1", value: jsonValue }]);
    } else {
      onSaveEdit(editValues.filter((v) => v.value.trim()));
    }
  };

  const handleCancel = () => {
    setEditValues(attribute.values);
    onCancelEdit();
  };

  const startEditing = () => {
    setEditValues(getInitialValues());
    onStartEdit();
  };

  // Check if Add Value button should be disabled (last value is empty)
  const isAddValueDisabled = editValues.length > 0 && !editValues[editValues.length - 1].value.trim();

  const showDragControls = editValues.length > 1;

  // Determine if this data type supports multiple values
  const supportsMultipleValues = !["true_or_false", "html", "json"].includes(attribute.dataType);

  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-primary/20 bg-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-start gap-2 sm:gap-4">
          <div className="w-full sm:w-48 flex-shrink-0 pt-0 sm:pt-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-1">
              {attribute.name}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={-1} className="cursor-help">
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                    <TooltipContent>
                      {attribute.description 
                        ? attribute.description
                        : attribute.dataType === "true_or_false" 
                          ? "Toggle true or false" 
                          : `Add ${attribute.dataType} values for ${attribute.name}`}
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            {attribute.dataType && (
              <span className="text-xs text-muted-foreground capitalize mt-1 block">
                {attribute.dataType.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <div className="flex-1 w-full space-y-3">
            {/* True/False: Show toggle switch */}
            {attribute.dataType === "true_or_false" ? (
              <div className="flex items-center gap-3 py-2">
                <Switch 
                  checked={boolValue} 
                  onCheckedChange={setBoolValue}
                />
                <span className="text-sm font-medium">{boolValue ? "True" : "False"}</span>
              </div>
            ) : (attribute.dataType === "html" || attribute.dataType === "json") ? (
              /* HTML / JSON: Show code editor */
              <div className="space-y-2">
                <Textarea
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="font-mono text-sm min-h-[150px] bg-muted/30"
                />
              </div>
            ) : (
              /* All other types: Show value inputs */
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={editValues.map((v) => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {editValues.map((item) => (
                      <SortableValueItem
                        key={item.id}
                        item={item}
                        onUpdate={handleUpdateValue}
                        onDelete={handleDeleteValue}
                        showControls={showDragControls}
                        dataType={attribute.dataType}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {supportsMultipleValues && (
                  <button
                    type="button"
                    onClick={handleAddValue}
                    disabled={isAddValueDisabled}
                    className={`flex items-center gap-1 text-sm font-medium ${
                      isAddValueDisabled 
                        ? "text-muted-foreground cursor-not-allowed" 
                        : "text-primary hover:underline"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add Value
                  </button>
                )}
              </>
            )}
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

  // Collapsed view
  return (
    <div
      className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 py-4 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors group"
      onClick={startEditing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="w-full sm:w-48 flex-shrink-0 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-foreground flex items-center gap-1">
            {attribute.name}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={-1} className="cursor-help" onClick={(e) => e.stopPropagation()}>
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{attribute.description || `Click to add values for ${attribute.name}`}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          {attribute.dataType && (
            <span className="text-xs text-muted-foreground capitalize">
              {attribute.dataType.replace(/_/g, " ")}
            </span>
          )}
        </div>
        {/* Delete button - inline with name on mobile, end of row on desktop */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-muted-foreground hover:text-destructive transition-colors sm:hidden"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 w-full min-w-0 overflow-hidden">
        {/* True/False: Display current value */}
        {attribute.dataType === "true_or_false" ? (
          <div className="min-h-[40px] px-3 py-2 border border-input rounded-md flex items-center gap-2">
            <Switch 
              checked={attribute.values[0]?.value === "true"} 
              disabled
              className="pointer-events-none"
            />
            <span className="text-sm">{attribute.values[0]?.value === "true" ? "True" : "False"}</span>
          </div>
        ) : (attribute.dataType === "html" || attribute.dataType === "json") ? (
          /* HTML/JSON: Show preview with proper truncation */
          <div className="min-h-[40px] max-w-full px-3 py-2 border border-input rounded-md flex items-center text-muted-foreground text-sm font-mono overflow-hidden">
            <span className="truncate block w-full">{attribute.values[0]?.value || `Click to edit ${attribute.dataType.toUpperCase()}...`}</span>
          </div>
        ) : attribute.values.length > 0 ? (
          <div className="flex flex-wrap gap-2 min-h-[40px] px-3 py-2 border border-input rounded-md items-center">
            {attribute.values.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-sm"
              >
                {attribute.dataType === "color" ? (
                  <span className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full border border-border" 
                      style={{ backgroundColor: v.value }}
                    />
                    {v.value}
                  </span>
                ) : v.value}
              </span>
            ))}
          </div>
        ) : (
          <div className="min-h-[40px] px-3 py-2 border border-input rounded-md flex items-center text-muted-foreground text-sm">
            Click to add values...
          </div>
        )}
      </div>
      {/* Delete button - hidden on mobile (shown inline with name above), hover on desktop */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="hidden sm:block p-2 text-muted-foreground hover:text-destructive transition-colors sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export interface ProductAttributeData {
  id: string;
  name: string;
  dataType: string;
  values: { id: string; value: string }[];
}

export interface AttributesData {
  attributes: ProductAttributeData[];
  hiddenAttributeIds: string[];
}

export interface AttributesRef {
  getData: () => AttributesData;
}

interface AttributesProps {
  selectedCategoryId?: string;
  initialData?: AttributesData;
}

export const Attributes = forwardRef<AttributesRef, AttributesProps>(
  function Attributes({ selectedCategoryId, initialData }, ref) {
  const { categories, getCategoryById, updateCategory } = useCategories();
  const { attributes: globalAttributes, addAttribute: addGlobalAttribute } = useAttributes();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryAttributes, setCategoryAttributes] = useState<Attribute[]>([]);
  const [customAttributes, setCustomAttributes] = useState<Attribute[]>([]);
  const [hiddenAttributeIds, setHiddenAttributeIds] = useState<Set<string>>(() => new Set(initialData?.hiddenAttributeIds || []));
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load category attributes when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      const category = getCategoryById(selectedCategoryId);
      if (category) {
        // Get attributes linked to this category from global attributes
        const categoryAttrs = globalAttributes
          .filter(attr => category.attributeIds.includes(attr.id))
          .map(attr => {
            // Check if initialData has values for this attribute
            const savedAttr = initialData?.attributes?.find(a => a.id === attr.id);
            return {
              id: attr.id,
              name: attr.name,
              description: attr.description,
              dataType: attr.dataType || "single_line_text",
              values: savedAttr?.values || [],
              validation: attr.validation,
              hasPredefinedValues: false,
            };
          });
        setCategoryAttributes(categoryAttrs);
      }
    } else {
      setCategoryAttributes([]);
    }
  }, [selectedCategoryId, categories, getCategoryById, globalAttributes, initialData]);

  // Load custom attributes from initialData
  useEffect(() => {
    if (initialData?.attributes) {
      // Custom attributes are those not in categoryAttributes
      const categoryAttrIds = new Set(categoryAttributes.map(a => a.id));
      const customAttrs = initialData.attributes
        .filter(a => !categoryAttrIds.has(a.id))
        .map(a => ({
          id: a.id,
          name: a.name,
          dataType: a.dataType,
          values: a.values,
          hasPredefinedValues: false,
        }));
      if (customAttrs.length > 0) {
        setCustomAttributes(customAttrs);
      }
    }
  }, [initialData, categoryAttributes]);

  // Expose getData method to parent
  useImperativeHandle(ref, () => ({
    getData: () => ({
      attributes: displayedAttributes.map(a => ({
        id: a.id,
        name: a.name,
        dataType: a.dataType,
        values: a.values,
      })),
      hiddenAttributeIds: Array.from(hiddenAttributeIds),
    }),
  }));

  const displayedAttributes = useMemo(() => {
    const merged: Attribute[] = [];
    const seen = new Set<string>();

    [...categoryAttributes, ...customAttributes].forEach((a) => {
      if (hiddenAttributeIds.has(a.id)) return;
      if (seen.has(a.id)) return;
      seen.add(a.id);
      merged.push(a);
    });

    return merged;
  }, [categoryAttributes, customAttributes, hiddenAttributeIds]);

  // Helper to link attribute to category
  const linkAttributeToCategory = (attributeId: string) => {
    if (selectedCategoryId) {
      const category = getCategoryById(selectedCategoryId);
      if (category && !category.attributeIds.includes(attributeId)) {
        updateCategory(selectedCategoryId, {
          name: category.name,
          description: category.description,
          attributeIds: [...category.attributeIds, attributeId],
          image: category.image,
        });
      }
    }
  };

  const handleAddSuggested = (attrName: string) => {
    // Check if already exists in global attributes (not just displayed ones)
    const existingGlobal = globalAttributes.find(
      (a) => a.name.toLowerCase() === attrName.toLowerCase()
    );
    
    // Check if already displayed
    if (displayedAttributes.some((a) => a.name.toLowerCase() === attrName.toLowerCase())) {
      return;
    }

    let attributeId: string;
    let attributeDataType: string;
    let attributeValidation: Record<string, unknown>;

    if (existingGlobal) {
      // Use existing global attribute
      attributeId = existingGlobal.id;
      attributeDataType = existingGlobal.dataType;
      attributeValidation = existingGlobal.validation;
    } else {
      // Add to global attributes (so it shows in /attributes)
      const created = addGlobalAttribute({
        name: attrName,
        dataType: "single_line_text",
        validation: {},
        isFilterable: true,
        acceptMultipleValues: true,
      });
      attributeId = created.id;
      attributeDataType = created.dataType;
      attributeValidation = created.validation;
    }

    // Link attribute to the selected category
    linkAttributeToCategory(attributeId);

    // Add to this product's custom list (so it shows immediately on /create)
    const newAttr: Attribute = {
      id: attributeId,
      name: attrName,
      dataType: attributeDataType,
      validation: attributeValidation,
      values: [],
      hasPredefinedValues: false,
    };

    setCustomAttributes((prev) => [...prev, newAttr]);
    setEditingId(attributeId);
  };

  const handleDeleteAttribute = (id: string) => {
    // If it's a custom attribute added in this product, remove it from the product.
    setCustomAttributes((prev) => prev.filter((a) => a.id !== id));

    // If it's a category attribute, hide it for this product (don't delete globally).
    setHiddenAttributeIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    if (editingId === id) setEditingId(null);
  };

  const handleSaveAttributeFromModal = (attr: {
    name: string;
    dataType: string;
    validation: Record<string, unknown>;
    isFilterable: boolean;
    acceptMultipleValues: boolean;
  }) => {
    // Check if attribute with same name already exists in global
    const existingGlobal = globalAttributes.find(
      (a) => a.name.toLowerCase() === attr.name.toLowerCase()
    );

    let attributeId: string;
    let attributeDataType: string;
    let attributeValidation: Record<string, unknown>;

    if (existingGlobal) {
      // Use existing global attribute
      attributeId = existingGlobal.id;
      attributeDataType = existingGlobal.dataType;
      attributeValidation = existingGlobal.validation;
    } else {
      // Add to global attributes context so it reflects in Attributes page
      const created = addGlobalAttribute(attr);
      attributeId = created.id;
      attributeDataType = created.dataType;
      attributeValidation = created.validation;
    }

    // Link attribute to the selected category
    linkAttributeToCategory(attributeId);

    const newAttr: Attribute = {
      id: attributeId,
      name: attr.name,
      dataType: attributeDataType,
      values: [],
      validation: attributeValidation,
      hasPredefinedValues: attributeValidation?.predefinedValues ? true : false,
    };
    
    // If it has predefined values from modal, add them
    if (attr.validation?.predefinedValues && Array.isArray(attr.validation.predefinedValues)) {
      newAttr.values = (attr.validation.predefinedValues as string[]).map((v, i) => ({
        id: `${Date.now()}-${i}`,
        value: v,
      }));
    }
    
    setCustomAttributes((prev) => [...prev, newAttr]);
    setEditingId(attributeId);
  };

  const handleSaveEdit = (attrId: string, values: AttributeValue[]) => {
    setCategoryAttributes((prev) => prev.map((a) => (a.id === attrId ? { ...a, values } : a)));
    setCustomAttributes((prev) => prev.map((a) => (a.id === attrId ? { ...a, values } : a)));
    setEditingId(null);
  };

  return (
    <div className="form-section animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="form-section-title mb-0">Attributes</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Attribute
        </Button>
      </div>

      {/* Empty State */}
      {displayedAttributes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <img
            src={emptyAttributesImg}
            alt="No attributes"
            className="w-40 h-40 mb-4"
          />
          <h3 className="text-base font-semibold text-foreground mb-1">No attributes found</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCategoryId 
              ? "This category has no attributes linked. Add attributes manually or link them in the category settings."
              : "Select a category to load its attributes, or add custom attributes to this product."}
          </p>
        </div>
      )}

      {/* Attribute Rows */}
      {displayedAttributes.length > 0 && (
        <div className="divide-y divide-border sm:divide-y-0 sm:space-y-2">
          {displayedAttributes.map((attr) => (
            <AttributeRow
              key={attr.id}
              attribute={attr}
              isEditing={editingId === attr.id}
              onStartEdit={() => setEditingId(attr.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(values) => handleSaveEdit(attr.id, values)}
              onDelete={() => handleDeleteAttribute(attr.id)}
            />
          ))}
        </div>
      )}

      {/* Suggested Attributes */}
      <div className="-mx-6 mt-6 pt-6 border-t border-border px-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {suggestedAttributes
            .filter((attr) => !displayedAttributes.some((a) => a.name.toLowerCase() === attr.toLowerCase()))
            .map((attr) => (
              <Button
                key={attr}
                variant="outline"
                size="sm"
                className="text-xs h-8 flex-shrink-0"
                onClick={() => handleAddSuggested(attr)}
              >
                <Plus className="w-3 h-3 mr-1" />
                {attr}
              </Button>
            ))}
        </div>
      </div>

      <AddAttributeModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSave={handleSaveAttributeFromModal}
      />
    </div>
  );
});

