import { useState } from "react";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import noHistoryImg from "@/assets/no-history.png";

export interface UploadHistoryEntry {
  batchId: string;
  fileName: string;
  total: number;
  success: number;
  failed: number;
  unmapped: number;
  uploadedBy: string;
  status: "Running" | "Completed" | "Failed";
}

interface UploadHistoryTableProps {
  entries: UploadHistoryEntry[];
}

export function UploadHistoryTable({ entries }: UploadHistoryTableProps) {
  const [rowsPerPage, setRowsPerPage] = useState("10");
  const [search, setSearch] = useState("");

  const filtered = entries.filter(
    (e) =>
      e.fileName.toLowerCase().includes(search.toLowerCase()) ||
      e.batchId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Upload History</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 w-48 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border" />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <img src={noHistoryImg} alt="No history" className="w-32 h-32 mb-4" />
          <p className="text-sm font-semibold text-foreground">No history found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full mt-2">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Batch ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">File Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Total</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Success</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Failed</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Unmapped</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Uploaded by</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.batchId} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-foreground truncate max-w-[160px]">{entry.batchId}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.fileName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.total}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.success}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.failed}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.unmapped}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[160px]">{entry.uploadedBy}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                      entry.status === "Running" ? "bg-primary/10 text-primary" :
                      entry.status === "Completed" ? "bg-emerald-50 text-emerald-600" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
        <p className="text-sm text-muted-foreground">
          Showing 1-{Math.min(Number(rowsPerPage), filtered.length)} of {filtered.length} results
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
            <SelectTrigger className="w-16 h-8 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="w-8 h-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="w-8 h-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
