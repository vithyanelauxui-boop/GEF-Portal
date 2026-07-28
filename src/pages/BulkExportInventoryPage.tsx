import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useBrands } from "@/contexts/BrandsContext";
import { UploadHistoryTable, UploadHistoryEntry } from "@/components/bulk-import/UploadHistoryTable";
import noHistoryImg from "@/assets/no-history.png";

export default function BulkExportInventoryPage() {
  const navigate = useNavigate();
  const { brands } = useBrands();
  const [location, setLocation] = useState("all");
  const [brand, setBrand] = useState("all");
  const [quantityOp, setQuantityOp] = useState("");
  const [quantityFrom, setQuantityFrom] = useState("");
  const [quantityTo, setQuantityTo] = useState("");
  const [exportHistory, setExportHistory] = useState<UploadHistoryEntry[]>([]);

  const handleExport = (format: "excel" | "csv") => {
    const ext = format === "excel" ? "xlsx" : "csv";
    const entry: UploadHistoryEntry = {
      batchId: `Export ${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: `inventory-export-${new Date().toISOString().slice(0, 10)}.${ext}`,
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
          <button onClick={() => navigate("/inventory")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Bulk Export</h1>
        </div>

        {/* Export Inventory Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Export Inventory Data</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Need help in exporting? <a href="#" className="text-primary underline underline-offset-2">Learn Here</a>
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={!location || !brand}>
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

          {/* Filter Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Location</label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="shop">Shop location</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
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
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Quantity</label>
              <div className="flex items-center gap-2">
                <Select value={quantityOp} onValueChange={setQuantityOp}>
                  <SelectTrigger className="bg-background w-[160px] flex-shrink-0">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="between">Between</SelectItem>
                    <SelectItem value="greater-than">Greater than</SelectItem>
                    <SelectItem value="equal-to">Equal to</SelectItem>
                    <SelectItem value="less-than">Less than</SelectItem>
                  </SelectContent>
                </Select>
                {quantityOp && (
                  <Input
                    type="number"
                    placeholder={quantityOp === "between" ? "From" : "Value"}
                    value={quantityFrom}
                    onChange={(e) => setQuantityFrom(e.target.value)}
                    className="bg-background w-28"
                  />
                )}
                {quantityOp === "between" && (
                  <>
                    <span className="text-muted-foreground font-medium">-</span>
                    <Input
                      type="number"
                      placeholder="To"
                      value={quantityTo}
                      onChange={(e) => setQuantityTo(e.target.value)}
                      className="bg-background w-28"
                    />
                  </>
                )}
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
