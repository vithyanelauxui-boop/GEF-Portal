import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Eye, AlertTriangle, X } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BasicInformation } from "@/components/products/BasicInformation";
import { PackageDetails } from "@/components/products/PackageDetails";
import { ShipmentDetails, ShipmentDetailsRef } from "@/components/products/ShipmentDetails";
import { InventoryControl, InventoryControlRef } from "@/components/products/InventoryControl";
import { Variants, type VariantsData, type VariantsRef } from "@/components/products/Variants";
import { Pricing, PricingRef, PricingExtras } from "@/components/products/Pricing";
import { Inventory, InventoryRef, InventoryData } from "@/components/products/Inventory";
import { CustomsAndTax, CustomsAndTaxRef } from "@/components/products/CustomsAndTax";
import { ProductConfigurations, ProductConfigurationsRef } from "@/components/products/ProductConfigurations";
import { Attributes, AttributesRef, AttributesData } from "@/components/products/Attributes";
import { CustomData, CustomDataRef, CustomDataEntry } from "@/components/products/CustomData";
import { ProductInsights } from "@/components/products/ProductInsights";
import { useToast } from "@/hooks/use-toast";
import { useProducts, CustomsTaxData, ProductConfigurationsData, BaseUomCode } from "@/contexts/ProductsContext";
import { useCategories } from "@/contexts/CategoriesContext";
 import { productFormSchema, productWithVariantsSchema, digitalProductFormSchema, formatZodErrors, VALIDATION_LIMITS } from "@/lib/validations";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export interface ProductFormErrors {
  name?: string;
  category?: string;
  actualPrice?: string;
  sellingPrice?: string;
  sku?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

export default function CreateProduct() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { addProduct, updateProduct, getProductById } = useProducts();
  const { categories } = useCategories();
  const isMobile = useIsMobile();
  const [showBackWarning, setShowBackWarning] = useState(false);
  
  const isEditMode = Boolean(id);
  const isDigital = location.pathname.startsWith("/create/digital") || location.pathname.startsWith("/create/digital-product");
  const isDigitalProduct = location.pathname.startsWith("/create/digital-product");
  const isService = location.pathname === "/create/digital";
  const existingProduct = id ? getProductById(id) : undefined;
  
  // Refs for child components
  const customsTaxRef = useRef<CustomsAndTaxRef>(null);
  const configurationsRef = useRef<ProductConfigurationsRef>(null);
  const attributesRef = useRef<AttributesRef>(null);
  const customDataRef = useRef<CustomDataRef>(null);
  const variantsRef = useRef<VariantsRef>(null);
  const inventoryRef = useRef<InventoryRef>(null);
  const shipmentRef = useRef<ShipmentDetailsRef>(null);
  const inventoryControlRef = useRef<InventoryControlRef>(null);
  const pricingRef = useRef<PricingRef>(null);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [productImages, setProductImages] = useState<string[]>([]);
  const [hasVariants, setHasVariants] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [baseUom, setBaseUom] = useState<BaseUomCode>(existingProduct?.baseUom || "EA");
  
  // Initial data for child components (edit mode)
  const [customsTaxInitialData, setCustomsTaxInitialData] = useState<CustomsTaxData | undefined>();
  const [configurationsInitialData, setConfigurationsInitialData] = useState<ProductConfigurationsData | undefined>();
  const [attributesInitialData, setAttributesInitialData] = useState<AttributesData | undefined>();
  const [variantsInitialData, setVariantsInitialData] = useState<VariantsData | undefined>();
  const [inventoryInitialData, setInventoryInitialData] = useState<InventoryData | undefined>();
  const [customDataInitial, setCustomDataInitial] = useState<CustomDataEntry[]>([]);
  const [lotTrackingMode, setLotTrackingMode] = useState("NONE");
  const [pricingExtrasInitial, setPricingExtrasInitial] = useState<PricingExtras | undefined>();
  
  // Form state lifted to parent
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
  const [slug, setSlug] = useState("");

  // Load existing product data in edit mode
  useEffect(() => {
    if (isEditMode && existingProduct) {
      setFormData({
        name: existingProduct.name,
        category: existingProduct.category,
        actualPrice: existingProduct.actualPrice,
        sellingPrice: existingProduct.sellingPrice,
        sku: existingProduct.sku,
        length: existingProduct.length,
        width: existingProduct.width,
        height: existingProduct.height,
        weight: existingProduct.weight,
      });
      setSelectedCategoryId(existingProduct.category);
      setProductImages(existingProduct.images || []);
      const persistedHasVariants = Boolean((existingProduct.variants as any)?.savedVariants?.length);
      setHasVariants(existingProduct.hasVariants || persistedHasVariants);
      if (existingProduct.baseUom) setBaseUom(existingProduct.baseUom);
      
      // Load child component data
      if (existingProduct.customsTax) {
        setCustomsTaxInitialData(existingProduct.customsTax as CustomsTaxData);
      }
      if (existingProduct.configs) {
        setConfigurationsInitialData(existingProduct.configs as ProductConfigurationsData);
      }
      if (existingProduct.attributes) {
        setAttributesInitialData({
          attributes: existingProduct.attributes,
          hiddenAttributeIds: existingProduct.hiddenAttributeIds || [],
        });
      }
      if (existingProduct.variants) {
        setVariantsInitialData(existingProduct.variants as VariantsData);
      }
      if (existingProduct.customData) {
        setCustomDataInitial(existingProduct.customData);
      }
      // Load inventory data
      if (existingProduct.inventory) {
        setInventoryInitialData({
          tracked: true,
          locations: existingProduct.inventory as any,
        });
      }
      // Load pricing extras (cost price, transfer price)
      if (existingProduct.pricingExtras) {
        setPricingExtrasInitial(existingProduct.pricingExtras as PricingExtras);
      }
    }
  }, [isEditMode, existingProduct]);

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field as keyof ProductFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCategoryChange = (categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId);
    updateFormData("category", categoryId || "");
  };

  const validateForm = (): boolean => {
     // Use Zod schema for validation
     const schema = hasVariants ? productWithVariantsSchema : isDigital ? digitalProductFormSchema : productFormSchema;
     const result = schema.safeParse(formData);
     
     if (!result.success) {
       const newErrors = formatZodErrors(result.error) as ProductFormErrors;
       setErrors(newErrors);
       return false;
    }

     setErrors({});
     return true;
  };

  const handleSave = () => {
    const isValid = validateForm();
    
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      
      // Auto-scroll to first error field - use setTimeout to wait for state update and DOM render
      setTimeout(() => {
        const errorFields = ["name", "category", "actualPrice", "sellingPrice", "sku", "length", "width", "height", "weight"];
        for (const field of errorFields) {
          const isEmpty = 
            (field === "name" && !formData.name.trim()) ||
            (field === "category" && !formData.category) ||
            (field === "actualPrice" && !hasVariants && !formData.actualPrice.trim()) ||
            (field === "sellingPrice" && !hasVariants && !formData.sellingPrice.trim()) ||
            (field === "sku" && !hasVariants && !formData.sku.trim()) ||
            (field === "length" && !hasVariants && !formData.length.trim()) ||
            (field === "width" && !hasVariants && !formData.width.trim()) ||
            (field === "height" && !hasVariants && !formData.height.trim()) ||
            (field === "weight" && !hasVariants && !formData.weight.trim());
          
          if (isEmpty) {
            const element = document.querySelector(`[data-field="${field}"]`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
              break;
            }
          }
        }
      }, 50);
      return;
    }

    // Get category name
    const categoryName = categories.find(c => c.id === formData.category)?.name || "";
    
    // Collect data from child components
    const customsTaxData = customsTaxRef.current?.getData();
    const configurationsData = configurationsRef.current?.getData();
    const attributesData = attributesRef.current?.getData();
    const variantsData = variantsRef.current?.getData();
    const inventoryData = inventoryRef.current?.getData();

    const customDataEntries = customDataRef.current?.getData();
    const shipmentData = shipmentRef.current?.getData();
    const inventoryControlData = inventoryControlRef.current?.getData();
    const pricingExtrasData = pricingRef.current?.getData();

    const productData = {
      name: formData.name,
      sku: formData.sku,
      image: productImages[0] || "",
      category: formData.category,
      categoryName,
      actualPrice: formData.actualPrice,
      sellingPrice: formData.sellingPrice,
      length: formData.length,
      width: formData.width,
      height: formData.height,
      weight: formData.weight,
      status: "Active" as const,
      images: productImages,
      hasVariants,
      baseUom,
      // Child component data
      customsTax: customsTaxData,
      configs: configurationsData,
      attributes: attributesData?.attributes,
      hiddenAttributeIds: attributesData?.hiddenAttributeIds,
      variants: variantsData,
      inventory: inventoryData?.locations,
      customData: customDataEntries,
      shipment: shipmentData,
      inventoryControl: inventoryControlData,
      pricingExtras: pricingExtrasData,
    };

    if (isEditMode && id) {
      // Update existing product
      updateProduct(id, productData);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } else {
      // Add new product
      addProduct(productData);
      toast({
        title: "Success",
        description: "Product saved successfully",
      });
    }
    
    // Redirect to products listing (preserve tab context)
    const fromTab = new URLSearchParams(location.search).get("from");
    navigate(fromTab === "size-variants" ? "/?tab=size-variants" : "/");
  };

  return (
    <>
    <DashboardLayout>
       <div className="max-w-4xl mx-auto">
         {/* Sticky Header */}
         <div className="sticky top-0 z-10 bg-background py-3 md:py-4 px-4 md:px-6 flex items-center justify-between border-b border-border">
           <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setShowBackWarning(true)}
                className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
             <h1 className="text-base md:text-xl font-semibold text-foreground">
               {isEditMode ? "Edit Product" : isDigitalProduct ? "Create Digital Product" : isService ? "Create Service Product" : "Create Goods Product"}
             </h1>
           </div>
           <div className="flex items-center gap-2 md:gap-3">
             <Button variant="outline" className="gap-2 hidden md:flex">
               <Eye className="w-4 h-4" />
               Preview
             </Button>
             <Button className="bg-primary hover:bg-primary/90" onClick={handleSave}>
               {isEditMode ? "Update" : "Save"}
             </Button>
           </div>
         </div>

        {/* Form Sections */}
        <div className="space-y-6 p-4 md:p-6">
          {isEditMode && <ProductInsights />}
          <BasicInformation 
            onCategoryChange={handleCategoryChange}
            errors={errors}
            formData={formData}
            updateFormData={updateFormData}
            images={productImages}
            onImagesChange={setProductImages}
            slug={slug}
            onSlugChange={setSlug}
          />
          {/* Identification Details: show only identifiers */}
          {!hasVariants && (
            <PackageDetails 
              errors={errors}
              formData={formData}
              updateFormData={updateFormData}
              baseUom={baseUom}
              onBaseUomChange={setBaseUom}
            />
          )}
          {/* Shipment Details: separate block, hide for digital */}
          {!hasVariants && !isDigital && (
            <ShipmentDetails
              ref={shipmentRef}
              errors={errors}
              formData={formData}
              updateFormData={updateFormData}
              isEditMode={isEditMode}
            />
          )}
          <Variants
            ref={variantsRef}
            initialData={variantsInitialData}
            productName={formData.name}
            productSku={formData.sku}
            productImage={productImages[0]}
            onVariantsChange={setHasVariants}
            isEditMode={isEditMode}
            isUnlisted={isUnlisted}
            productCustomDataKeys={customDataInitial.map(cd => ({ id: cd.id, key: cd.key }))}
            packageDetails={{
              length: formData.length,
              width: formData.width,
              height: formData.height,
              weight: formData.weight,
              sku: formData.sku,
            }}
            baseUom={baseUom}
          />
          {!hasVariants && (
            <>
              <Pricing
                ref={pricingRef}
                errors={errors}
                formData={formData}
                updateFormData={updateFormData}
                baseUom={baseUom}
                initialPricingExtras={pricingExtrasInitial}
              />
              <Inventory
                ref={inventoryRef}
                initialData={inventoryInitialData}
                isEditMode={isEditMode}
                lotTrackingMode={lotTrackingMode}
                primaryIdentifier={formData.sku}
              />
              <InventoryControl
                ref={inventoryControlRef}
                isEditMode={isEditMode}
                onLotTrackingModeChange={setLotTrackingMode}
              />
            </>
          )}
          <CustomsAndTax 
            ref={customsTaxRef}
            initialData={customsTaxInitialData}
            hideCountryOfOrigin={hasVariants}
          />
          <ProductConfigurations 
            ref={configurationsRef}
            initialData={configurationsInitialData}
            onUnlistedChange={setIsUnlisted}
            productType={isDigital ? "digital" : "physical"}
          />
          <Attributes 
            ref={attributesRef}
            selectedCategoryId={selectedCategoryId}
            initialData={attributesInitialData}
          />
          {!hasVariants && (
            <CustomData ref={customDataRef} initialData={customDataInitial} />
          )}
        </div>

        {/* Bottom padding for scroll */}
        <div className="h-12" />
      </div>
    </DashboardLayout>

    {/* Back Warning Modal */}
    {(() => {
      const warningContent = (
        <div className="flex flex-col">
          <div className="flex items-start justify-between px-6 pt-5 pb-4 bg-muted/40 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(27, 95%, 48% / 0.12)" }}>
                <AlertTriangle className="w-5 h-5" style={{ color: "#EF6706" }} />
              </div>
              <h2 className="text-lg font-bold text-foreground leading-tight">Unsaved Changes</h2>
            </div>
            <button
              onClick={() => setShowBackWarning(false)}
              className="p-0.5 rounded-sm hover:bg-muted transition-colors -mt-0.5 ml-4 shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="px-6 pt-5 pb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have unsaved changes. If you leave now, all your progress will be lost. Are you sure you want to go back?
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 pb-6">
            <Button
              variant="outline"
              className="px-7 h-10 text-sm font-medium"
              onClick={() => setShowBackWarning(false)}
            >
              Stay
            </Button>
            <Button
              className="px-7 h-10 text-sm font-medium text-white"
              style={{ backgroundColor: "#EF6706" }}
              onClick={() => { setShowBackWarning(false); const fromTab = new URLSearchParams(location.search).get("from"); navigate(fromTab === "size-variants" ? "/?tab=size-variants" : "/"); }}
            >
              Leave
            </Button>
          </div>
        </div>
      );

      if (isMobile) {
        return (
          <Drawer open={showBackWarning} onOpenChange={setShowBackWarning}>
            <DrawerContent className="pb-2">
              <div className="pt-2">{warningContent}</div>
            </DrawerContent>
          </Drawer>
        );
      }

      return (
        <DialogPrimitive.Root open={showBackWarning} onOpenChange={setShowBackWarning}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg overflow-hidden",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              )}
            >
              {warningContent}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      );
    })()}
    </>
  );
}
