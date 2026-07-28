import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Search, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, Ruler, X, Package, Grid3X3, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { CreateSizeChartModal } from "@/components/size-guide/CreateSizeChartModal";
import { AddProductsModal, AddCategoriesModal, AddVariantsModal, BulkUploadProductsModal } from "@/components/size-guide/LinkModals";
import { useSizeGuides, type SizeGuide, type SizeChart } from "@/contexts/SizeGuidesContext";
import { useProducts } from "@/contexts/ProductsContext";

import { useCategories } from "@/contexts/CategoriesContext";
import { useToast } from "@/hooks/use-toast";
import emptyImg from "@/assets/empty-attributes.png";

type ViewMode = "list" | "create" | "edit";

export default function SizeGuidePage() {
  const { sizeGuides, addSizeGuide, updateSizeGuide, deleteSizeGuide, getSizeGuideById } = useSizeGuides();
  const { products } = useProducts();
  
  const { categories } = useCategories();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [sizeChart, setSizeChart] = useState<SizeChart | null>(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState<string[]>([]);
  const [linkedCategories, setLinkedCategories] = useState<string[]>([]);
  const [linkedVariants, setLinkedVariants] = useState<string[]>([]);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [variantsModalOpen, setVariantsModalOpen] = useState(false);
  const [bulkUploadProductsModalOpen, setBulkUploadProductsModalOpen] = useState(false);

  const resetForm = () => {
    setName(""); setTitle(""); setSubtitle(""); setSizeChart(null);
    setLinkedProducts([]); setLinkedCategories([]); setLinkedVariants([]);
  };

  const handleEdit = (id: string) => {
    const guide = getSizeGuideById(id);
    if (!guide) return;
    setName(guide.name);
    setTitle(guide.title);
    setSubtitle(guide.subtitle);
    setSizeChart(guide.sizeChart);
    setLinkedProducts(guide.linkedProducts);
    setLinkedCategories(guide.linkedCategories);
    setLinkedCategories(guide.linkedCategories);
    setEditingId(id);
    setViewMode("edit");
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const payload = {
      name, title, subtitle, sizeChart,
      linkedProducts, linkedBrands: [], linkedCategories,
    };

    if (viewMode === "edit" && editingId) {
      updateSizeGuide(editingId, payload);
    } else {
      addSizeGuide(payload);
    }
    resetForm();
    setEditingId(null);
    setViewMode("list");
  };

  const handleCancel = () => {
    resetForm();
    setEditingId(null);
    setViewMode("list");
  };

  const removeLinkedProduct = (id: string) => setLinkedProducts(prev => prev.filter(p => p !== id));
  const removeLinkedCategory = (id: string) => setLinkedCategories(prev => prev.filter(c => c !== id));
  const removeLinkedVariant = (id: string) => setLinkedVariants(prev => prev.filter(v => v !== id));

  // List logic
  const filtered = sizeGuides
    .filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (b._sortTs ?? 0) - (a._sortTs ?? 0));
  const totalResults = filtered.length;
  const totalPages = Math.ceil(totalResults / parseInt(rowsPerPage));
  const startIndex = (currentPage - 1) * parseInt(rowsPerPage);
  const endIndex = Math.min(startIndex + parseInt(rowsPerPage), totalResults);
  const paginated = filtered.slice(startIndex, endIndex);

  // ---- LIST VIEW ----
  if (viewMode === "list") {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Size Guide</h1>
            {sizeGuides.length > 0 && (
              <Button onClick={() => { resetForm(); setViewMode("create"); }}>Create Size Guide</Button>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border">
            {sizeGuides.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <img src={emptyImg} alt="No size guides" className="w-40 h-40 mb-6" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No size guides found</h3>
                <p className="text-sm text-muted-foreground mb-6">Once you create size guides they will appear here</p>
                <div className="flex gap-3">
                  <Button variant="outline">Learn more</Button>
                  <Button onClick={() => { resetForm(); setViewMode("create"); }}>Create Size Guide</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  <div className="relative flex-1 md:w-64 md:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9 h-9" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-muted-foreground font-medium">Name</TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Title</TableHead>
                        <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Last Modified</TableHead>
                        <TableHead className="w-[80px] md:w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((guide) => (
                        <TableRow key={guide.id} className="group cursor-pointer" onClick={() => handleEdit(guide.id)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Ruler className="w-4 h-4 text-muted-foreground shrink-0" />
                              {guide.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{guide.title}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{guide.lastModifiedBy} on {guide.lastModifiedAt}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(guide.id); }}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: guide.id, name: guide.name }); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-3 md:p-4 flex flex-col gap-2 md:flex-row items-start md:items-center justify-between border-t border-border">
                  <span className="text-sm text-muted-foreground">Showing {startIndex + 1}-{endIndex} of {totalResults} results</span>
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

        <DeleteConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          title={`Delete ${deleteTarget?.name}?`}
          description={`Are you sure you want to delete this size guide? This action cannot be undone.`}
          onConfirm={() => { if (deleteTarget) deleteSizeGuide(deleteTarget.id); }}
        />
      </DashboardLayout>
    );
  }

  // ---- CREATE / EDIT VIEW ----
  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground">Size Guide</h1>
          </div>
          <Button onClick={handleSave}>Save</Button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-card rounded-lg border border-border p-5 md:p-6 space-y-5">
            <h2 className="text-base font-bold text-foreground">Basic Information</h2>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm">Name<span className="text-destructive">*</span></Label>
                <span className="text-xs text-muted-foreground">{name.length}/100</span>
              </div>
              <Input placeholder="For e.g Nike Men Shirt" value={name} onChange={(e) => setName(e.target.value.slice(0, 100))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm">Title<span className="text-destructive">*</span></Label>
                <span className="text-xs text-muted-foreground">{title.length}/100</span>
              </div>
              <Input placeholder="For e.g. Nike Men Green Slim Fit Solid Casual" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm">Subtitle</Label>
                <span className="text-xs text-muted-foreground">{subtitle.length}/100</span>
              </div>
              <Input placeholder="For e.g. Nike Men Green Slim Fit Solid Casual" value={subtitle} onChange={(e) => setSubtitle(e.target.value.slice(0, 100))} />
            </div>
          </div>

          {/* Size Chart */}
          <div className="bg-card rounded-lg border border-border p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Size Chart {sizeChart ? "*" : ""}</h2>
              <Button
                variant="outline"
                className="px-5 h-9 text-sm font-medium text-primary border-primary hover:bg-primary/10"
                onClick={() => setChartModalOpen(true)}
              >
                {sizeChart ? "Modify" : "Create Chart"}
              </Button>
            </div>

            {/* Preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              {sizeChart ? (
                <div className="space-y-4">
                  {/* Title + Unit Toggle + Table section */}
                  <div className="rounded-lg border border-border p-6">
                    <div className="text-center space-y-2">
                      {title && <h3 className="text-base font-bold text-foreground">{title}</h3>}
                      {subtitle && <p className="text-sm text-muted-foreground">*{subtitle}</p>}

                      {sizeChart.columns.length > 0 && (
                        <div className="flex items-center justify-center gap-0 mt-4 mb-4">
                          <button
                            type="button"
                            onClick={() => setSizeChart(prev => prev ? { ...prev, unit: "cm" } : prev)}
                            className={cn(
                              "text-xs px-4 py-1.5 rounded-l-md border font-medium transition-colors",
                              sizeChart.unit === "cm"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            )}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            onClick={() => setSizeChart(prev => prev ? { ...prev, unit: "inches" } : prev)}
                            className={cn(
                              "text-xs px-4 py-1.5 rounded-r-md border-y border-r font-medium transition-colors",
                              sizeChart.unit === "inches"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            )}
                          >
                            inches
                          </button>
                        </div>
                      )}

                      {sizeChart.columns.length > 0 && sizeChart.rows.length > 0 && (
                        <div className="overflow-x-auto mt-4">
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50">
                                  {sizeChart.columns.map((col) => (
                                    <th key={col.id} className="py-3 px-5 text-center font-medium text-foreground border-b border-border">{col.header || "—"}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sizeChart.rows.map((row, rowIdx) => (
                                  <tr key={row.id} className={rowIdx < sizeChart.rows.length - 1 ? "border-b border-border" : ""}>
                                    {sizeChart.columns.map((col) => (
                                      <td key={col.id} className="py-3 px-5 text-center text-foreground">{row.values[col.id] || "—"}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description section */}
                  {sizeChart.description && (
                    <div className="rounded-lg border border-border p-6">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sizeChart.description}</p>
                    </div>
                  )}

                  {/* Media section - no border wrapper */}
                  {sizeChart.mediaUrl && (
                    <div className="mt-2">
                      <img src={sizeChart.mediaUrl} alt="Size guide" className="max-h-72 mx-auto" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border p-6">
                  <p className="text-center text-muted-foreground italic">Title Will Appear Here</p>
                </div>
              )}
            </div>
          </div>

          {/* Apply To Products */}
          <div className="bg-card rounded-lg border border-border p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Apply To Products</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose where this size guide should automatically appear on the storefront. You can apply it by product tags, category, or all products.</p>
                <p className="text-xs text-muted-foreground mt-2 italic">Note: Only one size guide can be auto-applied to all products. If a size guide is manually selected on a product, it overrides the auto-apply rule.</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-4 h-9 text-sm font-medium gap-1 shrink-0">
                    Add <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setVariantsModalOpen(true)}>Variants</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setProductsModalOpen(true)}>Products</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategoriesModalOpen(true)}>Category</DropdownMenuItem>
                  <div className="my-1 h-px bg-border" />
                  <DropdownMenuItem onClick={() => setBulkUploadProductsModalOpen(true)}>Bulk Add</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Linked items display */}
            {(linkedVariants.length > 0 || linkedProducts.length > 0 || linkedCategories.length > 0) && (
              <div className="mt-4 space-y-3">
                {linkedVariants.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Variants ({linkedVariants.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedVariants.map((vid) => (
                        <div key={vid} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground">{vid}</span>
                          <button onClick={() => removeLinkedVariant(vid)} className="p-0.5 hover:bg-muted rounded transition-colors">
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {linkedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Products ({linkedProducts.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedProducts.map((pid) => {
                        const p = products.find(pr => pr.id === pid);
                        return (
                          <div key={pid} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-foreground">{p?.name || pid}</span>
                            <button onClick={() => removeLinkedProduct(pid)} className="p-0.5 hover:bg-muted rounded transition-colors">
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {linkedCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Categories ({linkedCategories.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {linkedCategories.map((cid) => {
                        const c = categories.find(ca => ca.id === cid);
                        return (
                          <div key={cid} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm">
                            <Grid3X3 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-foreground">{c?.name || cid}</span>
                            <button onClick={() => removeLinkedCategory(cid)} className="p-0.5 hover:bg-muted rounded transition-colors">
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Modals */}
      <CreateSizeChartModal
        open={chartModalOpen}
        onOpenChange={setChartModalOpen}
        onSave={(chart) => setSizeChart(chart)}
        initialChart={sizeChart}
      />
      <AddProductsModal
        open={productsModalOpen}
        onOpenChange={setProductsModalOpen}
        onAdd={(ids) => setLinkedProducts(prev => [...prev, ...ids])}
        existingIds={linkedProducts}
      />
      <AddVariantsModal
        open={variantsModalOpen}
        onOpenChange={setVariantsModalOpen}
        onAdd={(ids) => setLinkedVariants(prev => [...prev, ...ids])}
        existingIds={linkedVariants}
      />
      <AddCategoriesModal
        open={categoriesModalOpen}
        onOpenChange={setCategoriesModalOpen}
        onAdd={(ids) => setLinkedCategories(prev => [...prev, ...ids])}
        existingIds={linkedCategories}
      />
      <BulkUploadProductsModal
        open={bulkUploadProductsModalOpen}
        onOpenChange={setBulkUploadProductsModalOpen}
        onAdd={(ids) => setLinkedProducts(prev => [...prev, ...ids])}
        existingIds={linkedProducts}
      />
    </DashboardLayout>
  );
}
