import { createContext, useContext, useState, type ReactNode } from "react";

export interface BreadcrumbLevel {
  id: string;
  typeId: string;
  typeName: string;
  value: string;
}

export interface CategoryAttributeOverride {
  attributeId: string;
  values: string[]; // For dropdown: string values; For color: JSON stringified {hex, name}[]
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  attributeIds: string[];
  attributeOverrides?: CategoryAttributeOverride[];
  image?: string;
  landscapeBanner?: string;
  mobileBanner?: string;
  breadcrumbLevels?: BreadcrumbLevel[];
  createdAt: string;
  lastModifiedAt: string;
  _sortTs: number;
}

interface CategoriesContextType {
  categories: Category[];
  addCategory: (cat: Omit<Category, "id" | "createdAt" | "slug" | "lastModifiedAt" | "_sortTs">) => string;
  updateCategory: (id: string, cat: Omit<Category, "id" | "createdAt" | "slug" | "lastModifiedAt" | "_sortTs">) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  isNameTaken: (name: string, excludeId?: string) => boolean;
  isSlugTaken: (slug: string, excludeId?: string) => boolean;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "seed-cat-1",
      name: "Electronics",
      slug: "electronics",
      description: "Consumer electronics and gadgets",
      attributeIds: ["seed-attr-1", "seed-attr-2"],
      createdAt: "12 Feb, 2026, 10:00 AM",
      lastModifiedAt: "12 Feb, 2026, 10:00 AM",
      _sortTs: 1739350800000,
    },
  ]);

  const generateSlug = (name: string) =>
    name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  const getTimestamp = () =>
    new Date().toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });

  const addCategory = (cat: Omit<Category, "id" | "createdAt" | "slug" | "lastModifiedAt" | "_sortTs">) => {
    const newId = Date.now().toString();
    const now = getTimestamp();
    const newCategory: Category = {
      ...cat,
      id: newId,
      slug: generateSlug(cat.name),
      breadcrumbLevels: cat.breadcrumbLevels ?? [],
      createdAt: now,
      lastModifiedAt: now,
      _sortTs: Date.now(),
    };
    setCategories((prev) => [...prev, newCategory]);
    return newId;
  };

  const updateCategory = (id: string, cat: Omit<Category, "id" | "createdAt" | "slug" | "lastModifiedAt" | "_sortTs">) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...cat, slug: generateSlug(cat.name), lastModifiedAt: getTimestamp(), _sortTs: Date.now() }
          : c
      )
    );
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const getCategoryById = (id: string) => {
    return categories.find((c) => c.id === id);
  };

  const isNameTaken = (name: string, excludeId?: string) => {
    return categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== excludeId);
  };

  const isSlugTaken = (slug: string, excludeId?: string) => {
    return categories.some((c) => c.slug === slug && c.id !== excludeId);
  };

  return (
    <CategoriesContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, getCategoryById, isNameTaken, isSlugTaken }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
