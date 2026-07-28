import { useState } from "react";
import { ArrowLeft, ChevronDown, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useBrands } from "@/contexts/BrandsContext";
import { UploadHistoryTable, UploadHistoryEntry } from "@/components/bulk-import/UploadHistoryTable";
import noHistoryImg from "@/assets/no-history.png";

export default function BulkExportProductPage() {
  const navigate = useNavigate();
  const { brands } = useBrands();
  const [productType, setProductType] = useState("");
  const [template, setTemplate] = useState("");
  const [brand, setBrand] = useState("");
  const [modifiedFrom, setModifiedFrom] = useState<Date | undefined>();
  const [modifiedTo, setModifiedTo] = useState<Date | undefined>();
  const [taxRule, setTaxRule] = useState("");
  const [exportHistory, setExportHistory] = useState<UploadHistoryEntry[]>([]);

  const isExportEnabled = !!productType && !!template;

  const handleExport = (fmt: "excel" | "csv") => {
    const ext = fmt === "excel" ? "xlsx" : "csv";
    const entry: UploadHistoryEntry = {
      batchId: `Export ${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: `products-export-${new Date().toISOString().slice(0, 10)}.${ext}`,
      total: Math.floor(Math.random() * 200) + 50,
      success: Math.floor(Math.random() * 150) + 30,
      failed: 0,
      unmapped: 0,
      uploadedBy: "User",
      status: "Running",
    };
    setExportHistory((prev) => [entry, ...prev]);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Bulk Export</h1>
        </div>

        {/* Export Products Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6 overflow-visible">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Export Product Data</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Need help in exporting? <a href="#" className="text-primary underline underline-offset-2">Learn Here</a>
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!isExportEnabled}>
                  Export
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("excel")}>Export as Excel</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Row 1: Product Type, Template, Brand */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Product Type <span className="text-destructive">*</span>
              </label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Product Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Template <span className="text-destructive">*</span>
              </label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Template</SelectItem>
                  <SelectItem value="detailed">Detailed Template</SelectItem>
                  <SelectItem value="minimal">Minimal Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Brand</label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Tax Rule, Modified Date */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Tax Rule</label>
              <Select value={taxRule} onValueChange={setTaxRule}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Tax Rules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tax Rules</SelectItem>
                  <SelectItem value="gst-5">GST 5%</SelectItem>
                  <SelectItem value="gst-12">GST 12%</SelectItem>
                  <SelectItem value="gst-18">GST 18%</SelectItem>
                  <SelectItem value="gst-28">GST 28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Modified Date</label>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !modifiedFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {modifiedFrom ? format(modifiedFrom, "dd MMM yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-[280px] p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={modifiedFrom}
                      onSelect={setModifiedFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground font-medium">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !modifiedTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {modifiedTo ? format(modifiedTo, "dd MMM yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto min-w-[280px] p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={modifiedTo}
                      onSelect={setModifiedTo}
                      disabled={(date) => modifiedFrom ? date < modifiedFrom : false}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Export History */}
        {exportHistory.length > 0 ? (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Export History</h2>
            <UploadHistoryTable entries={exportHistory} />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8">
            <h2 className="text-base font-semibold text-foreground mb-6">Export History</h2>
            <div className="flex flex-col items-center justify-center py-8">
              <img src={noHistoryImg} alt="No history" className="w-24 h-24 mb-4 opacity-60" />
              <p className="text-sm text-muted-foreground">No export history yet</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
