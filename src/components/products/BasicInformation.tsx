import { useState, useEffect } from "react";
import { Bold, Italic, Underline, Image, Link, AlignLeft, AlignCenter, AlignRight, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { useCategories } from "@/contexts/CategoriesContext";
import { ProductFormErrors } from "@/pages/CreateProduct";
import { MediaUpload } from "./MediaUpload";

const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop";

interface BasicInformationProps {
  onCategoryChange?: (categoryId: string | undefined) => void;
  errors?: ProductFormErrors;
  formData?: {
    name: string;
    category: string;
  };
  updateFormData?: (field: "name" | "category", value: string) => void;
  images?: string[];
  onImagesChange?: (images: string[]) => void;
  slug?: string;
  onSlugChange?: (slug: string) => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BasicInformation({ onCategoryChange, errors, formData, updateFormData, images = [], onImagesChange, slug: externalSlug, onSlugChange }: BasicInformationProps) {
  const { categories, addCategory } = useCategories();
  const [isEditingSlug, setIsEditingSlug] = useState(false);
  const [editingSlugValue, setEditingSlugValue] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const currentSlug = externalSlug || generateSlug(formData?.name || "");

  // Auto-generate slug from name when not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && formData?.name) {
      onSlugChange?.(generateSlug(formData.name));
    }
  }, [formData?.name, slugManuallyEdited]);
  
  // Convert categories from context to select format
  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
  }));

  const [brands, setBrands] = useState([
    { value: "apple", label: "Apple", logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/apple.svg" },
    { value: "oneplus", label: "OnePlus", logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/oneplus.svg" },
    { value: "samsung", label: "Samsung", logo: "https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/samsung.svg" },
  ]);
  const [selectedBrand, setSelectedBrand] = useState<string>();

  const handleCategoryChange = (value: string | undefined) => {
    updateFormData?.("category", value || "");
    onCategoryChange?.(value);
  };

  const handleCreateBrand = (name: string) => {
    const newValue = name.toLowerCase().replace(/\s+/g, "-");
    setBrands((prev) => [...prev, { value: newValue, label: name, logo: "" }]);
    setSelectedBrand(newValue);
  };

  const handleCreateCategory = (name: string) => {
    const newId = addCategory({
      name,
      description: "",
      attributeIds: [],
      image: DEFAULT_CATEGORY_IMAGE,
    });
    handleCategoryChange(newId);
  };

  return (
    <div className="form-section animate-fade-in">
      <h2 className="form-section-title">Basic Information</h2>

      <div className="space-y-5">
        {/* Name */}
        <div data-field="name">
          <label className="form-label">
            Name<span className="text-destructive">*</span>
          </label>
          <Input 
            placeholder="Enter product name" 
            className={`h-10 ${errors?.name ? 'border-destructive' : ''}`}
            value={formData?.name || ""}
            onChange={(e) => updateFormData?.("name", e.target.value)}
          />
          {errors?.name && (
            <p className="text-xs text-destructive mt-1">{errors.name}</p>
          )}
        </div>

        {/* Slug */}
        {(formData?.name || currentSlug) && (
          <div className="group flex items-center gap-2 min-h-[36px] -mt-3">
            <label className="form-label mb-0 shrink-0">Slug:</label>
            <div className="flex items-center gap-2 flex-1">
              {isEditingSlug ? (
                <>
                  <Input
                    value={editingSlugValue}
                    onChange={(e) => setEditingSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    className="h-9 flex-1 font-mono text-sm"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const finalSlug = editingSlugValue.replace(/-+/g, "-").replace(/^-|-$/g, "");
                      onSlugChange?.(finalSlug);
                      setSlugManuallyEdited(true);
                      setIsEditingSlug(false);
                    }}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-primary"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingSlug(false)}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground font-mono">{currentSlug || "—"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSlugValue(currentSlug);
                      setIsEditingSlug(true);
                    }}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="form-label">Description</label>
          <div className="border border-input rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-input bg-muted/30 flex-wrap">
              <Select defaultValue="paragraph">
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="h1">Heading 1</SelectItem>
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                </SelectContent>
              </Select>
              <div className="w-px h-6 bg-border mx-1 md:mx-2 hidden sm:block" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Underline className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 md:mx-2 hidden sm:block" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Image className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Link className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 md:mx-2 hidden sm:block" />
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                <AlignLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                <AlignCenter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex">
                <AlignRight className="w-4 h-4" />
              </Button>
            </div>
            <Textarea 
              placeholder="Write product description..." 
              className="border-0 rounded-none min-h-[120px] resize-none focus-visible:ring-0" 
            />
          </div>
        </div>

        {/* Media */}
        <MediaUpload 
          images={images} 
          onImagesChange={onImagesChange || (() => {})} 
          maxVisible={10}
        />

        {/* Category & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div data-field="category">
            <label className="form-label">
              Category<span className="text-destructive">*</span>
            </label>
            <CreatableSelect
              placeholder="Select a category"
              options={categoryOptions}
              value={formData?.category || ""}
              onChange={handleCategoryChange}
              onCreateNew={handleCreateCategory}
              createLabel="Add Category"
              className={errors?.category ? 'border-destructive rounded-md' : ''}
            />
            {errors?.category && (
              <p className="text-xs text-destructive mt-1">{errors.category}</p>
            )}
          </div>
          <div>
            <label className="form-label">Brand</label>
            <CreatableSelect
              placeholder="Select a brand"
              options={brands}
              value={selectedBrand}
              onChange={setSelectedBrand}
              onCreateNew={handleCreateBrand}
              createLabel="Add Brand"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
