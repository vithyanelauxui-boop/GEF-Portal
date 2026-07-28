import { createContext, useContext, useState, ReactNode } from "react";

export type ColumnDataType = "text" | "number" | "dimension";
export type DimensionUnit = "cm" | "inches" | "mm" | "m" | "ft" | "yd";

export interface SizeChartColumn {
  id: string;
  header: string;
  dataType: ColumnDataType;
  dimensionUnit?: DimensionUnit;
}

export interface SizeChartRow {
  id: string;
  values: Record<string, string>; // columnId -> value
}

export interface SizeChart {
  unit: "cm" | "inches";
  columns: SizeChartColumn[];
  rows: SizeChartRow[];
  description: string;
  mediaUrl: string | null;
}

export interface SizeGuide {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  sizeChart: SizeChart | null;
  linkedProducts: string[];
  linkedBrands: string[];
  linkedCategories: string[];
  createdAt: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  _sortTs: number;
}

interface SizeGuidesContextType {
  sizeGuides: SizeGuide[];
  addSizeGuide: (guide: Omit<SizeGuide, "id" | "createdAt" | "lastModifiedAt" | "lastModifiedBy" | "_sortTs">) => SizeGuide;
  updateSizeGuide: (id: string, updates: Partial<Omit<SizeGuide, "id" | "createdAt" | "_sortTs">>) => void;
  deleteSizeGuide: (id: string) => void;
  getSizeGuideById: (id: string) => SizeGuide | undefined;
}

const SizeGuidesContext = createContext<SizeGuidesContextType | undefined>(undefined);

export function SizeGuidesProvider({ children }: { children: ReactNode }) {
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>([]);

  const getTimestamp = () =>
    new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const addSizeGuide = (guide: Omit<SizeGuide, "id" | "createdAt" | "lastModifiedAt" | "lastModifiedBy" | "_sortTs">): SizeGuide => {
    const now = getTimestamp();
    const newGuide: SizeGuide = {
      ...guide,
      id: Date.now().toString(),
      createdAt: now,
      lastModifiedAt: now,
      lastModifiedBy: "Admin",
      _sortTs: Date.now(),
    };
    setSizeGuides((prev) => [...prev, newGuide]);
    return newGuide;
  };

  const updateSizeGuide = (id: string, updates: Partial<Omit<SizeGuide, "id" | "createdAt" | "_sortTs">>) => {
    setSizeGuides((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, ...updates, lastModifiedAt: getTimestamp(), lastModifiedBy: "Admin", _sortTs: Date.now() } : g
      )
    );
  };

  const deleteSizeGuide = (id: string) => {
    setSizeGuides((prev) => prev.filter((g) => g.id !== id));
  };

  const getSizeGuideById = (id: string) => sizeGuides.find((g) => g.id === id);

  return (
    <SizeGuidesContext.Provider value={{ sizeGuides, addSizeGuide, updateSizeGuide, deleteSizeGuide, getSizeGuideById }}>
      {children}
    </SizeGuidesContext.Provider>
  );
}

export function useSizeGuides() {
  const context = useContext(SizeGuidesContext);
  if (!context) {
    throw new Error("useSizeGuides must be used within a SizeGuidesProvider");
  }
  return context;
}
