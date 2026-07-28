import { createContext, useContext, useState, ReactNode } from "react";

export interface BrandImage {
  original: string;       // data URL or external URL
  optimised: string | null; // compressed variant (null if not generated)
  originalSize: number;   // bytes
  optimisedSize: number | null;
  altText: string;
  width: number;
  height: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  voice: string;
  tags: string[];
  logo: BrandImage | null;
  portraitBanner: BrandImage | null;
  landscapeBanner: BrandImage | null;
  createdAt: string;
  lastModifiedAt: string;
  _sortTs: number;
}

interface BrandsContextType {
  brands: Brand[];
  addBrand: (brand: Omit<Brand, "id" | "createdAt" | "lastModifiedAt" | "_sortTs">) => Brand;
  updateBrand: (id: string, updates: Partial<Omit<Brand, "id" | "createdAt" | "_sortTs">>) => void;
  deleteBrand: (id: string) => void;
  getBrandById: (id: string) => Brand | undefined;
  isSlugTaken: (slug: string, excludeId?: string) => boolean;
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

const BrandsContext = createContext<BrandsContextType | undefined>(undefined);

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export { generateSlug };

export function BrandsProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);

  const getTimestamp = () =>
    new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const isSlugTaken = (slug: string, excludeId?: string) => {
    return brands.some((b) => b.slug === slug && b.id !== excludeId);
  };

  const isNameTaken = (name: string, excludeId?: string) => {
    return brands.some((b) => b.name.toLowerCase() === name.toLowerCase() && b.id !== excludeId);
  };

  const addBrand = (brand: Omit<Brand, "id" | "createdAt" | "lastModifiedAt" | "_sortTs">): Brand => {
    const now = getTimestamp();
    const newBrand: Brand = {
      ...brand,
      id: Date.now().toString(),
      createdAt: now,
      lastModifiedAt: now,
      _sortTs: Date.now(),
    };
    setBrands((prev) => [...prev, newBrand]);
    return newBrand;
  };

  const updateBrand = (id: string, updates: Partial<Omit<Brand, "id" | "createdAt" | "_sortTs">>) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...updates, lastModifiedAt: getTimestamp(), _sortTs: Date.now() } : b
      )
    );
  };

  const deleteBrand = (id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const getBrandById = (id: string) => brands.find((b) => b.id === id);

  return (
    <BrandsContext.Provider value={{ brands, addBrand, updateBrand, deleteBrand, getBrandById, isSlugTaken, isNameTaken }}>
      {children}
    </BrandsContext.Provider>
  );
}

export function useBrands() {
  const context = useContext(BrandsContext);
  if (!context) {
    throw new Error("useBrands must be used within a BrandsProvider");
  }
  return context;
}
