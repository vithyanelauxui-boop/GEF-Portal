import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Search, Upload, X, Trash2, Building2, AlertTriangle, Pencil, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBrands, generateSlug, type BrandImage } from "@/contexts/BrandsContext";
import { useProducts } from "@/contexts/ProductsContext";
import { VALIDATION_LIMITS } from "@/lib/validations";
import emptyImg from "@/assets/empty-attributes.png";
import { MultiSelectTags } from "@/components/ui/multi-select-tags";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type ViewMode = "list" | "create" | "edit";

const BRAND_IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const ASPECT_CONFIG = {
  logo: { label: "Logo", ratio: "1:1", css: "aspect-square", w: 120, h: 120 },
  portrait: { label: "Portrait Banner", ratio: "13:20", css: "aspect-[13/20]", w: 520, h: 800 },
  landscape: { label: "Landscape Banner", ratio: "27:20", css: "aspect-[27/20]", w: 1080, h: 800 },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isOptimisedForWeb(bytes: number): boolean {
  return bytes <= 200 * 1024; // under 200 KB considered web-optimised
}

/** Compress an image via canvas. Returns { dataUrl, size } */
async function compressImage(src: string, maxDim: number, quality = 0.7): Promise<{ dataUrl: string; size: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/webp", quality);
      // estimate size from base64
      const base64 = dataUrl.split(",")[1] || "";
      const size = Math.round((base64.length * 3) / 4);
      resolve({ dataUrl, size });
    };
    img.src = src;
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

export default function BrandsPage() {
  const { brands, addBrand, updateBrand, deleteBrand, getBrandById, isSlugTaken, isNameTaken } = useBrands();
  const { products } = useProducts();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Compute usage (product count) per brand
  const brandUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const brand of brands) {
      map.set(brand.id, products.filter(p => p.brand === brand.id).length);
    }
    return map;
  }, [brands, products]);

  // Default suggested tags + any unique tags from existing brands
  const DEFAULT_BRAND_TAGS = ["Premium", "Mass", "Luxury", "Value", "Budget"];
  const allTagOptions = useMemo(() => {
    const tagSet = new Set<string>(DEFAULT_BRAND_TAGS);
    brands.forEach(b => (b.tags || []).forEach(t => tagSet.add(t)));
    return [...tagSet].map(t => ({ value: t, label: t }));
  }, [brands]);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugWarning, setSlugWarning] = useState<string | null>(null);
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [showRenameWarning, setShowRenameWarning] = useState(false);
  const [voice, setVoice] = useState("");
  const [logo, setLogo] = useState<BrandImage | null>(null);
  const [portraitBanner, setPortraitBanner] = useState<BrandImage | null>(null);
  const [landscapeBanner, setLandscapeBanner] = useState<BrandImage | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // Optimised toggle per image
  const [showOptimised, setShowOptimised] = useState<Record<string, boolean>>({ logo: false, portrait: false, landscape: false });

  // Preview dialog state
  const [previewImage, setPreviewImage] = useState<{ src: string; label: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const landscapeInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate slug from name always
  useEffect(() => {
    const generated = generateSlug(name);
    setSlug(generated);
    setSlugWarning(generated && isSlugTaken(generated, editingBrandId || undefined) ? "This slug is already taken" : null);
  }, [name, editingBrandId]);

  const handleNameChange = (value: string) => {
    setName(value);
    setNameWarning(value.trim() && isNameTaken(value, editingBrandId || undefined) ? "A brand with this name already exists" : null);
  };

  const resetForm = () => {
    setName(""); setSlug(""); setSlugWarning(null); setNameWarning(null); setOriginalName("");
    setVoice(""); setTags([]); setLogo(null); setPortraitBanner(null); setLandscapeBanner(null);
    setShowOptimised({ logo: false, portrait: false, landscape: false });
  };

  const processImage = useCallback(async (
    src: string,
    fileSize: number,
    setter: (img: BrandImage | null) => void,
    maxCompressDim: number,
  ) => {
    const dims = await getImageDimensions(src);
    const compressed = await compressImage(src, maxCompressDim);
    setter({
      original: src,
      optimised: compressed.dataUrl,
      originalSize: fileSize,
      optimisedSize: compressed.size,
      altText: "",
      width: dims.width,
      height: dims.height,
    });
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (img: BrandImage | null) => void,
    maxCompressDim: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VALIDATION_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      toast({ title: "Invalid Image", description: "Allowed: JPG, PNG, WEBP, GIF", variant: "destructive" });
      return;
    }
    if (file.size > BRAND_IMAGE_MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 2 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      processImage(dataUrl, file.size, setter, maxCompressDim);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };


  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Brand name is required", variant: "destructive" });
      return false;
    }
    if (!slug.trim()) {
      toast({ title: "Validation Error", description: "Brand slug is required", variant: "destructive" });
      return false;
    }
    if (slugWarning) {
      toast({ title: "Slug Conflict", description: "Please resolve the slug conflict before saving", variant: "destructive" });
      return false;
    }
    if (nameWarning) {
      toast({ title: "Name Conflict", description: "A brand with this name already exists", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // If editing and name changed, show warning dialog
    if (viewMode === "edit" && editingBrandId && name.trim() !== originalName) {
      setShowRenameWarning(true);
      return;
    }

    executeSave();
  };

  const executeSave = () => {
    const payload = { name, slug, voice, tags, logo, portraitBanner, landscapeBanner };
    if (viewMode === "edit" && editingBrandId) {
      updateBrand(editingBrandId, payload);
    } else {
      addBrand(payload);
    }
    setShowRenameWarning(false);
    resetForm();
    setEditingBrandId(null);
    setViewMode("list");
  };

  const handleEdit = (id: string) => {
    const brand = getBrandById(id);
    if (!brand) return;
    setName(brand.name);
    setOriginalName(brand.name);
    setSlug(brand.slug);
    setSlugWarning(null);
    setNameWarning(null);
    setVoice(brand.voice);
    setTags(brand.tags || []);
    setLogo(brand.logo);
    setPortraitBanner(brand.portraitBanner);
    setLandscapeBanner(brand.landscapeBanner);
    setEditingBrandId(id);
    setViewMode("edit");
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id, name });
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  ).sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));
  const totalResults = filteredBrands.length;
  const totalPages = Math.ceil(totalResults / parseInt(rowsPerPage));
  const startIndex = (currentPage - 1) * parseInt(rowsPerPage);
  const endIndex = Math.min(startIndex + parseInt(rowsPerPage), totalResults);
  const paginatedBrands = filteredBrands.slice(startIndex, endIndex);

  // ---------- Upload Card (matches category design) ----------
  const UploadCard = ({
    imageKey,
    config,
    value,
    onUpload,
    onRemove,
    onAltChange,
    inputRef,
  }: {
    imageKey: string;
    config: typeof ASPECT_CONFIG[keyof typeof ASPECT_CONFIG];
    value: BrandImage | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    onAltChange: (alt: string) => void;
    inputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const useOpt = showOptimised[imageKey];
    const displaySrc = value ? (useOpt && value.optimised ? value.optimised : value.original) : null;
    const displaySize = value ? (useOpt && value.optimisedSize != null ? value.optimisedSize : value.originalSize) : 0;
    const webOptimised = displaySize > 0 && isOptimisedForWeb(displaySize);

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">{config.label}</Label>
          {value && (
            <button
              onClick={() => setPreviewImage({ src: displaySrc!, label: config.label })}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Preview
            </button>
          )}
        </div>

        {value ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border group">
              <div className="relative">
                <img src={displaySrc!} alt={value.altText || config.label} className="w-14 h-14 rounded-lg object-cover" />
                <button
                  onClick={onRemove}
                  className="absolute -top-1.5 -right-1.5 p-0.5 bg-background border border-border rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-white hover:border-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{value.width}×{value.height}</p>
                <p className="text-xs text-muted-foreground">
                  Size: {displaySize > 0 ? formatBytes(displaySize) : "URL"}
                  {displaySize > 0 && (
                    <span className={`ml-2 ${webOptimised ? "text-primary" : "text-destructive"}`}>
                      {webOptimised ? "• Web ready" : "• Large"}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Optimise toggle */}
            {value.optimised && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Original: {value.originalSize > 0 ? formatBytes(value.originalSize) : "URL"}</span>
                  <span>Optimised: {formatBytes(value.optimisedSize!)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{useOpt ? "Optimised" : "Original"}</span>
                  <Switch
                    checked={useOpt}
                    onCheckedChange={(v) => setShowOptimised((p) => ({ ...p, [imageKey]: v }))}
                    className="scale-75 origin-right"
                  />
                </div>
              </div>
            )}

            {/* Alt text */}
            <Input
              placeholder="Alt text"
              value={value.altText}
              onChange={(e) => onAltChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors"
          >
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 flex-shrink-0">
              <Upload className="w-5 h-5 text-primary/70" />
              <span className="text-[10px] text-primary/70 font-medium">Upload</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Upload/ Drag & drop a document here</li>
              <li>Accepted file type: .png, .jpeg, .webp, .bmp (max. image size: 2MB)</li>
              <li>Aspect ratio: {config.ratio}</li>
            </ul>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    );
  };

  // ---------- Views ----------
  const renderEmptyState = () => (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex flex-col items-center justify-center py-20">
        <img src={emptyImg} alt="No brands" className="w-40 h-40 mb-6" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No brands found</h3>
        <p className="text-sm text-muted-foreground mb-6">Once you create brands they will appear here</p>
        <div className="flex gap-3">
          <Button variant="outline">Learn more</Button>
          <Button onClick={() => setViewMode("create")}>Create brand</Button>
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="bg-card rounded-lg border border-border">
      <div>
        {/* Search */}
       <div className="p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
           <div className="relative flex-1 md:w-64 md:flex-none">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input placeholder="Search" value={brandSearch} onChange={(e) => { setBrandSearch(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
           </div>
         </div>

        {/* Table */}
         <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Brand</TableHead>
                <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Slug</TableHead>
                <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Last Modified by</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Usage</TableHead>
                <TableHead className="w-[80px] md:w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedBrands.map((brand) => {
              const usage = brandUsageMap.get(brand.id) ?? 0;
              return (
                <TableRow key={brand.id} className="group cursor-pointer" onClick={() => handleEdit(brand.id)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {brand.logo ? (
                        <img src={brand.logo.original} alt={brand.logo.altText || brand.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span>{brand.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm hidden md:table-cell">{brand.slug}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">{brand.lastModifiedAt}</TableCell>
                   <TableCell className="text-right text-muted-foreground text-sm">{usage} {usage > 1 ? 'products' : 'product'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(brand.id); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => handleDelete(brand.id, brand.name, e)}>
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
        {filteredBrands.length === 0 && brandSearch && (
          <div className="py-12 text-center text-muted-foreground">No brands match your search</div>
        )}

        {/* Pagination */}
        {totalResults > 0 && (
          <div className="p-3 md:p-4 flex flex-col gap-2 md:flex-row items-start md:items-center justify-between border-t border-border">
             <span className="text-sm text-muted-foreground">
               Showing {startIndex + 1}-{endIndex} of {totalResults} results
             </span>
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground hidden md:inline">Rows per page</span>
                <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                  <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const updateAlt = (key: "logo" | "portraitBanner" | "landscapeBanner", alt: string) => {
    const setters = { logo: setLogo, portraitBanner: setPortraitBanner, landscapeBanner: setLandscapeBanner };
    const values = { logo, portraitBanner, landscapeBanner };
    const current = values[key];
    if (current) setters[key]({ ...current, altText: alt });
  };

  const renderForm = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={() => { resetForm(); setEditingBrandId(null); setViewMode("list"); }}>
             <ArrowLeft className="w-5 h-5" />
           </Button>
           <h1 className="text-lg md:text-2xl font-semibold text-foreground">
             {viewMode === "edit" ? "Edit Brand" : "Create Brand"}
           </h1>
         </div>
         <Button onClick={handleSave} disabled={!name.trim() || !!slugWarning || !!nameWarning}>Save</Button>
       </div>

      {/* Basic Information Card */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="space-y-4">
          {/* Logo + Name + Slug in single row */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            {logo ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border group flex-shrink-0">
                <img src={showOptimised.logo && logo.optimised ? logo.optimised : logo.original} alt={logo.altText || "Logo"} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-background/80 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-12 h-12 rounded-lg border-2 border-dashed border-primary/50 cursor-pointer hover:border-primary transition-colors flex-shrink-0 flex flex-col items-center justify-center"
              >
                <Upload className="w-5 h-5 text-primary/50" />
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setLogo, ASPECT_CONFIG.logo.w)} />

            <div className="flex-1 space-y-2">
              <Label>Brand Name<span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder=""
                className={`h-12 ${nameWarning ? "border-destructive" : ""}`}
                maxLength={VALIDATION_LIMITS.NAME_MAX_LENGTH}
              />
              {nameWarning && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />{nameWarning}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <Label>Brand Slug</Label>
              <Input
                value={slug}
                readOnly
                disabled
                placeholder="brand-slug"
                className="h-12 font-mono text-sm bg-muted/50 cursor-not-allowed"
              />
              {slugWarning && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />{slugWarning}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <MultiSelectTags
              placeholder="Search or add tags..."
              options={allTagOptions}
              selectedValues={tags}
              onChange={setTags}
              onCreateNew={(newTag) => setTags(prev => [...prev, newTag])}
            />
          </div>

          {/* Media Section inside Basic Information */}
          <div className="pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Media</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadCard
                imageKey="portrait"
                config={ASPECT_CONFIG.portrait}
                value={portraitBanner}
                onUpload={(e) => handleImageUpload(e, setPortraitBanner, ASPECT_CONFIG.portrait.h)}
                onRemove={() => setPortraitBanner(null)}
                onAltChange={(alt) => updateAlt("portraitBanner", alt)}
                inputRef={portraitInputRef as React.RefObject<HTMLInputElement>}
              />
              <UploadCard
                imageKey="landscape"
                config={ASPECT_CONFIG.landscape}
                value={landscapeBanner}
                onUpload={(e) => handleImageUpload(e, setLandscapeBanner, ASPECT_CONFIG.landscape.w)}
                onRemove={() => setLandscapeBanner(null)}
                onAltChange={(alt) => updateAlt("landscapeBanner", alt)}
                inputRef={landscapeInputRef as React.RefObject<HTMLInputElement>}
              />
            </div>
          </div>

          {/* Brand Voice */}
          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Textarea
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              placeholder=""
              rows={3}
              maxLength={VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
       <div className="p-4 md:p-6">
         {viewMode === "list" && (
           <>
             <div className="flex items-center justify-between mb-4 md:mb-6">
               <h1 className="text-xl md:text-2xl font-semibold text-foreground">Brands</h1>
               {brands.length > 0 && <Button onClick={() => setViewMode("create")}>Create brand</Button>}
             </div>
            {brands.length === 0 ? renderEmptyState() : renderList()}
          </>
        )}
        {(viewMode === "create" || viewMode === "edit") && renderForm()}
      </div>

      {/* Rename warning dialog */}
      <Dialog open={showRenameWarning} onOpenChange={setShowRenameWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Brand Rename</DialogTitle>
            <DialogDescription>
              You are renaming the brand from <strong>{originalName}</strong> to <strong>{name}</strong>. Please review the impact carefully:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Product updates:</span><br />
                {brandUsageMap.get(editingBrandId!) ?? 0} product{(brandUsageMap.get(editingBrandId!) ?? 0) === 1 ? '' : 's'} currently associated with <strong>{originalName}</strong> will be updated to <strong>{name}</strong>.
              </AlertDescription>
            </Alert>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Filter & rule impact:</span><br />
                Any filters, discounts, offers, collections, or merchandising rules using the brand <strong>{originalName}</strong> will not automatically apply to <strong>{name}</strong> and may need to be updated manually.
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
            <Button variant="outline" onClick={() => setShowRenameWarning(false)}>Cancel</Button>
            <Button onClick={executeSave}>Confirm & Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.name}?`}
        description={`Are you sure you want to delete ${deleteTarget?.name}? Deleting this brand will remove it from all associated products.`}
        onConfirm={() => { if (deleteTarget) deleteBrand(deleteTarget.id); }}
      />

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.label}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img src={previewImage.src} alt={previewImage.label} className="w-full rounded-lg object-contain max-h-[70vh]" />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
