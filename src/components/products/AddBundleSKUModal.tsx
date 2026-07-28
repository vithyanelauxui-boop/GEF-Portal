import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package, Plus, X, ChevronDown, Check } from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { useIsMobile } from "@/hooks/use-mobile";

export interface BundleItem {
  productId: string;
  productName: string;
  productImage: string;
  sku: string;
  selectedVariants: Record<string, string[]>; // variantGroupName -> selected value labels
  quantity: number;
}

interface AddBundleSKUModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: BundleItem[]) => void;
  existingProductIds?: string[];
}

export function AddBundleSKUModal({ open, onOpenChange, onAdd, existingProductIds = [] }: AddBundleSKUModalProps) {
  const isMobile = useIsMobile();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, BundleItem>>(new Map());

  // Filter products (exclude bundles and already-added)
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => !existingProductIds.includes(p.id))
      .filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      });
  }, [products, search, existingProductIds]);

  // Get variant groups for a product
  const getVariantGroups = (product: typeof products[0]) => {
    const variantsData = product.variants as {
      savedVariants?: Array<{
        id: string;
        name: string;
        values: Array<{ id: string; label: string }>;
      }>;
    } | undefined;
    return variantsData?.savedVariants || [];
  };

  const toggleProduct = (product: typeof products[0]) => {
    const newMap = new Map(selectedItems);
    if (newMap.has(product.id)) {
      newMap.delete(product.id);
    } else {
      newMap.set(product.id, {
        productId: product.id,
        productName: product.name,
        productImage: product.image || "",
        sku: product.sku,
        selectedVariants: {},
        quantity: 1,
      });
    }
    setSelectedItems(newMap);
  };

  const toggleVariantValue = (productId: string, groupName: string, value: string) => {
    const newMap = new Map(selectedItems);
    const item = newMap.get(productId);
    if (item) {
      const current = item.selectedVariants[groupName] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      newMap.set(productId, {
        ...item,
        selectedVariants: { ...item.selectedVariants, [groupName]: updated },
      });
      setSelectedItems(newMap);
    }
  };

  const handleAdd = () => {
    onAdd(Array.from(selectedItems.values()));
    setSelectedItems(new Map());
    setSearch("");
    onOpenChange(false);
  };

  const content = (
    <div className="flex flex-col max-h-[70vh]">
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto space-y-0 border border-border rounded-lg divide-y divide-border">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isSelected = selectedItems.has(product.id);
            const variantGroups = getVariantGroups(product);
            const hasVariants = variantGroups.length > 0;

            return (
              <div key={product.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProduct(product)}
                    className="mt-1"
                  />
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{product.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Item Code: {product.sku}
                    </p>
                  </div>
                </div>

                {/* Variant selectors - shown when product is selected and has variants */}
                {isSelected && hasVariants && (
                  <div className="flex flex-wrap gap-3 mt-3 ml-8">
                    {variantGroups.map((group) => {
                      const selected = selectedItems.get(product.id)?.selectedVariants[group.name] || [];
                      const label = selected.length === 0
                        ? `${group.name}: All`
                        : selected.length === group.values.length
                          ? `${group.name}: All`
                          : `${group.name}: ${selected.join(", ")}`;
                      return (
                        <Popover key={group.id}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 w-44 justify-between text-sm font-normal truncate">
                              <span className="truncate">{label}</span>
                              <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1" align="start">
                            {group.values.map((v) => {
                              const isChecked = selected.includes(v.label);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm hover:bg-muted text-left"
                                  onClick={() => toggleVariantValue(product.id, group.name, v.label)}
                                >
                                  <Checkbox checked={isChecked} className="pointer-events-none" />
                                  <span>{v.label}</span>
                                </button>
                              );
                            })}
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
        <span className="text-sm text-muted-foreground">
          {selectedItems.size} product{selectedItems.size !== 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedItems.size === 0}>
            <Plus className="w-4 h-4 mr-1" />
            Add to Bundle
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle>Select Products</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Products</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
