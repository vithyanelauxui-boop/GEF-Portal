import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, ImagePlus, Upload, GripVertical, ChevronDown, X, Search, HelpCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { VariantDetailModal, VariantDetailData, InventoryLocation } from "./VariantDetailModal";
import { UnavailableCategories } from "./InventoryManagementPopover";
import { useIsMobile } from "@/hooks/use-mobile";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type VariantTypeOption = "hex" | "image";

interface VariantValue {
  id: string;
  hexColor?: string;
  images: string[];
  label: string;
  plpDisplayName?: string;
  plpSlug?: string;
}

interface SavedVariant {
  id: string;
  name: string;
  types: VariantTypeOption[];
  values: VariantValue[];
  showOnPLP: boolean;
}

export interface VariantsData {
  enabled: boolean;
  savedVariants: SavedVariant[];
  variantDetailData: Record<string, VariantDetailData>;
  combinationQuantities: Record<string, number>;
  combinationActualPrices: Record<string, string>;
  combinationSellingPrices: Record<string, string>;
  combinationImages: Record<string, string>;
}

export interface VariantsRef {
  getData: () => VariantsData;
}

interface ImageGalleryModalState {
  isOpen: boolean;
  images: string[];
  onUpdate: (images: string[]) => void;
}

interface VariantCombination {
  id: string;
  label: string;
  image?: string;
  values: string[];
}

// VariantDetailData is now imported from VariantDetailModal

interface PackageDetailsData {
  length: string;
  width: string;
  height: string;
  weight: string;
  sku: string;
}

interface VariantsProps {
  productName?: string;
  productSku?: string;
  productImage?: string;
  onVariantsChange?: (hasVariants: boolean) => void;
  packageDetails?: PackageDetailsData;
  initialData?: VariantsData;
  isEditMode?: boolean;
  isUnlisted?: boolean;
  productCustomDataKeys?: { id: string; key: string }[];
  baseUom?: import("@/contexts/ProductsContext").BaseUomCode;
}

export const Variants = forwardRef<VariantsRef, VariantsProps>(function Variants(
  { productName = "", productSku, productImage, onVariantsChange, packageDetails, initialData, isEditMode = false, isUnlisted = false, productCustomDataKeys = [], baseUom }: VariantsProps,
  ref,
) {
  const isMobile = useIsMobile();
  const [isEnabled, setIsEnabled] = useState(false);
  const [savedVariants, setSavedVariants] = useState<SavedVariant[]>([]);
  
  // Modal state for creating/editing variants (only used when variants already exist)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  
  // Inline editing state (for first variant when none exist)
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  
  // Current variant being edited (in modal or inline)
  const [variantName, setVariantName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<VariantTypeOption[]>([]);
  const [values, setValues] = useState<VariantValue[]>([]);
  
  // Current value being created
  const [currentHexColor, setCurrentHexColor] = useState("#000000");
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [currentLabel, setCurrentLabel] = useState("");
  
  // Editing existing value state
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  
  // Track if we're showing an empty input row
  const [showEmptyInputRow, setShowEmptyInputRow] = useState(true);
  
  // Image gallery modal state
  const [galleryModal, setGalleryModal] = useState<ImageGalleryModalState>({
    isOpen: false,
    images: [],
    onUpdate: () => {},
  });
  
  // Track expanded parent rows in table
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  
  // Variant detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string | undefined>();
  const [variantDetailData, setVariantDetailData] = useState<Record<string, VariantDetailData>>({});
  const [combinationQuantities, setCombinationQuantities] = useState<Record<string, number>>({});
  const [combinationActualPrices, setCombinationActualPrices] = useState<Record<string, string>>({});
  const [combinationSellingPrices, setCombinationSellingPrices] = useState<Record<string, string>>({});
  const [combinationImages, setCombinationImages] = useState<Record<string, string>>({});
  
  // Row selection state
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Hydrate state in edit mode (only once to avoid clobbering in-session edits)
  const didHydrateRef = useRef(false);
  useEffect(() => {
    if (didHydrateRef.current) return;
    if (!initialData) return;

    didHydrateRef.current = true;
    const enabled = initialData.enabled ?? (initialData.savedVariants?.length ?? 0) > 0;
    setIsEnabled(enabled);
    setSavedVariants(initialData.savedVariants ?? []);
    setVariantDetailData(initialData.variantDetailData ?? {});
    setCombinationQuantities(initialData.combinationQuantities ?? {});
    setCombinationActualPrices(initialData.combinationActualPrices ?? {});
    setCombinationSellingPrices(initialData.combinationSellingPrices ?? {});
    setCombinationImages(initialData.combinationImages ?? {});

    // Ensure we don't show the inline "first variant" editor when editing an existing product.
    setIsInlineEditing(false);
  }, [initialData]);

  useImperativeHandle(
    ref,
    () => ({
      getData: () => ({
        enabled: isEnabled,
        savedVariants,
        variantDetailData,
        combinationQuantities,
        combinationActualPrices,
        combinationSellingPrices,
        combinationImages,
      }),
    }),
    [
      isEnabled,
      savedVariants,
      variantDetailData,
      combinationQuantities,
      combinationActualPrices,
      combinationSellingPrices,
      combinationImages,
    ],
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const combinationImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCombinationId, setUploadingCombinationId] = useState<string | null>(null);

  // Notify parent when variants exist/change
  useEffect(() => {
    onVariantsChange?.(savedVariants.length > 0);
  }, [savedVariants.length, onVariantsChange]);

  // Generate all combinations for the detail modal
  const allCombinations = useMemo((): VariantCombination[] => {
    if (savedVariants.length === 0) return [];
    
    // Generate cartesian product of all variant values
    const generateCombinations = (variants: SavedVariant[]): VariantCombination[] => {
      if (variants.length === 0) return [];
      if (variants.length === 1) {
        return variants[0].values.map((v) => ({
          id: v.id,
          label: v.label,
          image: combinationImages[v.id] || v.images[0],
          values: [v.label],
        }));
      }
      
      // Cartesian product for multiple variants
      const result: VariantCombination[] = [];
      const firstVariant = variants[0];
      const restVariants = variants.slice(1);
      
      firstVariant.values.forEach((parentValue) => {
        if (restVariants.length === 1) {
          // Two variants
          restVariants[0].values.forEach((childValue) => {
            const comboId = `${parentValue.id}-${childValue.id}`;
            result.push({
              id: comboId,
              label: `${parentValue.label} / ${childValue.label}`,
              image: combinationImages[comboId] || parentValue.images[0] || childValue.images[0],
              values: [parentValue.label, childValue.label],
            });
          });
        } else {
          // More than two - recursively combine rest
          const childCombos = generateCombinations(restVariants);
          childCombos.forEach((combo) => {
            const comboId = `${parentValue.id}-${combo.id}`;
            result.push({
              id: comboId,
              label: `${parentValue.label} / ${combo.label}`,
              image: combinationImages[comboId] || parentValue.images[0] || combo.image,
              values: [parentValue.label, ...combo.values],
            });
          });
        }
      });
      
      return result;
    };
    
    return generateCombinations(savedVariants);
  }, [savedVariants, combinationImages]);

  // Build set of combination IDs that have PLP enabled
  const plpEnabledCombinationIds = useMemo((): Set<string> => {
    const ids = new Set<string>();
    if (savedVariants.length === 0) return ids;
    
    if (savedVariants.length === 1) {
      // Single variant: combination ID = value ID
      if (savedVariants[0].showOnPLP) {
        savedVariants[0].values.forEach(v => ids.add(v.id));
      }
    } else {
      // Multiple variants: if any variant has PLP on, mark all combinations containing its values
      const plpVariantIndices = savedVariants.map((v, i) => v.showOnPLP ? i : -1).filter(i => i >= 0);
      if (plpVariantIndices.length > 0) {
        allCombinations.forEach(combo => ids.add(combo.id));
      }
    }
    return ids;
  }, [savedVariants, allCombinations]);

  const openVariantDetailModal = (combinationId: string) => {
    setSelectedCombinationId(combinationId);
    setDetailModalOpen(true);
  };

  const handleUpdateVariantData = (combinationId: string, data: VariantDetailData) => {
    setVariantDetailData((prev) => ({ ...prev, [combinationId]: data }));
  };

  // Selection helpers
  const getAllSelectableIds = (): string[] => {
    if (savedVariants.length === 0) return [];
    if (savedVariants.length === 1) {
      return savedVariants[0].values.map(v => v.id);
    }
    // Multiple variants: parent ids + all combination ids
    const ids: string[] = [];
    savedVariants[0].values.forEach(pv => {
      ids.push(pv.id);
      allCombinations.filter(c => c.id.startsWith(`${pv.id}-`)).forEach(c => ids.push(c.id));
    });
    return ids;
  };

  const toggleRowCheck = (id: string) => {
    setCheckedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allIds = getAllSelectableIds();
    if (checkedRows.size === allIds.length && allIds.length > 0) {
      setCheckedRows(new Set());
    } else {
      setCheckedRows(new Set(allIds));
    }
  };

  const isAllSelected = (() => {
    const allIds = getAllSelectableIds();
    return allIds.length > 0 && checkedRows.size === allIds.length;
  })();

  const handleDeleteCheckedVariants = () => {
    // Remove checked value IDs from saved variants
    setSavedVariants(prev => prev.map(sv => ({
      ...sv,
      values: sv.values.filter(v => !checkedRows.has(v.id))
    })).filter(sv => sv.values.length > 0));
    // Clean up combination data
    checkedRows.forEach(id => {
      // Also remove any combinations that start with this id
      allCombinations.filter(c => c.id === id || c.id.startsWith(`${id}-`)).forEach(c => {
        setCombinationActualPrices(prev => { const n = {...prev}; delete n[c.id]; return n; });
        setCombinationSellingPrices(prev => { const n = {...prev}; delete n[c.id]; return n; });
        setCombinationQuantities(prev => { const n = {...prev}; delete n[c.id]; return n; });
        setCombinationImages(prev => { const n = {...prev}; delete n[c.id]; return n; });
      });
    });
    setCheckedRows(new Set());
    setShowDeleteConfirm(false);
  };

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    if (checked && savedVariants.length === 0) {
      setIsInlineEditing(true);
    } else if (!checked) {
      resetAll();
    }
  };

  const resetCurrentForm = () => {
    setVariantName("");
    setSelectedTypes([]);
    setValues([]);
    setCurrentHexColor("#000000");
    setCurrentImages([]);
    setCurrentLabel("");
    setShowEmptyInputRow(true);
    setEditingVariantId(null);
    setEditingValueId(null);
  };

  // Start editing an existing value - directly edit in the values array
  const startEditingValue = (value: VariantValue) => {
    setEditingValueId(value.id);
  };

  // Update value directly as user types
  const updateEditingValue = (field: 'label' | 'hexColor' | 'images', newValue: string | string[]) => {
    if (!editingValueId) return;
    setValues(prev => prev.map(v => 
      v.id === editingValueId 
        ? { ...v, [field]: newValue }
        : v
    ));
  };

  // Finish editing (on blur or Enter)
  const finishEditingValue = () => {
    setEditingValueId(null);
  };

  // Toggle parent row expansion in table
  const toggleParentExpansion = (parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  const resetAll = () => {
    resetCurrentForm();
    setSavedVariants([]);
    setIsModalOpen(false);
    setIsInlineEditing(false);
  };

  const toggleType = (type: VariantTypeOption) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const removeType = (type: VariantTypeOption) => {
    setSelectedTypes(prev => prev.filter(t => t !== type));
  };

  const hasHex = selectedTypes.includes("hex");
  const hasImage = selectedTypes.includes("image");

  // Determine if current input has any data
  const currentInputHasData = currentLabel.trim() !== "" || currentImages.length > 0 || currentHexColor !== "#000000";
  
  // Determine if we can add a value (must have at least label)
  const canAddValue = currentLabel.trim() !== "";

  const handleAddValue = () => {
    if (!currentLabel.trim()) return;

    const newValue: VariantValue = {
      id: crypto.randomUUID(),
      label: currentLabel.trim(),
      hexColor: hasHex ? currentHexColor : undefined,
      images: hasImage ? [...currentImages] : [],
    };
    
    setValues([...values, newValue]);
    setCurrentLabel("");
    setCurrentHexColor("#000000");
    setCurrentImages([]);
    setShowEmptyInputRow(true);
  };

  const handleCancelCurrentRow = () => {
    setCurrentLabel("");
    setCurrentHexColor("#000000");
    setCurrentImages([]);
    setShowEmptyInputRow(false);
  };

  const handleShowInputRow = () => {
    setShowEmptyInputRow(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const valueIds = useMemo(() => values.map((v) => v.id), [values]);

  const handleValuesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setValues((items) => {
      const oldIndex = items.findIndex((i) => i.id === String(active.id));
      const newIndex = items.findIndex((i) => i.id === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Single image mode - replace existing image
    const file = files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCurrentImages([event.target?.result as string]);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 20 - galleryModal.images.length;

    const newImages: string[] = [];
    let loadedCount = 0;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push(event.target?.result as string);
        loadedCount++;
        if (loadedCount === filesToProcess.length) {
          const updatedImages = [...galleryModal.images, ...newImages];
          setGalleryModal(prev => ({ ...prev, images: updatedImages }));
          galleryModal.onUpdate(updatedImages);
        }
      };
      reader.readAsDataURL(file);
    });

    if (galleryFileInputRef.current) {
      galleryFileInputRef.current.value = "";
    }
  };

  // Handle combination image upload
  const handleCombinationImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingCombinationId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      const combinationId = uploadingCombinationId;
      
      // Check if this is a parent ID (first variant value)
      const isParent = savedVariants.length > 1 && 
        savedVariants[0].values.some(v => v.id === combinationId);
      
      if (isParent) {
        // Get all child IDs for this parent
        const parentValue = savedVariants[0].values.find(v => v.id === combinationId);
        if (parentValue && savedVariants.length > 1) {
          const childIds: string[] = [];
          const generateChildIds = (variants: SavedVariant[], currentId: string, depth: number) => {
            if (depth >= variants.length) {
              childIds.push(currentId);
              return;
            }
            variants[depth].values.forEach(val => {
              generateChildIds(variants, `${currentId}-${val.id}`, depth + 1);
            });
          };
          generateChildIds(savedVariants, parentValue.id, 1);
          
          // Apply image to all children
          setCombinationImages(prev => {
            const updated = { ...prev, [combinationId]: imageUrl };
            childIds.forEach(childId => {
              updated[childId] = imageUrl;
            });
            return updated;
          });
        }
      } else {
        setCombinationImages(prev => ({
          ...prev,
          [combinationId]: imageUrl
        }));
      }
      setUploadingCombinationId(null);
    };
    reader.readAsDataURL(file);

    if (combinationImageInputRef.current) {
      combinationImageInputRef.current.value = "";
    }
  };

  const triggerCombinationImageUpload = (combinationId: string) => {
    setUploadingCombinationId(combinationId);
    combinationImageInputRef.current?.click();
  };

  const removeCombinationImage = (combinationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCombinationImages(prev => {
      const newImages = { ...prev };
      delete newImages[combinationId];
      return newImages;
    });
  };

  // Get unique child images for a parent (for stacked display)
  const getChildImages = (parentValueId: string, childIds: string[]): string[] => {
    const uniqueImages: string[] = [];
    childIds.forEach(childId => {
      const img = combinationImages[childId];
      if (img && !uniqueImages.includes(img)) {
        uniqueImages.push(img);
      }
    });
    return uniqueImages;
  };

  const removeValue = (id: string) => {
    setValues(values.filter((v) => v.id !== id));
  };

  const removeSavedVariant = (id: string) => {
    setSavedVariants(savedVariants.filter((v) => v.id !== id));
  };

  const togglePLPConfig = (id: string) => {
    setSavedVariants(prev => 
      prev.map(v => {
        if (v.id !== id) return v;
        const newShowOnPLP = !v.showOnPLP;
        // When turning on, auto-populate display names and slugs from labels
        if (newShowOnPLP) {
          return {
            ...v,
            showOnPLP: true,
            values: v.values.map(val => {
              const defaultDisplay = productName ? `${productName}-${val.label}` : val.label;
              return {
                ...val,
                plpDisplayName: val.plpDisplayName || defaultDisplay,
                plpSlug: val.plpSlug || generateSlug(defaultDisplay),
              };
            }),
          };
        }
        return { ...v, showOnPLP: false };
      })
    );
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const updateVariantValuePLP = (variantId: string, valueId: string, field: 'plpDisplayName' | 'plpSlug', val: string) => {
    setSavedVariants(prev =>
      prev.map(v => v.id !== variantId ? v : {
        ...v,
        values: v.values.map(value => value.id !== valueId ? value : {
          ...value,
          [field]: val,
          ...(field === 'plpDisplayName' ? { plpSlug: generateSlug(val) } : {}),
        }),
      })
    );
  };

  const openGalleryModal = (images: string[], onUpdate: (images: string[]) => void) => {
    setGalleryModal({
      isOpen: true,
      images: [...images],
      onUpdate,
    });
  };

  const closeGalleryModal = () => {
    setGalleryModal({
      isOpen: false,
      images: [],
      onUpdate: () => {},
    });
  };

  const handleGalleryDeleteImage = (index: number) => {
    const newImages = galleryModal.images.filter((_, i) => i !== index);
    setGalleryModal(prev => ({ ...prev, images: newImages }));
    galleryModal.onUpdate(newImages);
  };

  const handleGalleryReplaceImage = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const newImages = [...galleryModal.images];
      newImages[index] = event.target?.result as string;
      setGalleryModal(prev => ({ ...prev, images: newImages }));
      galleryModal.onUpdate(newImages);
    };
    reader.readAsDataURL(file);
  };

  const handleDone = () => {
    // Auto-add current value if it has data
    let finalValues = [...values];
    if (currentLabel.trim()) {
      const newValue: VariantValue = {
        id: crypto.randomUUID(),
        label: currentLabel.trim(),
        hexColor: hasHex ? currentHexColor : undefined,
        images: hasImage ? [...currentImages] : [],
      };
      finalValues = [...finalValues, newValue];
    }

    if (variantName.trim() && finalValues.length > 0) {
      if (editingVariantId) {
        // Update existing variant
        setSavedVariants(prev => prev.map(v => 
          v.id === editingVariantId 
            ? { ...v, name: variantName.trim(), types: [...selectedTypes], values: finalValues }
            : v
        ));
      } else {
        // Create new variant
        const newVariant: SavedVariant = {
          id: crypto.randomUUID(),
          name: variantName.trim(),
          types: [...selectedTypes],
          values: finalValues,
          showOnPLP: false,
        };
        setSavedVariants([...savedVariants, newVariant]);
      }
      resetCurrentForm();
      setIsModalOpen(false);
      setIsInlineEditing(false);
    }
  };

  const handleCancel = () => {
    resetCurrentForm();
    setIsModalOpen(false);
    setIsInlineEditing(false);
    // If canceling inline edit with no saved variants, disable the toggle
    if (savedVariants.length === 0) {
      setIsEnabled(false);
    }
  };

  const handleAddVariantClick = () => {
    resetCurrentForm();
    if (savedVariants.length === 0) {
      // First variant: use inline editing
      setIsInlineEditing(true);
    } else {
      // Subsequent variants: use modal
      setIsModalOpen(true);
    }
  };

  const handleEditVariant = (variant: SavedVariant) => {
    setEditingVariantId(variant.id);
    setVariantName(variant.name);
    setSelectedTypes([...variant.types]);
    setValues([...variant.values]);
    setCurrentHexColor("#000000");
    setCurrentImages([]);
    setCurrentLabel("");
    setShowEmptyInputRow(true);
    setIsModalOpen(true);
  };

  // Can show delete/drag handles when 2+ committed values exist
  const canShowValueControls = values.length >= 2;
  const canDeleteVariants = savedVariants.length > 1;
  
  // Done button enabled when: name is filled AND at least one value is added
  const hasValidData = variantName.trim() && (values.length > 0 || currentLabel.trim());
  
  // For the current input row: show X only when values exist (so it can be canceled) or if there's input data
  const showCurrentRowCancel = values.length > 0;

  // Stacked image component - horizontal overlap style
  const StackedImages = ({ 
    images, 
    onOpenGallery,
    maxVisible = 3
  }: { 
    images: string[]; 
    onOpenGallery: () => void;
    maxVisible?: number;
  }) => {
    const visibleImages = images.slice(0, maxVisible).reverse(); // Reverse so first image is on top
    const remainingCount = images.length - maxVisible;
    const stackOffset = 8; // How much each card peeks from the right

    return (
      <div 
        className="relative cursor-pointer group flex-shrink-0"
        onClick={onOpenGallery}
        style={{ 
          width: 40 + (Math.min(images.length - 1, maxVisible - 1) * stackOffset), 
          height: 40 
        }}
      >
        {visibleImages.map((img, idx) => {
          const actualIndex = maxVisible - 1 - idx; // Reverse index for z-order
          return (
            <div
              key={idx}
              className="absolute w-10 h-10 rounded-lg overflow-hidden shadow-md transition-transform group-hover:translate-x-0.5"
              style={{
                right: actualIndex * stackOffset,
                top: 0,
                zIndex: maxVisible - actualIndex,
              }}
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div
            className="absolute flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-xs font-medium text-foreground shadow-md"
            style={{
              right: maxVisible * stackOffset,
              top: 0,
              zIndex: 0,
            }}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  const SortableValueRow = ({
    value,
    hasHexType,
    hasImageType,
    showControls,
    onRemove,
    onEdit,
    isEditing,
    onUpdateLabel,
    onUpdateHexColor,
    onUpdateImages,
    onFinishEdit,
  }: {
    value: VariantValue;
    hasHexType: boolean;
    hasImageType: boolean;
    showControls: boolean;
    onRemove: (id: string) => void;
    onEdit: (value: VariantValue) => void;
    isEditing: boolean;
    onUpdateLabel: (label: string) => void;
    onUpdateHexColor: (hexColor: string) => void;
    onUpdateImages: (images: string[]) => void;
    onFinishEdit: () => void;
  }) => {
    const rowColorInputRef = useRef<HTMLInputElement>(null);
    const rowFileInputRef = useRef<HTMLInputElement>(null);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: value.id, disabled: !showControls });

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleRowImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateImages([event.target?.result as string]);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center gap-3",
          isDragging && "opacity-80",
        )}
      >
        {/* Drag Handle - only show when 2+ values */}
        {showControls && (
          <button
            type="button"
            aria-label="Reorder value"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}

        {/* Hex Color Swatch - Clickable with color picker */}
        {hasHexType && (
          <label className="relative w-10 h-10 flex-shrink-0 cursor-pointer">
            <div
              className="w-full h-full rounded border border-border hover:ring-2 hover:ring-primary/50 transition-all"
              style={{ backgroundColor: value.hexColor || "#000000" }}
              title="Pick color"
            />
            <input
              type="color"
              value={value.hexColor || "#000000"}
              onChange={(e) => onUpdateHexColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        )}

        {/* Swatch Image - Upload or Preview */}
        {hasImageType && (
          <div className="flex items-center flex-shrink-0">
            {value.images.length > 0 ? (
              <div className="relative group flex-shrink-0">
                <button
                  type="button"
                  onClick={() => rowFileInputRef.current?.click()}
                  className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  title="Change image"
                >
                  <img src={value.images[0]} alt="Swatch" className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onUpdateImages([]); }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => rowFileInputRef.current?.click()}
                className="w-10 h-10 rounded border-2 border-dashed border-primary/30 flex items-center justify-center hover:border-primary/60 hover:bg-primary/5 transition-all"
                title="Upload swatch image"
              >
                <Upload className="w-4 h-4 text-primary/50" />
              </button>
            )}
            <input
              ref={rowFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleRowImageUpload}
            />
          </div>
        )}

        {/* Label - Always show as input until Done is clicked */}
        <Input
          value={value.label}
          onChange={(e) => onUpdateLabel(e.target.value)}
          className="flex-1"
          placeholder="Enter value"
        />

        {/* Delete - only show when 2+ values */}
        {showControls && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(value.id)}
            aria-label="Delete value"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  // Sortable Gallery Image component for Manage Images modal
  const SortableGalleryImage = ({
    id,
    img,
    onDelete,
  }: {
    id: string;
    img: string;
    onDelete: () => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative group aspect-square rounded-lg overflow-hidden border-2 border-transparent",
          isDragging && "opacity-60 z-50 border-primary shadow-lg",
          !isDragging && "border-border hover:border-primary/50"
        )}
      >
        {/* Drag handle overlay - covers entire image */}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
        />
        
        <img
          src={img}
          alt=""
          className="w-full h-full object-cover pointer-events-none"
        />
        
        {/* Drag indicator + delete on hover */}
        <div className="absolute inset-0 bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
          <div className="p-1.5 rounded-full bg-white/20">
            <GripVertical className="w-4 h-4 text-white" />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-full bg-white/20 hover:bg-destructive transition-colors pointer-events-auto z-20"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  };

  // Inline slug display with hover-to-edit
  const PLPSlugField = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
    const [editing, setEditing] = useState(false);
    const [editVal, setEditVal] = useState(value);

    useEffect(() => { setEditVal(value); }, [value]);

    if (editing) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground flex-shrink-0">Slug:</span>
          <Input
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={() => { onChange(editVal); setEditing(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onChange(editVal); setEditing(false); } }}
            className="h-7 text-xs font-mono flex-1"
          />
        </div>
      );
    }

    return (
      <div
        className="group flex items-center gap-1.5 cursor-pointer"
        onClick={() => setEditing(true)}
      >
        <span className="text-xs text-muted-foreground">Slug:</span>
        <span className="text-xs font-mono text-muted-foreground">{value}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  };

  // Collapsible PLP value config sub-component
  const PLPValueConfig = ({ variant }: { variant: SavedVariant }) => {
    const [expanded, setExpanded] = useState(true);
    return (
      <div className="-mx-4 -mb-4">
        <div className="border-t border-border" />
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <span>PLP Configuration</span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
        {expanded && (
          <div className="px-4 pb-3 space-y-2.5">
            {variant.values.map((value) => {
              const defaultDisplay = productName ? `${productName}-${value.label}` : value.label;
              const displayValue = value.plpDisplayName || defaultDisplay;
              const slugValue = value.plpSlug || generateSlug(defaultDisplay);
              return (
                <div key={value.id} className="pt-2.5 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">{value.label}</p>
                  <div>
                    <label className="text-[11px] text-muted-foreground mb-0.5 block">Variant Display</label>
                    <Input
                      value={displayValue}
                      onChange={(e) => updateVariantValuePLP(variant.id, value.id, 'plpDisplayName', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <PLPSlugField
                    value={slugValue}
                    onChange={(val) => updateVariantValuePLP(variant.id, value.id, 'plpSlug', val)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Sortable Variant Card component for reordering variant groups
  const SortableVariantCard = ({
    variant,
    variantIndex,
    canDelete,
    onEdit,
    onTogglePLP,
  }: {
    variant: SavedVariant;
    variantIndex: number;
    canDelete: boolean;
    onEdit: () => void;
    onTogglePLP: () => void;
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: variant.id, disabled: !canDelete });

    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors bg-card",
          isDragging && "opacity-80 shadow-lg z-50"
        )}
        onClick={onEdit}
      >
        <div className="flex items-start gap-3">
          {canDelete && (
            <div 
              className="flex items-center justify-center pt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{variant.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {variant.values.map((value) => (
                <div
                  key={value.id}
                  className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-sm"
                >
                  {value.hexColor && (
                    <div
                      className="w-4 h-4 rounded-full border border-border/50"
                      style={{ backgroundColor: value.hexColor }}
                    />
                  )}
                  <span>{value.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* PLP Config Toggle */}
        <div 
          className="border-t border-border pt-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              Allow this variant to appear on the PLP
              <HelpCircle className="w-3.5 h-3.5" />
            </div>
            <Switch
              checked={isUnlisted ? false : variant.showOnPLP}
              onCheckedChange={onTogglePLP}
              disabled={isUnlisted}
            />
          </div>

          {/* PLP Config - collapsible section, persists data even when collapsed */}
          {variant.showOnPLP && !isUnlisted && (
            <PLPValueConfig variant={variant} />
          )}
        </div>
      </div>
    );
  };

  // Generate hierarchical table rows based on variant order
  // First variant = parent rows, subsequent variants = nested children
  const generateHierarchicalRows = () => {
    if (savedVariants.length === 0) return null;
    
    // Helper to calculate price range for parent from children
    const getPriceRange = (childIds: string[], priceMap: Record<string, string>): string => {
      const prices = childIds
        .map(id => parseFloat(priceMap[id] || "0"))
        .filter(p => p > 0);
      if (prices.length === 0) return "";
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return min.toFixed(2);
      return `${min.toFixed(2)} - ${max.toFixed(2)}`;
    };

    // Helper to distribute parent price to children
    const handleParentPriceChange = (
      parentId: string, 
      childIds: string[], 
      value: string, 
      setPriceMap: React.Dispatch<React.SetStateAction<Record<string, string>>>
    ) => {
      setPriceMap(prev => {
        const newMap = { ...prev, [parentId]: value };
        // Apply to all children that don't have a custom price
        childIds.forEach(childId => {
          if (!prev[childId] || prev[childId] === prev[parentId]) {
            newMap[childId] = value;
          }
        });
        return newMap;
      });
    };

    // Helper to distribute parent quantity to children
    const handleParentQuantityChange = (
      parentId: string,
      childIds: string[],
      value: number
    ) => {
      setCombinationQuantities(prev => {
        const newMap = { ...prev, [parentId]: value };
        // If there are no child combinations yet, only store the parent value.
        if (childIds.length === 0) return newMap;

        // Evenly distribute parent quantity across all children.
        const perChild = Math.floor(value / childIds.length);
        const remainder = value % childIds.length;
        childIds.forEach((childId, idx) => {
          newMap[childId] = perChild + (idx < remainder ? 1 : 0);
        });
        return newMap;
      });
    };
    
    if (savedVariants.length === 1) {
      // Single variant: just show flat list with standard padding - clickable rows
      return savedVariants[0].values.map((value) => (
        <tr 
          key={value.id} 
          className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
          onClick={() => openVariantDetailModal(value.id)}
        >
          <td className="w-10 pl-4 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={checkedRows.has(value.id)} onCheckedChange={() => toggleRowCheck(value.id)} />
          </td>
          <td className="px-3 py-4">
            <div className="flex items-center gap-3">
              <VariantImageUpload size="large" combinationId={value.id} image={combinationImages[value.id]} />
              <span className="font-medium">{value.label}</span>
            </div>
          </td>
          <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center border border-input rounded-md bg-background overflow-hidden w-32">
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
              <input 
                type="text" 
                className="flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full" 
                placeholder="0.00"
                value={combinationSellingPrices[value.id] || ""}
                onChange={(e) => {
                  setCombinationSellingPrices(prev => ({ ...prev, [value.id]: e.target.value }));
                }}
              />
            </div>
          </td>
          <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center border border-input rounded-md bg-background overflow-hidden w-32">
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
              <input 
                type="text" 
                className="flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full" 
                placeholder="0.00"
                value={combinationActualPrices[value.id] || ""}
                onChange={(e) => {
                  setCombinationActualPrices(prev => ({ ...prev, [value.id]: e.target.value }));
                }}
              />
            </div>
          </td>
          <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
            <Input 
              className="w-20 h-10" 
              placeholder="0" 
              value={combinationQuantities[value.id] || ""}
              disabled={isEditMode}
              onChange={(e) => {
                const qty = parseInt(e.target.value) || 0;
                setCombinationQuantities(prev => ({ ...prev, [value.id]: qty }));
              }}
            />
          </td>
        </tr>
      ));
    }
    
    // Multiple variants: first variant becomes parent, rest become nested children
    const [primaryVariant, ...childVariants] = savedVariants;
    const rows: React.ReactNode[] = [];
    
    primaryVariant.values.forEach((parentValue) => {
      // Use the fully generated cartesian combinations so parent edits can
      // propagate to children even when the accordion is collapsed.
      const childCombinationObjs = allCombinations
        .filter((c) => c.id.startsWith(`${parentValue.id}-`));

      // Labels shown in the UI (without repeating the parent label)
      const childCombinations = childCombinationObjs.map((c) => {
        const parts = c.label.split(" / ");
        return parts.length > 1 ? parts.slice(1).join(" / ") : c.label;
      });

      const isExpanded = expandedParents.has(parentValue.id);
      
      // Get child IDs for this parent (must match the IDs used by the rows/modal)
      const childIds = childCombinationObjs.map((c) => c.id);

      // Calculate price ranges for parent display
      const actualPriceRange = getPriceRange(childIds, combinationActualPrices);
      const sellingPriceRange = getPriceRange(childIds, combinationSellingPrices);
      const totalQuantity = childIds.reduce((sum, id) => sum + (combinationQuantities[id] || 0), 0);
      
      // Check if children have different prices (to show range)
      const hasActualPriceRange = actualPriceRange.includes(" - ");
      const hasSellingPriceRange = sellingPriceRange.includes(" - ");
      
      // Display value: show range if different, else show single value or parent input
      const actualPriceDisplayValue = hasActualPriceRange 
        ? actualPriceRange 
        : (combinationActualPrices[parentValue.id] || "");
      const sellingPriceDisplayValue = hasSellingPriceRange 
        ? sellingPriceRange 
        : (combinationSellingPrices[parentValue.id] || "");

      // Get unique child images for stacked display
      const childImagesForStack = getChildImages(parentValue.id, childIds);
      const hasMultipleChildImages = childImagesForStack.length > 1;

      // Parent row - reduced left padding (pl-2 = 8px)
      rows.push(
        <tr key={`parent-${parentValue.id}`} className="border-b border-border bg-muted/30">
          <td className="w-10 pl-2 pr-2 py-4">
            <Checkbox checked={checkedRows.has(parentValue.id)} onCheckedChange={() => toggleRowCheck(parentValue.id)} />
          </td>
          <td className="px-3 py-4">
            <div className="flex items-center gap-3">
              <VariantImageUpload 
                size="large" 
                combinationId={parentValue.id} 
                image={hasMultipleChildImages ? undefined : (combinationImages[parentValue.id] || childImagesForStack[0])}
                stackedImages={hasMultipleChildImages ? childImagesForStack : undefined}
              />
              <div className="flex flex-col">
                <span className="font-medium">{parentValue.label}</span>
                <button 
                  type="button"
                  onClick={() => toggleParentExpansion(parentValue.id)}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  {childCombinations.length} Variants 
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </button>
              </div>
            </div>
          </td>
          <td className="px-3 py-4">
            <div 
              className={cn(
                "flex items-center border border-input rounded-md bg-background overflow-hidden w-40",
                hasSellingPriceRange && !isExpanded && "cursor-pointer hover:border-primary"
              )}
              onClick={() => {
                if (hasSellingPriceRange && !isExpanded) {
                  toggleParentExpansion(parentValue.id);
                }
              }}
            >
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
              <input 
                type="text" 
                className={cn(
                  "flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full",
                  hasSellingPriceRange && "cursor-pointer"
                )}
                placeholder="0.00"
                value={sellingPriceDisplayValue}
                readOnly={hasSellingPriceRange}
                onClick={(e) => {
                  if (hasSellingPriceRange && !isExpanded) {
                    e.stopPropagation();
                    toggleParentExpansion(parentValue.id);
                  }
                }}
                onChange={(e) => {
                  if (!hasSellingPriceRange) {
                    handleParentPriceChange(parentValue.id, childIds, e.target.value, setCombinationSellingPrices);
                  }
                }}
              />
            </div>
          </td>
          <td className="px-3 py-4">
            <div 
              className={cn(
                "flex items-center border border-input rounded-md bg-background overflow-hidden w-40",
                hasActualPriceRange && !isExpanded && "cursor-pointer hover:border-primary"
              )}
              onClick={() => {
                if (hasActualPriceRange && !isExpanded) {
                  toggleParentExpansion(parentValue.id);
                }
              }}
            >
              <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
              <input 
                type="text" 
                className={cn(
                  "flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full",
                  hasActualPriceRange && "cursor-pointer"
                )}
                placeholder="0.00"
                value={actualPriceDisplayValue}
                readOnly={hasActualPriceRange}
                onClick={(e) => {
                  if (hasActualPriceRange && !isExpanded) {
                    e.stopPropagation();
                    toggleParentExpansion(parentValue.id);
                  }
                }}
                onChange={(e) => {
                  if (!hasActualPriceRange) {
                    handleParentPriceChange(parentValue.id, childIds, e.target.value, setCombinationActualPrices);
                  }
                }}
              />
            </div>
          </td>
          <td className="px-3 py-4">
            <Input 
              className="w-20 h-10" 
              placeholder="0" 
              value={combinationQuantities[parentValue.id] || totalQuantity || ""}
              disabled={isEditMode}
              onChange={(e) => {
                const qty = parseInt(e.target.value) || 0;
                handleParentQuantityChange(parentValue.id, childIds, qty);
              }}
            />
          </td>
        </tr>
      );
      
      // Child rows - only show when expanded - clickable
      if (isExpanded) {
        childCombinations.forEach((combo, comboIdx) => {
          const combinationId = childIds[comboIdx] || `${parentValue.id}-${comboIdx}`;
          
          rows.push(
            <tr 
              key={`child-${parentValue.id}-${comboIdx}`} 
              className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => openVariantDetailModal(combinationId)}
            >
              {/* Child rows: extra left padding (pl-10 = 40px) for tree indentation */}
              <td className="w-10 pl-10 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <Checkbox checked={checkedRows.has(combinationId)} onCheckedChange={() => toggleRowCheck(combinationId)} />
                </div>
              </td>
              <td className="px-3 py-4">
                <div className="flex items-center gap-3">
                  <VariantImageUpload size="small" combinationId={combinationId} image={combinationImages[combinationId]} />
                  <span className="font-medium">{combo}</span>
                </div>
              </td>
              <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center border border-input rounded-md bg-background overflow-hidden w-32">
                  <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
                  <input 
                    type="text" 
                    className="flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full" 
                    placeholder="0.00"
                    value={combinationSellingPrices[combinationId] || ""}
                    onChange={(e) => {
                      setCombinationSellingPrices(prev => ({ ...prev, [combinationId]: e.target.value }));
                    }}
                  />
                </div>
              </td>
              <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center border border-input rounded-md bg-background overflow-hidden w-32">
                  <span className="px-2 py-2 text-sm text-muted-foreground bg-muted border-r border-input">INR</span>
                  <input 
                    type="text" 
                    className="flex-1 px-2 py-2 text-sm bg-transparent border-0 outline-none focus:ring-0 w-full" 
                    placeholder="0.00"
                    value={combinationActualPrices[combinationId] || ""}
                    onChange={(e) => {
                      setCombinationActualPrices(prev => ({ ...prev, [combinationId]: e.target.value }));
                    }}
                  />
                </div>
              </td>
              <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                <Input 
                  className="w-20 h-10" 
                  placeholder="0" 
                  value={combinationQuantities[combinationId] || ""}
                  disabled={isEditMode}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value) || 0;
                    setCombinationQuantities(prev => ({ ...prev, [combinationId]: qty }));
                  }}
                />
              </td>
            </tr>
          );
        });
      }
    });
    
    return rows;
  };

  // Variant image upload for table cells
  // Large = parent rows (12x12 = 48px), Small = child rows (10x10 = 40px)
  const VariantImageUpload = ({ 
    size = "large", 
    combinationId,
    image,
    stackedImages
  }: { 
    size?: "large" | "small";
    combinationId: string;
    image?: string;
    stackedImages?: string[];
  }) => {
    // Show stacked images if provided (for parent rows with different child images)
    if (stackedImages && stackedImages.length > 1) {
      const maxVisible = 3;
      const visibleImages = stackedImages.slice(0, maxVisible).reverse();
      const remainingCount = stackedImages.length - maxVisible;
      const stackOffset = 6;

      return (
        <div 
          className="relative cursor-pointer group flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            triggerCombinationImageUpload(combinationId);
          }}
          style={{ 
            width: 48 + (Math.min(stackedImages.length - 1, maxVisible - 1) * stackOffset), 
            height: 48 
          }}
        >
          {visibleImages.map((img, idx) => {
            const actualIndex = maxVisible - 1 - idx;
            return (
              <div
                key={idx}
                className="absolute w-12 h-12 rounded-lg overflow-hidden shadow-md transition-transform group-hover:translate-x-0.5"
                style={{
                  right: actualIndex * stackOffset,
                  top: 0,
                  zIndex: maxVisible - actualIndex,
                }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div
              className="absolute flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-xs font-medium text-foreground shadow-md"
              style={{
                right: maxVisible * stackOffset,
                top: 0,
                zIndex: 0,
              }}
            >
              +{remainingCount}
            </div>
          )}
        </div>
      );
    }

    if (image) {
      return (
        <div 
          className={cn(
            "relative rounded-lg overflow-hidden flex-shrink-0 group",
            size === "large" ? "w-12 h-12" : "w-10 h-10"
          )}
        >
          <img 
            src={image} 
            alt="Variant" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => removeCombinationImage(combinationId, e)}
              className="text-white hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerCombinationImageUpload(combinationId);
        }}
        className={cn(
          "rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center text-primary/50 cursor-pointer hover:border-primary hover:text-primary transition-colors flex-shrink-0",
          size === "large" ? "w-12 h-12" : "w-10 h-10"
        )}
      >
        <Upload className={size === "large" ? "w-5 h-5" : "w-4 h-4"} />
      </button>
    );
  };

  return (
    <div className="form-section animate-fade-in">
      {/* Hidden file input for combination images */}
      <input
        ref={combinationImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCombinationImageUpload}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Variants</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add attributes like size, color, etc.
          </p>
        </div>
        <Switch checked={isEnabled} onCheckedChange={handleToggle} />
      </div>

      {isEnabled && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Saved Variants - Compact View with Drag Reorder */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              
              setSavedVariants((items) => {
                const oldIndex = items.findIndex((i) => i.id === String(active.id));
                const newIndex = items.findIndex((i) => i.id === String(over.id));
                if (oldIndex === -1 || newIndex === -1) return items;
                return arrayMove(items, oldIndex, newIndex);
              });
            }}
          >
            <SortableContext 
              items={savedVariants.map(v => v.id)} 
              strategy={verticalListSortingStrategy}
            >
              {savedVariants.map((variant, variantIndex) => (
                <SortableVariantCard 
                  key={variant.id} 
                  variant={variant} 
                  variantIndex={variantIndex}
                  canDelete={canDeleteVariants}
                  onEdit={() => handleEditVariant(variant)}
                  onTogglePLP={() => togglePLPConfig(variant.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Inline Editing Form (first variant only - shows immediately when toggle is ON) */}
          {isInlineEditing && savedVariants.length === 0 && (
            <div className="space-y-4">
              {/* Variant Name + Type Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Variant Name</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="e.g. Color, Size, Material"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Display Type</Label>
                  {isMobile ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setTypeDropdownOpen(true)}
                        className="mt-1.5 w-full flex items-center justify-between gap-2 h-10 px-3 border border-input rounded-md bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-h-[24px]">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-muted border border-border rounded">Text</span>
                          {selectedTypes.map(type => (
                            <span key={type} className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-background border border-border rounded">
                              {type === "image" ? "Swatch Image" : type.charAt(0).toUpperCase() + type.slice(1)}
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeType(type); }} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform", typeDropdownOpen && "rotate-180")} />
                      </button>
                      <Drawer open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                        <DrawerContent>
                          <div className="p-4 space-y-2">
                            <h3 className="text-sm font-semibold mb-3">Display Type</h3>
                            <button type="button" className={cn("w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-md transition-colors", selectedTypes.includes("hex") ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")} onClick={() => toggleType("hex")}>
                              <Checkbox checked={selectedTypes.includes("hex")} className="border-muted-foreground" />
                              <span>Hex</span>
                            </button>
                            <button type="button" className={cn("w-full flex items-center gap-2.5 px-3 py-3 text-sm rounded-md transition-colors", selectedTypes.includes("image") ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground")} onClick={() => toggleType("image")}>
                              <Checkbox checked={selectedTypes.includes("image")} className="border-muted-foreground" />
                              <span>Swatch Image</span>
                            </button>
                          </div>
                        </DrawerContent>
                      </Drawer>
                    </>
                  ) : (
                  <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="mt-1.5 w-full flex items-center justify-between gap-2 h-10 px-3 border border-input rounded-md bg-background hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap flex-1 min-h-[24px]">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-muted border border-border rounded">
                            Text
                          </span>
                          {selectedTypes.map(type => (
                            <span
                              key={type}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-background border border-border rounded"
                            >
                              {type === "image" ? "Swatch Image" : type.charAt(0).toUpperCase() + type.slice(1)}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeType(type);
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                          typeDropdownOpen && "rotate-180"
                        )} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-1.5 bg-popover border border-border shadow-lg" align="start">
                      <div className="space-y-0.5">
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                            selectedTypes.includes("hex") 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => toggleType("hex")}
                        >
                          <Checkbox checked={selectedTypes.includes("hex")} className="border-muted-foreground" />
                          <span>Hex</span>
                        </button>
                        <button
                          type="button"
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                            selectedTypes.includes("image") 
                              ? "bg-primary/10 text-primary" 
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => toggleType("image")}
                        >
                          <Checkbox checked={selectedTypes.includes("image")} className="border-muted-foreground" />
                          <span>Swatch Image</span>
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  )}
                </div>
              </div>

              {/* Saved Values List */}
              {values.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleValuesDragEnd}
                >
                  <SortableContext items={valueIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {values.map((value) => (
                        <SortableValueRow 
                          key={value.id} 
                          value={value} 
                          hasHexType={hasHex}
                          hasImageType={hasImage}
                          showControls={canShowValueControls}
                          onRemove={removeValue}
                          onEdit={startEditingValue}
                          isEditing={editingValueId === value.id}
                          onUpdateLabel={(label) => {
                            setValues(prev => prev.map(v => v.id === value.id ? { ...v, label } : v));
                          }}
                          onUpdateHexColor={(hexColor) => {
                            setValues(prev => prev.map(v => v.id === value.id ? { ...v, hexColor } : v));
                          }}
                          onUpdateImages={(images) => {
                            setValues(prev => prev.map(v => v.id === value.id ? { ...v, images } : v));
                          }}
                          onFinishEdit={finishEditingValue}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Current Value Input Row - for adding new values only */}
              {showEmptyInputRow && !editingValueId && (
                <div className="flex items-center gap-3">
                  {canShowValueControls && (
                    <div className="cursor-grab text-muted-foreground hover:text-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}
                  {hasHex && (
                    <label className="relative w-10 h-10 flex-shrink-0 cursor-pointer">
                      <div
                        className="w-full h-full rounded border border-border hover:ring-2 hover:ring-primary/50 transition-all"
                        style={{ backgroundColor: currentHexColor }}
                        title="Pick color"
                      />
                      <input
                        type="color"
                        value={currentHexColor}
                        onChange={(e) => setCurrentHexColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  )}

                  {hasImage && (
                    <div className="flex items-center flex-shrink-0">
                      {currentImages.length > 0 ? (
                        <div className="relative group flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                            title="Change image"
                          >
                            <img src={currentImages[0]} alt="Swatch" className="w-full h-full object-cover" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCurrentImages([]); }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 rounded border-2 border-dashed border-primary/50 flex items-center justify-center cursor-pointer hover:border-primary transition-all"
                          title="Upload swatch image"
                        >
                          <Upload className="w-4 h-4 text-primary/50" />
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}

                  <Input
                    placeholder={
                      selectedTypes.length === 0 
                        ? "e.g. Small, Medium, Large" 
                        : hasHex && hasImage 
                          ? "e.g. Red - Front View"
                          : hasHex 
                            ? "e.g. Midnight Black"
                            : "e.g. Front View"
                    }
                    value={currentLabel}
                    onChange={(e) => setCurrentLabel(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAddValue) {
                        e.preventDefault();
                        handleAddValue();
                      }
                    }}
                  />

                  {showCurrentRowCancel && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={handleCancelCurrentRow}
                      title="Remove this row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* + Add Value Button - only show when not editing */}
              {!editingValueId && (
                showEmptyInputRow ? (
                  <button
                    type="button"
                    onClick={handleAddValue}
                    disabled={!canAddValue}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-colors",
                      canAddValue
                        ? "text-primary hover:text-primary/80"
                        : "text-muted-foreground/50 cursor-not-allowed"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    Add Value
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleShowInputRow}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Value
                  </button>
                )
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDone}
                  disabled={!hasValidData}
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Add Variant Button (when variants exist) */}
          {savedVariants.length > 0 && (
            <>
              <button
                type="button"
                data-add-variant-trigger
                onClick={handleAddVariantClick}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>

              <div className="border-t border-border" />

              {/* Variants Table */}
              <div className="space-y-3">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search" 
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Delete action bar */}
                {checkedRows.size > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border border-border rounded-lg">
                    <span className="text-sm text-foreground font-medium">{checkedRows.size} selected</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="ml-auto gap-1.5"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                )}


                {isMobile ? (
                  <div className="space-y-3">
                    {savedVariants.length === 1 ? (
                      // Single variant: flat card list
                      savedVariants[0].values.map((value) => (
                        <div
                          key={value.id}
                          className="border border-border rounded-lg p-3 space-y-3 cursor-pointer hover:border-primary/50 transition-colors bg-card"
                          onClick={() => openVariantDetailModal(value.id)}
                        >
                          <div className="flex items-center gap-3">
                            <VariantImageUpload size="large" combinationId={value.id} image={combinationImages[value.id]} />
                            <span className="font-medium text-sm flex-1">{value.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <label className="text-xs text-muted-foreground">Selling Price</label>
                              <div className="flex items-center border border-input rounded-md bg-background overflow-hidden mt-1">
                                <span className="px-2 py-1.5 text-xs text-muted-foreground bg-muted border-r border-input">INR</span>
                                <input
                                  type="text"
                                  className="flex-1 px-2 py-1.5 text-sm bg-transparent border-0 outline-none w-full"
                                  placeholder="0.00"
                                  value={combinationSellingPrices[value.id] || ""}
                                  onChange={(e) => setCombinationSellingPrices(prev => ({ ...prev, [value.id]: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Full Price</label>
                              <div className="flex items-center border border-input rounded-md bg-background overflow-hidden mt-1">
                                <span className="px-2 py-1.5 text-xs text-muted-foreground bg-muted border-r border-input">INR</span>
                                <input
                                  type="text"
                                  className="flex-1 px-2 py-1.5 text-sm bg-transparent border-0 outline-none w-full"
                                  placeholder="0.00"
                                  value={combinationActualPrices[value.id] || ""}
                                  onChange={(e) => setCombinationActualPrices(prev => ({ ...prev, [value.id]: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <label className="text-xs text-muted-foreground">Quantity</label>
                            <Input
                              className="h-9 mt-1"
                              placeholder="0"
                              value={combinationQuantities[value.id] || ""}
                              disabled={isEditMode}
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 0;
                                setCombinationQuantities(prev => ({ ...prev, [value.id]: qty }));
                              }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      // Multiple variants: parent-child cards
                      (() => {
                        const [primaryVariant] = savedVariants;
                        return primaryVariant.values.map((parentValue) => {
                          const childCombinationObjs = allCombinations.filter((c) => c.id.startsWith(`${parentValue.id}-`));
                          const isExpanded = expandedParents.has(parentValue.id);
                          const childIds = childCombinationObjs.map((c) => c.id);

                          return (
                            <div key={parentValue.id} className="border border-border rounded-lg overflow-hidden bg-card">
                              {/* Parent card */}
                              <div
                                className="p-3 bg-muted/30 flex items-center gap-3 cursor-pointer"
                                onClick={() => toggleParentExpansion(parentValue.id)}
                              >
                                <VariantImageUpload size="large" combinationId={parentValue.id} image={combinationImages[parentValue.id]} />
                                <div className="flex-1">
                                  <span className="font-medium text-sm">{parentValue.label}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    {childIds.length} Variants
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
                                  </span>
                                </div>
                              </div>
                              {/* Children */}
                              {isExpanded && childCombinationObjs.map((combo) => {
                                const parts = combo.label.split(" / ");
                                const childLabel = parts.length > 1 ? parts.slice(1).join(" / ") : combo.label;
                                return (
                                  <div
                                    key={combo.id}
                                    className="p-3 border-t border-border space-y-3 cursor-pointer hover:bg-muted/30"
                                    onClick={() => openVariantDetailModal(combo.id)}
                                  >
                                    <div className="flex items-center gap-3 pl-4">
                                      <VariantImageUpload size="small" combinationId={combo.id} image={combinationImages[combo.id]} />
                                      <span className="font-medium text-sm flex-1">{childLabel}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pl-4" onClick={(e) => e.stopPropagation()}>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Full Price</label>
                                        <div className="flex items-center border border-input rounded-md bg-background overflow-hidden mt-1">
                                          <span className="px-2 py-1.5 text-xs text-muted-foreground bg-muted border-r border-input">INR</span>
                                          <input
                                            type="text"
                                            className="flex-1 px-2 py-1.5 text-sm bg-transparent border-0 outline-none w-full"
                                            placeholder="0.00"
                                            value={combinationActualPrices[combo.id] || ""}
                                            onChange={(e) => setCombinationActualPrices(prev => ({ ...prev, [combo.id]: e.target.value }))}
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Selling Price</label>
                                        <div className="flex items-center border border-input rounded-md bg-background overflow-hidden mt-1">
                                          <span className="px-2 py-1.5 text-xs text-muted-foreground bg-muted border-r border-input">INR</span>
                                          <input
                                            type="text"
                                            className="flex-1 px-2 py-1.5 text-sm bg-transparent border-0 outline-none w-full"
                                            placeholder="0.00"
                                            value={combinationSellingPrices[combo.id] || ""}
                                            onChange={(e) => setCombinationSellingPrices(prev => ({ ...prev, [combo.id]: e.target.value }))}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="pl-4" onClick={(e) => e.stopPropagation()}>
                                      <label className="text-xs text-muted-foreground">Quantity</label>
                                      <Input
                                        className="h-9 mt-1"
                                        placeholder="0"
                                        value={combinationQuantities[combo.id] || ""}
                                        disabled={isEditMode}
                                        onChange={(e) => {
                                          const qty = parseInt(e.target.value) || 0;
                                          setCombinationQuantities(prev => ({ ...prev, [combo.id]: qty }));
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                ) : (
                  /* Desktop: Table layout */
                  <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="w-10 pl-4 pr-2 py-3">
                            <Checkbox checked={isAllSelected} onCheckedChange={toggleSelectAll} />
                          </th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground">Variant</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground">Selling Price</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground">Full Price</th>
                          <th className="px-3 py-3 text-left font-medium text-muted-foreground">On Hand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generateHierarchicalRows()}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                <div className="flex flex-col gap-2 sm:flex-row items-start sm:items-center justify-between text-sm text-muted-foreground">
                  <span>Showing 1-{savedVariants.reduce((acc, v) => acc + v.values.length, 0)} of {savedVariants.reduce((acc, v) => acc + v.values.length, 0)} results</span>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline">Rows per page</span>
                    <select className="border border-border rounded px-2 py-1 bg-background">
                      <option>10</option>
                      <option>20</option>
                      <option>50</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className="w-4 h-4 -rotate-90" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Variant Edit/Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle>{editingVariantId ? "Edit Variant" : "Add Variant"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Variant Name + Type Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Variant Name</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. Color, Size, Material"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Display Type</Label>
                <Popover open={typeDropdownOpen} onOpenChange={setTypeDropdownOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-1.5 w-full flex items-center justify-between gap-2 h-10 px-3 border border-input rounded-md bg-background hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-h-[24px]">
                        {/* Text chip - always present, not removable */}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-muted border border-border rounded">
                          Text
                        </span>
                        {selectedTypes.map(type => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-sm text-foreground bg-background border border-border rounded"
                          >
                            {type === "image" ? "Swatch Image" : type.charAt(0).toUpperCase() + type.slice(1)}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeType(type);
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform",
                        typeDropdownOpen && "rotate-180"
                      )} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-1.5 bg-popover border border-border shadow-lg" align="start">
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                          selectedTypes.includes("hex") 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted text-foreground"
                        )}
                        onClick={() => toggleType("hex")}
                      >
                        <Checkbox checked={selectedTypes.includes("hex")} className="border-muted-foreground" />
                        <span>Hex</span>
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                          selectedTypes.includes("image") 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted text-foreground"
                        )}
                        onClick={() => toggleType("image")}
                      >
                        <Checkbox checked={selectedTypes.includes("image")} className="border-muted-foreground" />
                        <span>Swatch Image</span>
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Saved Values List */}
            {values.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleValuesDragEnd}
              >
                <SortableContext items={valueIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {values.map((value) => (
                      <SortableValueRow 
                        key={value.id} 
                        value={value} 
                        hasHexType={hasHex}
                        hasImageType={hasImage}
                        showControls={canShowValueControls}
                        onRemove={removeValue}
                        onEdit={startEditingValue}
                        isEditing={editingValueId === value.id}
                        onUpdateLabel={(label) => {
                          setValues(prev => prev.map(v => v.id === value.id ? { ...v, label } : v));
                        }}
                        onUpdateHexColor={(hexColor) => {
                          setValues(prev => prev.map(v => v.id === value.id ? { ...v, hexColor } : v));
                        }}
                        onUpdateImages={(images) => {
                          setValues(prev => prev.map(v => v.id === value.id ? { ...v, images } : v));
                        }}
                        onFinishEdit={finishEditingValue}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Current Value Input Row - for adding new values only */}
            {showEmptyInputRow && !editingValueId && (
              <div className="flex items-center gap-3">
                {canShowValueControls && (
                  <div className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="w-4 h-4" />
                  </div>
                )}
                
                {/* Hex Color Picker */}
                {hasHex && (
                  <label className="relative w-10 h-10 flex-shrink-0 cursor-pointer">
                    <div
                      className="w-full h-full rounded border border-border hover:ring-2 hover:ring-primary/50 transition-all"
                      style={{ backgroundColor: currentHexColor }}
                      title="Pick color"
                    />
                    <input
                      type="color"
                      value={currentHexColor}
                      onChange={(e) => setCurrentHexColor(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </label>
                )}

                {/* Swatch Image Upload - Single Image */}
                {hasImage && (
                  <div className="flex items-center flex-shrink-0">
                    {currentImages.length > 0 ? (
                      <div className="relative group flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          title="Change image"
                        >
                          <img src={currentImages[0]} alt="Swatch" className="w-full h-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCurrentImages([]); }}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded border-2 border-dashed border-primary/50 flex items-center justify-center cursor-pointer hover:border-primary transition-all"
                        title="Upload swatch image"
                      >
                        <Upload className="w-4 h-4 text-primary/50" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                )}

                {/* Label Input */}
                <Input
                  placeholder={
                    selectedTypes.length === 0 
                      ? "e.g. Small, Medium, Large" 
                      : hasHex && hasImage 
                        ? "e.g. Red - Front View"
                        : hasHex 
                          ? "e.g. Midnight Black"
                          : "e.g. Front View"
                  }
                  value={currentLabel}
                  onChange={(e) => setCurrentLabel(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAddValue) {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                />

                {showCurrentRowCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleCancelCurrentRow}
                    title="Remove this row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* + Add Value Button - only show when not editing */}
            {!editingValueId && (
              showEmptyInputRow ? (
                <button
                  type="button"
                  onClick={handleAddValue}
                  disabled={!canAddValue}
                  className={cn(
                    "flex items-center gap-2 text-sm transition-colors",
                    canAddValue
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground/50 cursor-not-allowed"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add Value
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleShowInputRow}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Value
                </button>
              )
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleDone}
                disabled={!hasValidData}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Modal */}
      <Dialog open={galleryModal.isOpen} onOpenChange={(open) => !open && closeGalleryModal()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Manage Images</DialogTitle>
              <span className="text-sm text-muted-foreground">
                {galleryModal.images.length}/20 images
              </span>
            </div>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Sortable Image Grid */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                
                const oldIndex = galleryModal.images.findIndex((_, i) => `gallery-${i}` === active.id);
                const newIndex = galleryModal.images.findIndex((_, i) => `gallery-${i}` === over.id);
                if (oldIndex === -1 || newIndex === -1) return;
                
                const newImages = arrayMove(galleryModal.images, oldIndex, newIndex);
                setGalleryModal(prev => ({ ...prev, images: newImages }));
                galleryModal.onUpdate(newImages);
              }}
            >
              <SortableContext 
                items={galleryModal.images.map((_, i) => `gallery-${i}`)} 
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                  {galleryModal.images.map((img, idx) => (
                    <SortableGalleryImage
                      key={`gallery-${idx}`}
                      id={`gallery-${idx}`}
                      img={img}
                      onDelete={() => handleGalleryDeleteImage(idx)}
                    />
                  ))}
                  
                  {/* Add more button */}
                  {galleryModal.images.length < 20 && (
                    <button
                      type="button"
                      onClick={() => galleryFileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Upload className="w-5 h-5 text-primary/60" />
                      <span className="text-xs text-primary/60 font-medium">Add</span>
                    </button>
                  )}
                </div>
              </SortableContext>
            </DndContext>

            <input
              ref={galleryFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryImageUpload}
            />

            <div className="flex justify-end">
              <Button type="button" onClick={closeGalleryModal}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variant Detail Modal */}
      <VariantDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        productName={productName}
        productSku={productSku}
        productImage={productImage}
        combinations={allCombinations}
        selectedCombinationId={selectedCombinationId}
        variantData={variantDetailData}
        onUpdateVariantData={handleUpdateVariantData}
        combinationQuantities={combinationQuantities}
        packageDetailsPreset={packageDetails}
        combinationActualPrices={combinationActualPrices}
        combinationSellingPrices={combinationSellingPrices}
        plpEnabledCombinationIds={plpEnabledCombinationIds}
        variantGroups={savedVariants.map(v => ({ id: v.id, name: v.name }))}
        productCustomDataKeys={productCustomDataKeys}
        baseUom={baseUom}
        isEditMode={isEditMode}
        onAddVariantValue={(groupId, value) => {
          setSavedVariants(prev => prev.map(v => {
            if (v.id !== groupId) return v;
            // Don't add duplicate values
            if (v.values.some(val => val.label.toLowerCase() === value.toLowerCase())) return v;
            return {
              ...v,
              values: [...v.values, { id: Date.now().toString(), label: value, images: [] }],
            };
          }));
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Variants"
        description={`Are you sure you want to delete ${checkedRows.size} selected variant${checkedRows.size > 1 ? 's' : ''}? This action cannot be undone and will remove all associated pricing, inventory, and configuration data.`}
        onConfirm={handleDeleteCheckedVariants}
      />
    </div>
  );
});
