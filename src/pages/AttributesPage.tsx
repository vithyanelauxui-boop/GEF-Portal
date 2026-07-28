import { useState, useMemo } from "react";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, Hash, Type, AlignLeft, Ruler, Droplet, Scale, Calendar, ToggleLeft, Palette, Code, FileText, Link, Clock, File, ChevronDown, AlertCircle } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AddAttributeModal } from "@/components/products/AddAttributeModal";
import { useAttributes, Attribute } from "@/contexts/AttributesContext";
import { useProducts } from "@/contexts/ProductsContext";
import { UsageHealthPopup, computeUsageHealth } from "@/components/attributes/UsageHealthPopup";
import emptyAttributesImg from "@/assets/empty-attributes.png";

// Data type icon mapping
const dataTypeIcons: Record<string, React.ElementType> = {
  integer: Hash,
  decimal: Hash,
  single_line_text: Type,
  multi_line_text: AlignLeft,
  dropdown: ChevronDown,
  dimensions: Ruler,
  weight: Scale,
  volume: Droplet,
  color: Palette,
  date: Calendar,
  true_or_false: ToggleLeft,
  html: Code,
  json: FileText,
  duration: Clock,
  file: File,
  url: Link,
};

const dataTypeLabels: Record<string, string> = {
  integer: "Integer",
  decimal: "Decimal",
  single_line_text: "Single line text",
  multi_line_text: "Multi line text",
  dropdown: "Dropdown",
  dimensions: "Dimensions",
  weight: "Weight",
  volume: "Volume",
  color: "Color",
  date: "Date",
  true_or_false: "True or False",
  html: "HTML",
  json: "JSON",
  duration: "Duration",
  file: "File",
  url: "URL",
};

export default function AttributesPage() {
  const { attributes, addAttribute, updateAttribute, deleteAttribute } = useAttributes();
  const { products } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [healthPopupAttr, setHealthPopupAttr] = useState<Attribute | null>(null);
  const [dataTypeFilter, setDataTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Compute usage counts and health for all attributes
  const usageMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeUsageHealth>>();
    for (const attr of attributes) {
      map.set(attr.id, computeUsageHealth(attr, products));
    }
    return map;
  }, [attributes, products]);
  
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);


  const handleCreateAttribute = (attr: {
    name: string;
    dataType: string;
    validation: Record<string, unknown>;
    isFilterable: boolean;
    acceptMultipleValues: boolean;
  }) => {
    addAttribute(attr);
  };

  const handleUpdateAttribute = (id: string, updates: {
    displayName?: string;
    validation: Record<string, unknown>;
    isFilterable: boolean;
    acceptMultipleValues: boolean;
  }) => {
    updateAttribute(id, updates);
  };

  const handleDeleteAttribute = (id: string) => {
    deleteAttribute(id);
  };

  const handleEditClick = (attr: Attribute) => {
    setEditingAttribute(attr);
    setModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) setEditingAttribute(null);
  };


  const filteredAttributes = attributes.filter((attr) => {
    const matchesSearch = (attr.displayName || attr.name).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = dataTypeFilter === "all" || attr.dataType === dataTypeFilter;
    return matchesSearch && matchesType;
  }).sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));

  const totalResults = filteredAttributes.length;
  const totalPages = Math.ceil(totalResults / parseInt(rowsPerPage));
  const startIndex = (currentPage - 1) * parseInt(rowsPerPage);
  const endIndex = Math.min(startIndex + parseInt(rowsPerPage), totalResults);
  const paginatedAttributes = filteredAttributes.slice(startIndex, endIndex);

  // Unique data types present
  const availableDataTypes = [...new Set(attributes.map(a => a.dataType))];

  // Get predefined values for icon config
  const getAttrPredefinedValues = (attr: Attribute): string[] => {
    if (attr.validation?.predefinedValues) return attr.validation.predefinedValues as string[];
    if (attr.validation?.colors) return (attr.validation.colors as Array<{name: string}>).map(c => c.name);
    return [];
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6">
         {/* Header */}
         <div className="flex items-center justify-between mb-4 md:mb-6">
           <h1 className="text-xl md:text-2xl font-semibold text-foreground">Attributes</h1>
          {attributes.length > 0 && (
            <Button onClick={() => { setEditingAttribute(null); setModalOpen(true); }}>
              Create Attribute
            </Button>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-card rounded-lg border border-border">
          {attributes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <img src={emptyAttributesImg} alt="No attributes" className="w-40 h-40 mb-6" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No attributes found</h3>
              <p className="text-sm text-muted-foreground mb-6">Once you create Attribute they will appear here</p>
              <div className="flex gap-3">
                <Button variant="outline">Learn more</Button>
                <Button onClick={() => setModalOpen(true)}>Create Attribute</Button>
              </div>
            </div>
          ) : (
            <div>
              {/* Search and Filter */}
              <div className="p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                 <div className="relative flex-1 md:w-64 md:flex-none">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
                 </div>
                 <Select value={dataTypeFilter} onValueChange={(v) => { setDataTypeFilter(v); setCurrentPage(1); }}>
                   <SelectTrigger className="w-full md:w-48 h-9">
                     <SelectValue placeholder="Data Type: All" />
                   </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Data Type: All</SelectItem>
                    {availableDataTypes.map(dt => (
                      <SelectItem key={dt} value={dt}>{dataTypeLabels[dt] || dt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-transparent">
                     <TableHead className="text-muted-foreground font-medium">Attribute</TableHead>
                      <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Slug</TableHead>
                      <TableHead className="text-muted-foreground font-medium hidden sm:table-cell">Data Type</TableHead>
                      <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Last Modified by</TableHead>
                      <TableHead className="text-muted-foreground font-medium text-right">Usage</TableHead>
                      <TableHead className="w-[80px] md:w-[140px]"></TableHead>
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {paginatedAttributes.map((attr) => {
                    const IconComponent = dataTypeIcons[attr.dataType] || Type;
                    const health = usageMap.get(attr.id);
                    const hasIssue = health && health.invalidCount > 0;
                    return (
                      <TableRow key={attr.id} className="group">
                        <TableCell className="font-medium">
                          {attr.displayName || attr.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm hidden md:table-cell">
                          {attr.name}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <IconComponent className="w-4 h-4" />
                            <span>{dataTypeLabels[attr.dataType] || attr.dataType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden md:table-cell">
                           {attr.lastModifiedBy} on {attr.lastModifiedAt}
                         </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-sm text-muted-foreground">{health?.totalUsage ?? 0} {(health?.totalUsage ?? 0) > 1 ? 'products' : 'product'}</span>
                            {hasIssue && (
                              <button
                                type="button"
                                onClick={() => setHealthPopupAttr(attr)}
                                className="text-amber-500 hover:text-amber-600 transition-colors"
                                title="Usage health issues detected"
                              >
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(attr)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: attr.id, name: attr.displayName || attr.name })}>
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

              {/* Pagination */}
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
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Attribute Modal */}
      <AddAttributeModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        onSave={handleCreateAttribute}
        editAttribute={editingAttribute}
        onUpdate={handleUpdateAttribute}
      />

      {/* Usage Health Popup */}
      {healthPopupAttr && usageMap.get(healthPopupAttr.id) && (
        <UsageHealthPopup
          open={!!healthPopupAttr}
          onOpenChange={(open) => { if (!open) setHealthPopupAttr(null); }}
          attribute={healthPopupAttr}
          health={usageMap.get(healthPopupAttr.id)!}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={`Delete ${deleteTarget?.name}?`}
        description={`Are you sure you want to delete ${deleteTarget?.name}? Deleting this attribute will permanently remove all associated product values.`}
        onConfirm={() => { if (deleteTarget) handleDeleteAttribute(deleteTarget.id); }}
      />

    </DashboardLayout>
  );
}
