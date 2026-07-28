import { createContext, useContext, useState, ReactNode } from "react";

export interface Attribute {
  id: string;
  name: string;
  description?: string;
  displayName?: string;
  dataType: string;
  validation: Record<string, unknown>;
  isFilterable: boolean;
  acceptMultipleValues: boolean;
  icon?: string;
  valueIcons?: Record<string, string>;
  lastModifiedBy: string;
  lastModifiedAt: string;
  _sortTs: number;
}

interface AttributesContextType {
  attributes: Attribute[];
  addAttribute: (attr: Omit<Attribute, "id" | "lastModifiedBy" | "lastModifiedAt" | "_sortTs">) => Attribute;
  updateAttribute: (id: string, updates: Partial<Omit<Attribute, "id" | "lastModifiedBy" | "lastModifiedAt" | "_sortTs">>) => void;
  deleteAttribute: (id: string) => void;
}

const AttributesContext = createContext<AttributesContextType | undefined>(undefined);

export function AttributesProvider({ children }: { children: ReactNode }) {
  const [attributes, setAttributes] = useState<Attribute[]>([
    {
      id: "seed-attr-1",
      name: "storage",
      displayName: "Storage",
      dataType: "dropdown",
      description: "Internal storage capacity",
      validation: { predefinedValues: ["64 GB", "128 GB", "256 GB", "512 GB"] },
      isFilterable: true,
      acceptMultipleValues: false,
      lastModifiedBy: "System",
      lastModifiedAt: "12 Feb, 2026, 10:00 AM",
      _sortTs: 1739350800000,
    },
    {
      id: "seed-attr-2",
      name: "color",
      displayName: "Color",
      dataType: "color",
      description: "Product color option",
      validation: { enablePresets: true, colors: [{ hex: "#000000", name: "Black" }, { hex: "#FFFFFF", name: "White" }, { hex: "#1E3A5F", name: "Navy" }] },
      isFilterable: true,
      acceptMultipleValues: true,
      lastModifiedBy: "System",
      lastModifiedAt: "12 Feb, 2026, 10:00 AM",
      _sortTs: 1739350800001,
    },
  ]);

  const getTimestamp = () =>
    new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const addAttribute = (attr: Omit<Attribute, "id" | "lastModifiedBy" | "lastModifiedAt" | "_sortTs">): Attribute => {
    const newAttribute: Attribute = {
      ...attr,
      id: Date.now().toString(),
      acceptMultipleValues: attr.acceptMultipleValues ?? (attr.dataType !== "true_or_false"),
      lastModifiedBy: "You",
      lastModifiedAt: getTimestamp(),
      _sortTs: Date.now(),
    };
    setAttributes((prev) => [...prev, newAttribute]);
    return newAttribute;
  };

  const updateAttribute = (id: string, updates: Partial<Omit<Attribute, "id" | "lastModifiedBy" | "lastModifiedAt" | "_sortTs">>) => {
    setAttributes((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, ...updates, lastModifiedBy: "You", lastModifiedAt: getTimestamp(), _sortTs: Date.now() }
          : a
      )
    );
  };

  const deleteAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <AttributesContext.Provider value={{ attributes, addAttribute, updateAttribute, deleteAttribute }}>
      {children}
    </AttributesContext.Provider>
  );
}

export function useAttributes() {
  const context = useContext(AttributesContext);
  if (!context) {
    throw new Error("useAttributes must be used within an AttributesProvider");
  }
  return context;
}
