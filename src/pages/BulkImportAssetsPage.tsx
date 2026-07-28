import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUploadZone, UploadedFile } from "@/components/bulk-import/FileUploadZone";
import { UploadHistoryTable, UploadHistoryEntry } from "@/components/bulk-import/UploadHistoryTable";
import icCreateFolders from "@/assets/ic-create-folders.svg";
import icAddImages from "@/assets/ic-add-images.svg";
import icRenameFolders from "@/assets/ic-rename-folders.svg";
import icZipName from "@/assets/ic-zip-name.svg";

const INSTRUCTIONS = [
  { icon: icCreateFolders, title: "Create folders", desc: "Make a separate folder for each product" },
  { icon: icAddImages, title: "Add images", desc: "Place only that product's images in its folder" },
  { icon: icRenameFolders, title: "Rename folders", desc: "Rename each folder using the product's seller ID" },
  { icon: icZipName, title: "Zip & name", desc: "Zip all the folders together and give your ZIP file a clear name" },
];

export default function BulkImportAssetsPage() {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(true);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [activeStep, setActiveStep] = useState(-1);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryEntry[]>([]);

  // Staggered reveal animation
  useEffect(() => {
    if (!showInstructions) {
      setVisibleSteps(0);
      setActiveStep(-1);
      return;
    }
    setVisibleSteps(0);
    setActiveStep(-1);
    const timers: NodeJS.Timeout[] = [];
    INSTRUCTIONS.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleSteps(i + 1);
        setActiveStep(i);
      }, 400 + i * 350));
    });
    // Remove active highlight after all revealed
    timers.push(setTimeout(() => setActiveStep(-1), 400 + INSTRUCTIONS.length * 350 + 600));
    return () => timers.forEach(clearTimeout);
  }, [showInstructions]);

  const handleFileUploaded = (file: UploadedFile) => {
    const entry: UploadHistoryEntry = {
      batchId: `Department ${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`,
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
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Bulk Import</h1>
        </div>

        {/* Import Assets Card */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Import Assets</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Need help in importing?{" "}
                <button onClick={() => setShowInstructions(true)} className="text-primary underline underline-offset-2">
                  View Instructions
                </button>
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowInstructions(true)}>
              View Instructions
            </Button>
          </div>

          <FileUploadZone onFileUploaded={handleFileUploaded} />
        </div>

        {/* Upload History */}
        <UploadHistoryTable entries={uploadHistory} />
      </div>

      {/* Instructions Modal */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File Upload Instructions</DialogTitle>
          </DialogHeader>
          <div className="relative pt-2">
            {/* Vertical connecting line - only between items, not after last */}
            <div
              className="absolute left-5 top-10 w-0.5 bg-border transition-all duration-700 ease-out"
              style={{
                height: visibleSteps > 1 ? `${Math.min((Math.min(visibleSteps, INSTRUCTIONS.length) - 2) * 88 + 40, (INSTRUCTIONS.length - 2) * 88 + 40)}px` : "0px",
              }}
            />

            {INSTRUCTIONS.map((item, i) => {
              const isVisible = i < visibleSteps;
              const isActive = i === activeStep;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 py-4 relative transition-all duration-500 ease-out"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? "translateX(0) scale(1)" : "translateX(-20px) scale(0.95)",
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  <div className="relative z-10">
                    <img
                      src={item.icon}
                      alt={item.title}
                      className={`w-10 h-10 flex-shrink-0 transition-transform duration-500 ${
                        isActive ? "scale-110" : ""
                      }`}
                    />
                  </div>
                  <div
                    className={`transition-colors duration-300 ${
                      isActive ? "translate-x-1" : ""
                    }`}
                    style={{ transition: "transform 0.3s ease" }}
                  >
                    <h4
                      className={`text-sm font-semibold transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="flex justify-end pt-2 transition-all duration-500"
            style={{
              opacity: visibleSteps >= INSTRUCTIONS.length ? 1 : 0,
              transform: visibleSteps >= INSTRUCTIONS.length ? "translateY(0)" : "translateY(10px)",
            }}
          >
            <Button onClick={() => setShowInstructions(false)}>Start Upload</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
