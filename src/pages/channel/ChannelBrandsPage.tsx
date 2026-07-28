import { useState, useMemo, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBrands, type Brand } from "@/contexts/BrandsContext";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, GripVertical, ChevronDown, Upload, X, Building2, Pencil } from "lucide-react";
import emptyImg from "@/assets/empty-attributes.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { BrandImage } from "@/contexts/BrandsContext";

interface ChannelBrandsPageProps {
  channelName: string;
  channelSlug: string;
}

interface ChannelBrand {
  id: string;
  brandId: string;
  name: string;
  displayName: string;
  logo: BrandImage | null;
  portraitBanner: BrandImage | null;
  landscapeBanner: BrandImage | null;
  isActive: boolean;
}

function BannerUpload({
  label,
  ratio,
  aspectClass,
  image,
  onChange,
}: {
  label: string;
  ratio: string;
  aspectClass: string;
  image: BrandImage | null;
  onChange: (img: BrandImage | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        onChange({
          original: reader.result as string,
          optimised: null,
          originalSize: file.size,
          optimisedSize: null,
          altText: file.name,
          width: img.width,
          height: img.height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label} <span className="text-muted-foreground/60">({ratio})</span>
      </label>
      {image ? (
        <div className={cn("relative group rounded-lg border border-border overflow-hidden bg-muted max-h-52", aspectClass)}>
          <img
            src={image.original}
            alt={image.altText}
            className="w-full h-full object-cover absolute inset-0"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className={cn("w-full rounded-lg border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors max-h-52", aspectClass)}
        >
          <Upload className="w-4 h-4" />
          <span className="text-[11px]">Upload</span>
        </button>
      )}
      {image && (
        <div className="mt-1.5">
          <Input
            value={image.altText}
            onChange={(e) => onChange({ ...image, altText: e.target.value })}
            placeholder="Alt text"
            className="h-7 text-xs"
          />
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function SortableBrandCard({
  brand,
  index,
  total,
  onToggleActive,
  onSave,
  onChanged,
}: {
  brand: ChannelBrand;
  index: number;
  total: number;
  onToggleActive: () => void;
  onSave: (updates: Partial<ChannelBrand>) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [displayName, setDisplayName] = useState(brand.displayName);
  const [posValue, setPosValue] = useState("");
  const [logo, setLogo] = useState<BrandImage | null>(brand.logo);
  const [portrait, setPortrait] = useState<BrandImage | null>(brand.portraitBanner);
  const [landscape, setLandscape] = useState<BrandImage | null>(brand.landscapeBanner);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const isDirty =
    displayName !== brand.displayName ||
    posValue !== "" ||
    portrait !== brand.portraitBanner ||
    landscape !== brand.landscapeBanner;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: brand.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const updates: Partial<ChannelBrand> = {};
    if (displayName !== brand.displayName) updates.displayName = displayName.trim();
    if (portrait !== brand.portraitBanner) updates.portraitBanner = portrait;
    if (landscape !== brand.landscapeBanner) updates.landscapeBanner = landscape;
    onSave(updates);

    if (posValue) {
      const num = parseInt(posValue);
      if (!isNaN(num) && num >= 1 && num <= total) {
        // Position change is handled via onSave with a special key
        onSave({ ...updates, id: `__pos__${num - 1}` });
      }
    }
    setPosValue("");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-xl transition-shadow",
        isDragging && "shadow-lg z-50 opacity-90"
      )}
    >
      {/* Collapsed row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground flex-shrink-0 touch-none"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Logo + Name */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {brand.logo ? (
              <img src={brand.logo.original} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{brand.displayName}</p>
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Switch checked={brand.isActive} onCheckedChange={onToggleActive} />
        </div>

        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
          expanded && "rotate-180"
        )} />
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 sm:ml-7 space-y-4">
          {/* Header row */}
          <div className="flex items-center">
            <span className="text-base font-semibold text-foreground">Edit Configurations</span>
          </div>

          {/* Logo + Display Name + Position */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <label className="text-xs font-medium text-primary mb-1.5 block">Logo</label>
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border relative group">
                {logo ? (
                  <>
                    <img src={logo.original} alt={logo.altText} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => logoFileRef.current?.click()}>
                      <Pencil className="w-3.5 h-3.5 text-white" />
                    </div>
                  </>
                ) : (
                  <button onClick={() => logoFileRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="w-3 h-3" />
                    <span className="text-[8px]">Upload</span>
                  </button>
                )}
              </div>
              <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const img = new Image();
                  img.onload = () => {
                    setLogo({ original: reader.result as string, optimised: null, originalSize: file.size, optimisedSize: null, altText: file.name, width: img.width, height: img.height }); onChanged();
                  };
                  img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs font-medium text-primary mb-1.5 block">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); onChanged(); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex-shrink-0 w-full sm:w-28">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Position</label>
              <Input
                value={posValue}
                onChange={(e) => setPosValue(e.target.value)}
                placeholder={`${index + 1} of ${total}`}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BannerUpload
              label="Portrait Banner"
              ratio="13:20"
              aspectClass="aspect-[13/20]"
              image={portrait}
              onChange={(v) => { setPortrait(v); onSave({ portraitBanner: v }); onChanged(); }}
            />
            <BannerUpload
              label="Landscape Banner"
              ratio="27:20"
              aspectClass="aspect-[27/20]"
              image={landscape}
              onChange={(v) => { setLandscape(v); onSave({ landscapeBanner: v }); onChanged(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChannelBrandsPage({ channelName, channelSlug }: ChannelBrandsPageProps) {
  const { brands, updateBrand } = useBrands();
  const [search, setSearch] = useState("");

  const initialChannelBrands = useMemo(() => {
    return brands.map((b) => ({
      id: `ch-${b.id}`,
      brandId: b.id,
      name: b.name,
      displayName: b.name,
      logo: b.logo,
      portraitBanner: b.portraitBanner,
      landscapeBanner: b.landscapeBanner,
      isActive: true,
    }));
  }, [brands]);

  const [channelBrands, setChannelBrands] = useState<ChannelBrand[]>(initialChannelBrands);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChannelBrands((prev) => {
        const oldIdx = prev.findIndex((v) => v.id === active.id);
        const newIdx = prev.findIndex((v) => v.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
      setIsDirty(true);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return channelBrands;
    const q = search.toLowerCase();
    return channelBrands.filter(
      (b) =>
        b.displayName.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q)
    );
  }, [channelBrands, search]);

  const toggleActive = (id: string) => {
    setChannelBrands((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
    setIsDirty(true);
  };

  const saveBrand = (id: string, updates: Partial<ChannelBrand>) => {
    if (updates.id?.startsWith("__pos__")) {
      const newIdx = parseInt(updates.id.replace("__pos__", ""));
      setChannelBrands((prev) => {
        const oldIdx = prev.findIndex((b) => b.id === id);
        if (oldIdx === -1) return prev;
        return arrayMove(prev, oldIdx, Math.max(0, Math.min(newIdx, prev.length - 1)));
      });
      setIsDirty(true);
      return;
    }
    setChannelBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    setIsDirty(true);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="sticky top-0 z-10 bg-background pb-4 -mt-1 pt-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Brands</h1>
            <Button size="sm" disabled={!isDirty} onClick={() => {
              // Sync channel banner/logo changes back to core brands
              channelBrands.forEach((cb) => {
                const coreBrand = brands.find((b) => b.id === cb.brandId);
                if (!coreBrand) return;
                const updates: Partial<Brand> = {};
                if (cb.portraitBanner !== coreBrand.portraitBanner) updates.portraitBanner = cb.portraitBanner;
                if (cb.landscapeBanner !== coreBrand.landscapeBanner) updates.landscapeBanner = cb.landscapeBanner;
                if (Object.keys(updates).length > 0) updateBrand(cb.brandId, updates);
              });
              setIsDirty(false);
              toast({ title: "Changes saved" });
            }}>Save Changes</Button>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brand name…"
            className="pl-10 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="border border-border rounded-xl bg-card py-20 flex flex-col items-center justify-center">
            <img src={emptyImg} alt="No brands" className="w-36 h-36 mb-5 opacity-80" />
            <h3 className="text-base font-semibold text-foreground mb-1">No brands found</h3>
            <p className="text-sm text-muted-foreground">Once you create brands they will appear here</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {filtered.map((brand, idx) => (
                  <SortableBrandCard
                    key={brand.id}
                    brand={brand}
                    index={idx}
                    total={filtered.length}
                    onToggleActive={() => toggleActive(brand.id)}
                    onSave={(updates) => saveBrand(brand.id, updates)}
                    onChanged={() => setIsDirty(true)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
}
