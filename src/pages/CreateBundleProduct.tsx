import { useState, useRef } from "react";
import { ArrowLeft, Eye, Plus, Trash2, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MediaUpload } from "@/components/products/MediaUpload";
import { Pricing } from "@/components/products/Pricing";
import { Inventory, InventoryRef, InventoryData } from "@/components/products/Inventory";
import { CustomsAndTax, CustomsAndTaxRef } from "@/components/products/CustomsAndTax";
import { ProductConfigurations, ProductConfigurationsRef } from "@/components/products/ProductConfigurations";
import { Attributes, AttributesRef } from "@/components/products/Attributes";
import { CustomData, CustomDataRef, CustomDataEntry } from "@/components/products/CustomData";
import { AddBundleSKUModal, BundleItem } from "@/components/products/AddBundleSKUModal";
import { PackageDetails } from "@/components/products/PackageDetails";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/contexts/ProductsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bold, Italic, Underline, Image, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

export default function CreateBundleProduct() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addProduct } = useProducts();

  // Refs
  const customsTaxRef = useRef<CustomsAndTaxRef>(null);
  const configurationsRef = useRef<ProductConfigurationsRef>(null);
  const attributesRef = useRef<AttributesRef>(null);
  const customDataRef = useRef<CustomDataRef>(null);
  const inventoryRef = useRef<InventoryRef>(null);

  // Form state
  const [name, setName] = useState("");
  const [bundleType, setBundleType] = useState<"physical" | "digital">("physical");
  const [productImages, setProductImages] = useState<string[]>([]);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Form data for pricing/package
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    actualPrice: "",
    sellingPrice: "",
    sku: "",
    length: "",
    width: "",
    height: "",
    weight: "",
  });

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isPhysical = bundleType === "physical";

  const handleAddBundleItems = (items: BundleItem[]) => {
    setBundleItems((prev) => [...prev, ...items]);
  };

  const removeBundleItem = (productId: string) => {
    setBundleItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      toast({ title: "Validation Error", description: "Please enter a bundle name", variant: "destructive" });
      return;
    }

    const customsTaxData = isPhysical ? customsTaxRef.current?.getData() : undefined;
    const configurationsData = configurationsRef.current?.getData();
    const inventoryData = inventoryRef.current?.getData();

    addProduct({
      name,
      sku: formData.sku || `BDL-${Date.now()}`,
      image: productImages[0] || "",
      category: "",
      categoryName: "Bundle",
      actualPrice: formData.actualPrice,
      sellingPrice: formData.sellingPrice,
      length: formData.length,
      width: formData.width,
      height: formData.height,
      weight: formData.weight,
      status: "Active",
      images: productImages,
      customsTax: customsTaxData,
      configs: configurationsData,
      inventory: inventoryData,
    });

    toast({ title: "Success", description: "Bundle product saved successfully" });
    navigate("/");
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background py-3 md:py-4 px-4 md:px-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              to="/"
              className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-base md:text-xl font-semibold text-foreground">
              Create Bundle Product
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="outline" className="gap-2 hidden md:flex">
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-6 p-4 md:p-6">

          {/* Basic Information */}
          <div className="form-section animate-fade-in">
            <h2 className="form-section-title">Basic Information</h2>
            <div className="space-y-5">
              {/* Bundle Type */}
              <div>
                <label className="form-label">
                  Bundle Type<span className="text-destructive">*</span>
                </label>
                <Select value={bundleType} onValueChange={(v) => setBundleType(v as "physical" | "digital")}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="digital">Virtual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <div data-field="name">
                <label className="form-label">
                  Name<span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="Enter bundle name"
                  className={`h-10 ${errors.name ? "border-destructive" : ""}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormData((p) => ({ ...p, name: e.target.value }));
                    if (errors.name) setErrors({});
                  }}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <div className="border border-input rounded-lg overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-2 border-b border-input bg-muted/30 flex-wrap">
                    <Select defaultValue="paragraph">
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="h1">Heading 1</SelectItem>
                        <SelectItem value="h2">Heading 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Underline className="w-4 h-4" /></Button>
                  </div>
                  <Textarea placeholder="Describe the bundle..." className="border-0 rounded-none min-h-[100px] resize-none focus-visible:ring-0" />
                </div>
              </div>

              {/* Media */}
              <MediaUpload images={productImages} onImagesChange={setProductImages} maxVisible={10} />
            </div>
          </div>

          {/* Bundle Products (SKU section) */}
          <div className="form-section animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="form-section-title mb-0">Bundle Products</h2>
              {bundleItems.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowSKUModal(true)}>
                  <Plus className="w-4 h-4" />
                  Add SKU
                </Button>
              )}
            </div>

            {bundleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed border-border rounded-lg">
                <Package className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No products added to this bundle yet</p>
                <Button variant="outline" size="sm" onClick={() => setShowSKUModal(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add SKU
                </Button>
              </div>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border">
                {bundleItems.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 md:p-4">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {item.productImage ? (
                        <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{item.productName}</h4>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      {Object.keys(item.selectedVariants).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {Object.entries(item.selectedVariants).map(([key, val]) => (
                            <span key={key} className="text-xs px-2 py-0.5 bg-muted rounded-md text-muted-foreground">
                              {key}: {val.length === 0 ? "All" : val.join(", ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeBundleItem(item.productId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Package Details */}
          <PackageDetails errors={{}} formData={formData} updateFormData={updateFormData} />

          {/* Pricing */}
          <Pricing errors={{}} formData={formData} updateFormData={updateFormData} />

          {/* Inventory - full for physical, restricted for virtual */}
          <Inventory ref={inventoryRef} virtualBundle={!isPhysical} />

          {/* Customs & Tax - only for physical */}
          {isPhysical && <CustomsAndTax ref={customsTaxRef} />}

          {/* Configurations */}
          <ProductConfigurations ref={configurationsRef} isBundle />

          {/* Attributes */}
          <Attributes ref={attributesRef} selectedCategoryId={undefined} />
          <CustomData ref={customDataRef} />
        </div>

        <div className="h-12" />
      </div>

      {/* Add SKU Modal */}
      <AddBundleSKUModal
        open={showSKUModal}
        onOpenChange={setShowSKUModal}
        onAdd={handleAddBundleItems}
        existingProductIds={bundleItems.map((i) => i.productId)}
      />
    </DashboardLayout>
  );
}
