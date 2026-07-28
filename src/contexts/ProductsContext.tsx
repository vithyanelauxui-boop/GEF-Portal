import { createContext, useContext, useState, ReactNode } from "react";

export interface ProductAttributeValue {
  id: string;
  value: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  dataType: string;
  values: ProductAttributeValue[];
}

export interface ProductConfigurationsData {
  availability: boolean;
  publishDateTime: string;
  publishTimezone: string;
  madeToOrder: boolean;
  manufacturingTime: string;
  manufacturingTimeUnit: string;
  selectedTags: string[];
  returnConfig: boolean;
  returnTime: string;
  returnTimeUnit: string;
  dependable: boolean;
}

export interface CustomsTaxData {
  countryOfOrigin: string;
  hsnCode: string;
  taxRule: string;
}

export type BaseUomCode = "EA" | "KG" | "G" | "L" | "ML" | "OZ" | "LB" | "M";

export const BASE_UOM_OPTIONS: { code: BaseUomCode; name: string }[] = [
  { code: "EA", name: "Each" },
  { code: "KG", name: "Kilogram" },
  { code: "G", name: "Gram" },
  { code: "L", name: "Litre" },
  { code: "ML", name: "Millilitre" },
  { code: "OZ", name: "Ounce" },
  { code: "LB", name: "Pound" },
  { code: "M", name: "Meter" },
];

export interface Product {
  id: string;
  name: string;
  sku: string;
  baseUom?: BaseUomCode;
  image: string;
  category: string;
  categoryName: string;
  actualPrice: string;
  sellingPrice: string;
  length: string;
  width: string;
  height: string;
  weight: string;
  status: "Active" | "Upcoming" | "InActive";
  productType?: "Goods" | "Digital" | "Service" | "Bundle";
  images: string[];
  // Additional fields
  description?: string;
  brand?: string;
  hasVariants?: boolean;
  variants?: unknown; // Variant data structure - complex, stored as-is
  inventory?: unknown; // Inventory data for non-variant products
  attributes?: ProductAttribute[];
  hiddenAttributeIds?: string[];
  // Configurations - using the actual data structure
  configs?: ProductConfigurationsData;
  // Customs & Tax - using the actual data structure
  customsTax?: CustomsTaxData;
  // Custom data - key/value pairs
  customData?: Array<{ id: string; key: string; value: string }>;
  // Pricing extras
  pricingExtras?: {
    costPrice?: string;
    transferPrice?: string;
  };
  // Shipment data
  shipment?: unknown;
  // Inventory control settings
  inventoryControl?: unknown;
  _sortTs: number;
}

interface ProductsContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id" | "_sortTs">) => string;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "seed-prod-1",
      name: "Wireless Bluetooth Headphones",
      sku: "WBH-001",
      baseUom: "EA",
      image: "",
      category: "seed-cat-1",
      categoryName: "Electronics",
      actualPrice: "2999",
      sellingPrice: "1999",
      length: "18",
      width: "16",
      height: "8",
      weight: "0.25",
      status: "Active",
      productType: "Goods",
      images: [],
      description: "<p>Premium wireless headphones with active noise cancellation, 30-hour battery life, and ultra-comfortable over-ear design.</p>",
      brand: "",
      hasVariants: true,
      variants: {
        enabled: true,
        savedVariants: [
          {
            id: "var-color",
            name: "Colour",
            types: ["text"] as any,
            values: [
              { id: "val-black", label: "Black", images: [], hexColor: undefined },
              { id: "val-red", label: "Red", images: [], hexColor: undefined },
            ],
            showOnPLP: false,
          },
          {
            id: "var-size",
            name: "Size",
            types: ["text"] as any,
            values: [
              { id: "val-s", label: "S", images: [], hexColor: undefined },
              { id: "val-m", label: "M", images: [], hexColor: undefined },
              { id: "val-l", label: "L", images: [], hexColor: undefined },
            ],
            showOnPLP: false,
          },
        ],
        variantDetailData: {
          "val-black-val-s": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-BLK-S", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "1999", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 10, total: 10 }],
          },
          "val-black-val-m": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-BLK-M", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "1999", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 15, total: 15 }],
          },
          "val-black-val-l": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-BLK-L", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "2099", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 8, total: 8 }],
          },
          "val-red-val-s": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-RED-S", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "1999", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 12, total: 12 }],
          },
          "val-red-val-m": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-RED-M", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "1999", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 20, total: 20 }],
          },
          "val-red-val-l": {
            identifiers: [{ id: "1", type: "sku", value: "WBH-RED-L", isPrimary: true }],
            customLabels: {},
            shipment: { length: "18", width: "16", height: "8", units: "cm", weight: "0.25", weightUnit: "grams" },
            pricing: { actualPrice: "2999", actualCurrency: "inr", sellingPrice: "2099", sellingCurrency: "inr", additionalPrices: [] },
            inventory: [{ id: "1", name: "Shop location", unavailableCategories: { damaged: 0, lost: 0, onHold: 0, inTransit: 0 }, committed: 0, available: 5, total: 5 }],
          },
        },
        combinationQuantities: {
          "val-black-val-s": 10,
          "val-black-val-m": 15,
          "val-black-val-l": 8,
          "val-red-val-s": 12,
          "val-red-val-m": 20,
          "val-red-val-l": 5,
        },
        combinationActualPrices: {
          "val-black-val-s": "2999",
          "val-black-val-m": "2999",
          "val-black-val-l": "2999",
          "val-red-val-s": "2999",
          "val-red-val-m": "2999",
          "val-red-val-l": "2999",
        },
        combinationSellingPrices: {
          "val-black-val-s": "1999",
          "val-black-val-m": "1999",
          "val-black-val-l": "2099",
          "val-red-val-s": "1999",
          "val-red-val-m": "1999",
          "val-red-val-l": "2099",
        },
        combinationImages: {},
      },
      attributes: [
        { id: "seed-attr-1", name: "storage", dataType: "dropdown", values: [{ id: "v1", value: "128 GB" }] },
        { id: "seed-attr-2", name: "color", dataType: "color", values: [{ id: "v2", value: "Black" }] },
      ],
      pricingExtras: { costPrice: "800" },
      customData: [
        { id: "cd-1", key: "Warranty Period", value: "" },
        { id: "cd-2", key: "Bluetooth Version", value: "" },
        { id: "cd-3", key: "Driver Size", value: "" },
      ],
      _sortTs: 1739350800000,
    },
    {
      id: "seed-prod-2",
      name: "Organic Cotton T-Shirt",
      sku: "OCT-100",
      baseUom: "EA",
      image: "",
      category: "seed-cat-2",
      categoryName: "Apparel",
      actualPrice: "1499",
      sellingPrice: "999",
      length: "30",
      width: "22",
      height: "3",
      weight: "0.18",
      status: "Active",
      productType: "Goods",
      images: [],
      description: "<p>Soft, breathable organic cotton crew-neck t-shirt. Pre-shrunk fabric with reinforced stitching for lasting comfort.</p>",
      brand: "EcoWear",
      hasVariants: false,
      inventory: [
        { id: "loc-1", name: "Main Warehouse", unavailableCategories: { damaged: 2, lost: 0, onHold: 5, inTransit: 10 }, committed: 8, available: 75, total: 100 },
        { id: "loc-2", name: "Shop Location", unavailableCategories: { damaged: 0, lost: 1, onHold: 0, inTransit: 3 }, committed: 4, available: 22, total: 30 },
      ],
      attributes: [
        { id: "seed-attr-3", name: "material", dataType: "text", values: [{ id: "v3", value: "100% Organic Cotton" }] },
        { id: "seed-attr-4", name: "fit", dataType: "dropdown", values: [{ id: "v4", value: "Regular" }] },
      ],
      pricingExtras: { costPrice: "350" },
      configs: {
        availability: true,
        publishDateTime: "",
        publishTimezone: "",
        madeToOrder: false,
        manufacturingTime: "",
        manufacturingTimeUnit: "days",
        selectedTags: ["organic", "cotton", "basics"],
        returnConfig: true,
        returnTime: "30",
        returnTimeUnit: "days",
        dependable: false,
      },
      customsTax: { countryOfOrigin: "IN", hsnCode: "6109", taxRule: "GST 5%" },
      customData: [
        { id: "cd-4", key: "Care Instructions", value: "Machine wash cold" },
      ],
      _sortTs: 1739437200000,
    },
  ]);

  const addProduct = (product: Omit<Product, "id" | "_sortTs">) => {
    const id = crypto.randomUUID();
    setProducts((prev) => [...prev, { ...product, id, _sortTs: Date.now() }]);
    return id;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, _sortTs: Date.now() } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProductById }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
