import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { FileUploadZone, UploadedFile } from "@/components/bulk-import/FileUploadZone";
import { UploadHistoryTable, UploadHistoryEntry } from "@/components/bulk-import/UploadHistoryTable";

export default function BulkImportInventoryPage() {
  const navigate = useNavigate();
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);
  const [template, setTemplate] = useState("inventory-adjustment");
  const handleFileUploaded = (file: UploadedFile) => {
    const entry: UploadHistoryEntry = {
      batchId: `Inventory ${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: file.name,
      total: Math.floor(Math.random() * 100) + 20,
      success: Math.floor(Math.random() * 50) + 10,
      failed: Math.floor(Math.random() * 5),
      unmapped: Math.floor(Math.random() * 15),
      uploadedBy: "User",
      status: "Running",
    };
    setUploadHistory((prev) => [entry, ...prev]);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/inventory")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Bulk Import</h1>
        </div>

        {/* Import Inventory Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Import Inventory</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Need help in importing? <a href="#" className="text-primary underline underline-offset-2">Learn More</a>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger className="bg-background w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-inventory">Price & Inventory Template</SelectItem>
                  <SelectItem value="inventory-adjustment">Inventory Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-1">
                    Download Template File <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem className="cursor-pointer">CSV</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">XLSX</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Upload Area */}
          <FileUploadZone onFileUploaded={handleFileUploaded} hideAddUrl />
        </div>

        {/* Upload History */}
        <UploadHistoryTable entries={uploadHistory} />
      </div>
    </DashboardLayout>
  );
}
