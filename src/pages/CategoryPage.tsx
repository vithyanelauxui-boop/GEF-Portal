import { useState, useRef, useMemo } from "react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ArrowLeft, Plus, Search, X, ChevronLeft, ChevronRight, Upload, Pencil, Trash2, Info, AlertTriangle, Settings2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectAttributesModal, AttributeItem } from "@/components/categories/SelectAttributesModal";
import type { BreadcrumbLevel, CategoryAttributeOverride } from "@/contexts/CategoriesContext";
import { useAttributes } from "@/contexts/AttributesContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { useProducts } from "@/contexts/ProductsContext";
 import { useToast } from "@/hooks/use-toast";
 import { categoryFormSchema, validateImageFile, VALIDATION_LIMITS } from "@/lib/validations";
import emptyAttributesImg from "@/assets/empty-attributes.png";
import overrideIcon from "@/assets/override-icon.svg";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Map data types to display labels
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

type ViewMode = "list" | "create" | "edit";

export default function CategoryPage() {
  const { attributes } = useAttributes();
  const { categories, addCategory, updateCategory, deleteCategory, getCategoryById, isNameTaken, isSlugTaken } = useCategories();
  const { products } = useProducts();
   const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
   const [nameError, setNameError] = useState<string | null>(null);
   const [slugError, setSlugError] = useState<string | null>(null);
   const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [catRowsPerPage, setCatRowsPerPage] = useState("10");
  const [catCurrentPage, setCatCurrentPage] = useState(1);

  // Category usage map
  const categoryUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cat of categories) {
      map.set(cat.id, products.filter(p => p.category === cat.id).length);
    }
    return map;
  }, [categories, products]);

  // Convert shared attributes to modal format
  const availableAttributes: AttributeItem[] = attributes.map(attr => ({
    id: attr.id,
    name: attr.name,
    type: dataTypeLabels[attr.dataType] || attr.dataType
  }));

  // Form state
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [landscapeBanner, setLandscapeBanner] = useState<string | null>(null);
  const [landscapeBannerFile, setLandscapeBannerFile] = useState<{ name: string; size: string } | null>(null);
  const [mobileBanner, setMobileBanner] = useState<string | null>(null);
  const [mobileBannerFile, setMobileBannerFile] = useState<{ name: string; size: string } | null>(null);
  const [breadcrumbLevels, setBreadcrumbLevels] = useState<BreadcrumbLevel[]>([
    { id: "default", typeId: "", typeName: "", value: "" }
  ]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [attributeOverrides, setAttributeOverrides] = useState<CategoryAttributeOverride[]>([]);
  const [overrideModalAttr, setOverrideModalAttr] = useState<string | null>(null);
  const [overrideValues, setOverrideValues] = useState<string[]>([]);
  const [overrideColorValues, setOverrideColorValues] = useState<{hex: string; name: string}[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const landscapeBannerInputRef = useRef<HTMLInputElement>(null);
  const mobileBannerInputRef = useRef<HTMLInputElement>(null);

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  // Attributes table state
  const [attributeSearch, setAttributeSearch] = useState("");
  const [attributeTypeFilter, setAttributeTypeFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  const resetForm = () => {
    setCategoryName("");
    setCategorySlug("");
    setCategoryDescription("");
    setCategoryImage(null);
    setLandscapeBanner(null);
    setLandscapeBannerFile(null);
    setMobileBanner(null);
    setMobileBannerFile(null);
    setBreadcrumbLevels([{ id: "default", typeId: "", typeName: "", value: "" }]);
    setSelectedAttributeIds([]);
    setAttributeOverrides([]);
    setAttributeSearch("");
    setAttributeTypeFilter("all");
    setOriginalName("");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'landscape' | 'mobile') => {
    const file = e.target.files?.[0];
    if (!file) return;
     
     // Validate image file
     const validation = validateImageFile(file);
     if (!validation.valid) {
       toast({
         title: "Invalid Image",
         description: validation.error,
         variant: "destructive",
       });
       return;
     }
     
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (type === 'main') {
        setCategoryImage(result);
      } else if (type === 'landscape') {
        setLandscapeBanner(result);
        setLandscapeBannerFile({ name: file.name, size: formatFileSize(file.size) });
      } else if (type === 'mobile') {
        setMobileBanner(result);
        setMobileBannerFile({ name: file.name, size: formatFileSize(file.size) });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (type: 'main' | 'landscape' | 'mobile') => {
    if (type === 'main') {
      setCategoryImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    } else if (type === 'landscape') {
      setLandscapeBanner(null);
      setLandscapeBannerFile(null);
      if (landscapeBannerInputRef.current) landscapeBannerInputRef.current.value = "";
    } else if (type === 'mobile') {
      setMobileBanner(null);
      setMobileBannerFile(null);
      if (mobileBannerInputRef.current) mobileBannerInputRef.current.value = "";
    }
  };

   const validateCategoryForm = (): boolean => {
     const result = categoryFormSchema.safeParse({
       name: categoryName,
       description: categoryDescription,
     });
     
     if (!result.success) {
       const errors = result.error.flatten().fieldErrors;
       setNameError(errors.name?.[0] || null);
       setDescriptionError(errors.description?.[0] || null);
       return false;
     }

     // Check name uniqueness
     if (isNameTaken(categoryName, editingCategoryId || undefined)) {
       setNameError("A category with this name already exists");
       return false;
     }

     // Check slug uniqueness
     const slug = generateSlug(categoryName);
     if (isSlugTaken(slug, editingCategoryId || undefined)) {
       setSlugError("This slug is already taken");
       return false;
     }
     
     setNameError(null);
     setSlugError(null);
     setDescriptionError(null);
     return true;
   };
 
   const executeSave = () => {
     const validLevels = breadcrumbLevels.filter(l => l.typeId && l.value);
     if (viewMode === "edit" && editingCategoryId) {
        updateCategory(editingCategoryId, {
          name: categoryName,
          description: categoryDescription,
          attributeIds: selectedAttributeIds,
          attributeOverrides: attributeOverrides.length > 0 ? attributeOverrides : undefined,
          image: categoryImage || undefined,
          landscapeBanner: landscapeBanner || undefined,
          mobileBanner: mobileBanner || undefined,
          breadcrumbLevels: validLevels.length > 0 ? validLevels : undefined
        });
     } else {
        addCategory({
          name: categoryName,
          description: categoryDescription,
          attributeIds: selectedAttributeIds,
          attributeOverrides: attributeOverrides.length > 0 ? attributeOverrides : undefined,
          image: categoryImage || undefined,
          landscapeBanner: landscapeBanner || undefined,
          mobileBanner: mobileBanner || undefined,
          breadcrumbLevels: validLevels.length > 0 ? validLevels : undefined
        });
     }
     resetForm();
     setEditingCategoryId(null);
     setViewMode("list");
   };

   const handleCreateCategory = () => {
     if (!validateCategoryForm()) {
       toast({
         title: "Validation Error",
         description: "Please fix the errors before saving",
         variant: "destructive",
       });
       return;
     }
     executeSave();
   };

  const handleSaveCategory = () => {
     if (!validateCategoryForm()) {
       toast({
         title: "Validation Error",
         description: "Please fix the errors before saving",
         variant: "destructive",
       });
       return;
     }

     // Show rename warning if name changed during edit
     if (viewMode === "edit" && editingCategoryId && originalName && categoryName.trim() !== originalName.trim()) {
       setShowRenameDialog(true);
       return;
     }

     executeSave();
   };

  const handleEditCategory = (catId: string) => {
    const category = getCategoryById(catId);
    if (category) {
      setCategoryName(category.name);
      setCategorySlug(category.slug);
      setCategoryDescription(category.description);
      setCategoryImage(category.image || null);
      setLandscapeBanner(category.landscapeBanner || null);
      setMobileBanner(category.mobileBanner || null);
      setBreadcrumbLevels(
        category.breadcrumbLevels && category.breadcrumbLevels.length > 0 
          ? category.breadcrumbLevels 
          : [{ id: "default", typeId: "", typeName: "", value: "" }]
      );
      setSelectedAttributeIds(category.attributeIds);
      setAttributeOverrides(category.attributeOverrides || []);
      setEditingCategoryId(catId);
      setOriginalName(category.name);
      setViewMode("edit");
    }
  };

  const handleDeleteCategory = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cat = getCategoryById(catId);
    setDeleteTarget({ id: catId, name: cat?.name || "this category" });
  };

  const handleRemoveAttribute = (attrId: string) => {
    setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attrId));
    setAttributeOverrides(prev => prev.filter(o => o.attributeId !== attrId));
  };

  // Check if attribute is overridable (dropdown or color)
  const isOverridableAttr = (attrId: string) => {
    const attr = attributes.find(a => a.id === attrId);
    return attr && (attr.dataType === "dropdown" || attr.dataType === "color");
  };

  const getAttrDataType = (attrId: string) => {
    return attributes.find(a => a.id === attrId)?.dataType;
  };

  const getOriginalValues = (attrId: string) => {
    const attr = attributes.find(a => a.id === attrId);
    if (!attr) return { dropdown: [] as string[], colors: [] as {hex: string; name: string}[] };
    if (attr.dataType === "dropdown") {
      return { dropdown: (attr.validation?.predefinedValues as string[]) || [], colors: [] };
    }
    if (attr.dataType === "color") {
      return { dropdown: [], colors: (attr.validation?.colors as {hex: string; name: string}[]) || [] };
    }
    return { dropdown: [], colors: [] };
  };

  const hasOverride = (attrId: string) => attributeOverrides.some(o => o.attributeId === attrId);

  const openOverrideModal = (attrId: string) => {
    const dataType = getAttrDataType(attrId);
    const existing = attributeOverrides.find(o => o.attributeId === attrId);
    const original = getOriginalValues(attrId);

    if (dataType === "dropdown") {
      setOverrideValues(existing ? existing.values : [...original.dropdown]);
      setOverrideColorValues([]);
    } else if (dataType === "color") {
      setOverrideColorValues(existing
        ? existing.values.map(v => { try { return JSON.parse(v); } catch { return { hex: "#000000", name: v }; } })
        : [...original.colors]
      );
      setOverrideValues([]);
    }
    setOverrideModalAttr(attrId);
  };

  const saveOverride = () => {
    if (!overrideModalAttr) return;
    const dataType = getAttrDataType(overrideModalAttr);
    let values: string[] = [];
    if (dataType === "dropdown") {
      values = overrideValues.filter(v => v.trim());
    } else if (dataType === "color") {
      values = overrideColorValues.filter(c => c.name.trim()).map(c => JSON.stringify(c));
    }
    if (values.length === 0) {
      // Remove override
      setAttributeOverrides(prev => prev.filter(o => o.attributeId !== overrideModalAttr));
    } else {
      setAttributeOverrides(prev => {
        const filtered = prev.filter(o => o.attributeId !== overrideModalAttr);
        return [...filtered, { attributeId: overrideModalAttr, values }];
      });
    }
    setOverrideModalAttr(null);
  };

  const removeOverride = (attrId: string) => {
    setAttributeOverrides(prev => prev.filter(o => o.attributeId !== attrId));
  };

  // Get selected attributes details
  const selectedAttributes = availableAttributes.filter(a => selectedAttributeIds.includes(a.id));

  // Filter and paginate selected attributes for the table
  const filteredSelectedAttributes = selectedAttributes.filter(attr => {
    const matchesSearch = attr.name.toLowerCase().includes(attributeSearch.toLowerCase());
    const matchesType = attributeTypeFilter === "all" || attr.type === attributeTypeFilter;
    return matchesSearch && matchesType;
  });

  const attributeTypes: string[] = [...new Set(selectedAttributes.map(a => a.type))];
  const totalResults = filteredSelectedAttributes.length;
  const totalPages = Math.ceil(totalResults / parseInt(rowsPerPage));
  const startIndex = (currentPage - 1) * parseInt(rowsPerPage);
  const endIndex = Math.min(startIndex + parseInt(rowsPerPage), totalResults);
  const paginatedAttributes = filteredSelectedAttributes.slice(startIndex, endIndex);

  // Filter categories by search
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  ).sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));
  const catTotalResults = filteredCategories.length;
  const catTotalPages = Math.ceil(catTotalResults / parseInt(catRowsPerPage));
  const catStartIndex = (catCurrentPage - 1) * parseInt(catRowsPerPage);
  const catEndIndex = Math.min(catStartIndex + parseInt(catRowsPerPage), catTotalResults);
  const paginatedCategories = filteredCategories.slice(catStartIndex, catEndIndex);

  // Empty State View
  const renderEmptyState = () => (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex flex-col items-center justify-center py-20">
        <img src={emptyAttributesImg} alt="No category" className="w-40 h-40 mb-6" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No category found
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Once you create category they will appear here
        </p>
        <div className="flex gap-3">
          <Button variant="outline">Learn more</Button>
          <Button onClick={() => setViewMode("create")}>Create category</Button>
        </div>
      </div>
    </div>
  );

  // Category List View (table-based, matching attributes style)
  const renderCategoryList = () => (
    <div className="bg-card rounded-lg border border-border">
      <div>
        {/* Search */}
      <div className="p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
           <div className="relative flex-1 md:w-64 md:flex-none">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search"
               value={categorySearch}
               onChange={(e) => { setCategorySearch(e.target.value); setCatCurrentPage(1); }}
               className="pl-9 h-9"
             />
           </div>
         </div>

        {/* Table */}
         <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Category</TableHead>
                <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Slug</TableHead>
                <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Last Modified by</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Usage</TableHead>
                <TableHead className="w-[80px] md:w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedCategories.map((cat) => {
              const usage = categoryUsageMap.get(cat.id) ?? 0;
              return (
                <TableRow key={cat.id} className="group cursor-pointer" onClick={() => handleEditCategory(cat.id)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Upload className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span>{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm hidden md:table-cell">{cat.slug}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{cat.lastModifiedAt}</TableCell>
                   <TableCell className="text-right text-muted-foreground text-sm">{usage} {usage > 1 ? 'products' : 'product'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditCategory(cat.id); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleDeleteCategory(cat.id, e)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
           </TableBody>
         </Table>
         </div>
        {filteredCategories.length === 0 && categorySearch && (
          <div className="py-12 text-center text-muted-foreground">
            No categories match your search
          </div>
        )}

        {/* Pagination */}
        {catTotalResults > 0 && (
          <div className="p-3 md:p-4 flex flex-col gap-2 md:flex-row items-start md:items-center justify-between border-t border-border">
             <span className="text-sm text-muted-foreground">
               Showing {catStartIndex + 1}-{catEndIndex} of {catTotalResults} results
             </span>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground hidden md:inline">Rows per page</span>
                <Select value={catRowsPerPage} onValueChange={setCatRowsPerPage}>
                  <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCatCurrentPage((p) => Math.max(1, p - 1))} disabled={catCurrentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCatCurrentPage((p) => Math.min(catTotalPages, p + 1))} disabled={catCurrentPage >= catTotalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Create/Edit Category Form View
  const renderCategoryForm = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => {
             resetForm();
             setEditingCategoryId(null);
             setViewMode("list");
           }}>
             <ArrowLeft className="w-5 h-5" />
           </Button>
           <h1 className="text-lg md:text-2xl font-semibold text-foreground">
             {viewMode === "edit" ? "Edit Category" : "Create Category"}
          </h1>
        </div>
        <Button onClick={handleSaveCategory} disabled={!categoryName.trim()}>
          Save
        </Button>
      </div>

      {/* Basic Information Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="space-y-4">
          {/* Image + Name in single row */}
           <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            {/* Image Upload */}
            {categoryImage ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border group flex-shrink-0">
                <img src={categoryImage} alt="Category" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage('main')}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-primary/50 cursor-pointer hover:border-primary transition-colors flex-shrink-0 flex flex-col items-center justify-center"
              >
                <Upload className="w-5 h-5 text-primary/50" />
              </div>
            )}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'main')} />

            {/* Name & Slug */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-col md:flex-row items-stretch md:items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="name">
                    Name<span className="text-destructive">*</span>
                  </Label>
                   <Input 
                     id="name" 
                     value={categoryName} 
                     onChange={e => {
                       const val = e.target.value;
                       setCategoryName(val);
                       const newSlug = generateSlug(val);
                       setCategorySlug(newSlug);
                       // Inline name uniqueness check
                       if (val.trim() && isNameTaken(val, editingCategoryId || undefined)) {
                         setNameError("A category with this name already exists");
                       } else {
                         setNameError(null);
                       }
                       // Inline slug uniqueness check
                       if (newSlug && isSlugTaken(newSlug, editingCategoryId || undefined)) {
                         setSlugError("This slug is already taken");
                       } else {
                         setSlugError(null);
                       }
                     }} 
                     placeholder="" 
                     className={`h-12 ${nameError ? 'border-destructive' : ''}`}
                     maxLength={VALIDATION_LIMITS.NAME_MAX_LENGTH}
                   />
                   {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Category Slug</Label>
                  <Input
                    value={categorySlug}
                    readOnly
                    disabled
                    className={`h-12 font-mono text-sm bg-muted/50 cursor-not-allowed ${slugError ? 'border-destructive' : ''}`}
                  />
                  {slugError && <p className="text-xs text-destructive mt-1">{slugError}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Category Description</Label>
             <Textarea 
               id="description" 
               value={categoryDescription} 
               onChange={e => {
                 setCategoryDescription(e.target.value);
                 if (descriptionError) setDescriptionError(null);
               }} 
               placeholder="" 
               rows={3}
               className={descriptionError ? 'border-destructive' : ''}
               maxLength={VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH}
             />
             {descriptionError && <p className="text-xs text-destructive mt-1">{descriptionError}</p>}
          </div>

          {/* Media Section */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portrait Banner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Portrait Banner</Label>
                  {mobileBanner && (
                    <button
                      onClick={() => setPreviewImage(mobileBanner)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Preview
                    </button>
                  )}
                </div>
                {mobileBanner && mobileBannerFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border group">
                    <div className="relative">
                      <img 
                        src={mobileBanner} 
                        alt="Portrait Banner" 
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage('mobile')}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-background border border-border rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white hover:border-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{mobileBannerFile.name}</p>
                      <p className="text-xs text-muted-foreground">Size: {mobileBannerFile.size}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => mobileBannerInputRef.current?.click()}
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                      <Upload className="w-5 h-5 text-primary/70" />
                      <span className="text-[10px] text-primary/70 font-medium">Upload</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Upload/ Drag & drop a document here</li>
                      <li>Accepted file type: .png, .jpeg, .webp, .bmp (max. image size: 3MB)</li>
                      <li>Aspect ratio: 13:20</li>
                    </ul>
                  </div>
                )}
                <input ref={mobileBannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'mobile')} />
              </div>

              {/* Landscape Banner */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm">Landscape Banner</Label>
                  {landscapeBanner && (
                    <button
                      onClick={() => setPreviewImage(landscapeBanner)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Preview
                    </button>
                  )}
                </div>
                {landscapeBanner && landscapeBannerFile ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border group">
                    <div className="relative">
                      <img 
                        src={landscapeBanner} 
                        alt="Landscape Banner" 
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage('landscape')}
                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-background border border-border rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white hover:border-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{landscapeBannerFile.name}</p>
                      <p className="text-xs text-muted-foreground">Size: {landscapeBannerFile.size}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => landscapeBannerInputRef.current?.click()}
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 flex-shrink-0">
                      <Upload className="w-5 h-5 text-primary/70" />
                      <span className="text-[10px] text-primary/70 font-medium">Upload</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Upload/ Drag & drop a document here</li>
                      <li>Accepted file type: .png, .jpeg, .webp, .bmp (max. image size: 3MB)</li>
                      <li>Aspect ratio: 13:20</li>
                    </ul>
                  </div>
                )}
                <input ref={landscapeBannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'landscape')} />
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Add Attributes Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-semibold text-foreground">Add Attributes</h2>
            <p className="text-sm text-muted-foreground">
              Select all attributes to apply to this category
            </p>
          </div>
          <Button variant="outline" onClick={() => setSelectModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Show attributes table if any selected */}
        {selectedAttributeIds.length > 0 && (
          <div className="mt-6">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
              <div className="relative flex-1 md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search here" value={attributeSearch} onChange={e => setAttributeSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={attributeTypeFilter} onValueChange={setAttributeTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Attribute Type: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Attribute Type: All</SelectItem>
                  {attributeTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
               <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-muted-foreground font-medium">
                      Attribute
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium hidden md:table-cell">
                      Attribute type
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium text-right hidden md:table-cell">
                      Usage
                    </TableHead>
                    <TableHead className="text-muted-foreground font-medium hidden md:table-cell">
                      Override
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAttributes.map(attr => {
                    const overridable = isOverridableAttr(attr.id);
                    const overridden = hasOverride(attr.id);
                    // Count products using this attribute
                    const attrUsage = products.filter(p => p.attributes?.some(a => a.id === attr.id && a.values.length > 0)).length;
                    return (
                      <TableRow key={attr.id}>
                        <TableCell className="font-semibold">{attr.name}</TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">{attr.type}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground hidden md:table-cell">
                          {attrUsage} {attrUsage > 1 ? 'products' : 'product'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {overridable ? (
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => openOverrideModal(attr.id)}
                                      className={`p-1.5 rounded-md transition-colors ${overridden ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                    >
                                      <img src={overrideIcon} alt="Override" className="w-4 h-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{overridden ? 'Edit override values' : `Override predefined ${getAttrDataType(attr.id) === 'color' ? 'colour' : 'dropdown'} values`}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {overridden && (
                                <Badge variant="info" className="text-[10px] px-1.5 py-0">
                                  Overridden
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button onClick={() => handleRemoveAttribute(attr.id)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="p-4 flex flex-col gap-2 md:flex-row items-start md:items-center justify-between border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Result {startIndex + 1} - {endIndex} of {totalResults}
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden md:inline">Attributes per page</span>
                    <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Select Attributes Modal */}
      <SelectAttributesModal open={selectModalOpen} onOpenChange={setSelectModalOpen} availableAttributes={availableAttributes} selectedAttributeIds={selectedAttributeIds} onSave={setSelectedAttributeIds} />

      {/* Override Values Modal */}
      <Dialog open={!!overrideModalAttr} onOpenChange={(open) => !open && setOverrideModalAttr(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {overrideModalAttr && getAttrDataType(overrideModalAttr) === "color"
                ? "Override Colour Values"
                : "Override Dropdown Values"
              }
            </DialogTitle>
            <DialogDescription>
              {overrideModalAttr && getAttrDataType(overrideModalAttr) === "color"
                ? "Customize the predefined colour choices for this category. These will replace the default attribute colours."
                : "Customize the predefined dropdown choices for this category. These will replace the default attribute values."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-2">
            {overrideModalAttr && getAttrDataType(overrideModalAttr) === "dropdown" && (
              <>
                {overrideValues.map((val, idx) => {
                  const valUsage = val.trim() ? products.filter(p => p.attributes?.some(a => a.id === overrideModalAttr && a.values.some(v => v.value === val))).length : 0;
                  return (
                    <div key={idx} className="flex items-center gap-2 min-w-0">
                      <Input
                        value={val}
                        onChange={(e) => {
                          const updated = [...overrideValues];
                          updated[idx] = e.target.value;
                          setOverrideValues(updated);
                        }}
                        placeholder={`Value ${idx + 1}`}
                        className="flex-1 min-w-0"
                      />
                      {val.trim() && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{valUsage} {valUsage > 1 ? 'products' : 'product'}</span>
                      )}
                      <button
                        onClick={() => setOverrideValues(overrideValues.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrideValues([...overrideValues, ""])}
                  className="gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Value
                </Button>
              </>
            )}

            {overrideModalAttr && getAttrDataType(overrideModalAttr) === "color" && (
              <>
                {overrideColorValues.map((color, idx) => {
                  const colorUsage = color.name.trim() ? products.filter(p => p.attributes?.some(a => a.id === overrideModalAttr && a.values.some(v => v.value === color.name))).length : 0;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => {
                          const updated = [...overrideColorValues];
                          updated[idx] = { ...updated[idx], hex: e.target.value };
                          setOverrideColorValues(updated);
                        }}
                        className="w-9 h-9 rounded-md border border-border cursor-pointer p-0.5"
                      />
                      <Input
                        value={color.name}
                        onChange={(e) => {
                          const updated = [...overrideColorValues];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setOverrideColorValues(updated);
                        }}
                        placeholder="Colour name"
                        className="flex-1"
                      />
                      {color.name.trim() && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{colorUsage} {colorUsage > 1 ? 'products' : 'product'}</span>
                      )}
                      <button
                        onClick={() => setOverrideColorValues(overrideColorValues.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOverrideColorValues([...overrideColorValues, { hex: "#000000", name: "" }])}
                  className="gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Colour
                </Button>
              </>
            )}
          </div>

          <DialogFooter className="flex items-center gap-2">
            {overrideModalAttr && hasOverride(overrideModalAttr) && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive mr-auto"
                onClick={() => { removeOverride(overrideModalAttr); setOverrideModalAttr(null); }}
              >
                Remove Override
              </Button>
            )}
            <Button variant="outline" onClick={() => setOverrideModalAttr(null)}>Cancel</Button>
            <Button onClick={saveOverride}>Save Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <DashboardLayout>
       <div className="p-4 md:p-6">
         {viewMode === "list" ? (
           <>
             {/* Header */}
             <div className="flex items-center justify-between mb-4 md:mb-6">
               <h1 className="text-xl md:text-2xl font-semibold text-foreground">Category</h1>
               {categories.length > 0 && (
                <Button onClick={() => setViewMode("create")}>
                  Create Category
                </Button>
              )}
            </div>

            {/* Content */}
            {categories.length === 0 ? renderEmptyState() : renderCategoryList()}
          </>
        ) : (
          renderCategoryForm()
        )}
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-none">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-3 right-3 z-10 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {previewImage && (
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Confirmation Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Category Rename</DialogTitle>
            <DialogDescription>
              You are renaming the category from <strong>{originalName}</strong> to <strong>{categoryName}</strong>. Please review the impact carefully:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Product updates:</span><br />
                {categoryUsageMap.get(editingCategoryId!) ?? 0} product{(categoryUsageMap.get(editingCategoryId!) ?? 0) === 1 ? '' : 's'} currently associated with <strong>{originalName}</strong> will be updated to <strong>{categoryName}</strong>.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Filter & rule impact:</span><br />
                Any filters, discounts, offers, collections, or merchandising rules using the category <strong>{originalName}</strong> will not automatically apply to <strong>{categoryName}</strong> and may need to be updated manually.
              </AlertDescription>
            </Alert>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Team communication:</span><br />
                We recommend informing relevant teams about this change to avoid inconsistencies.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>Cancel</Button>
            <Button onClick={() => { setShowRenameDialog(false); executeSave(); }}>Confirm Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.name}?`}
        description={`Are you sure you want to delete ${deleteTarget?.name}? Deleting this category will remove it from all associated products.`}
        onConfirm={() => { if (deleteTarget) deleteCategory(deleteTarget.id); }}
      />
    </DashboardLayout>
  );
}
