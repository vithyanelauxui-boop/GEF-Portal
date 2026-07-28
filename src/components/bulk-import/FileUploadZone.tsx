import { useState, useRef, useCallback } from "react";
import { Link2, Upload, X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import icCloudUpload from "@/assets/ic-cloud-upload.svg";
import { toast } from "@/hooks/use-toast";

export interface UploadedFile {
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileUploadZoneProps {
  onFileUploaded?: (file: UploadedFile) => void;
  acceptedFormats?: string;
  maxSizeMB?: number;
  hideAddUrl?: boolean;
}

export function FileUploadZone({
  onFileUploaded,
  acceptedFormats = ".xlsx,.csv",
  maxSizeMB = 5,
  hideAddUrl = false,
}: FileUploadZoneProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback(
    (file: File) => {
      const fileData: UploadedFile = {
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading",
      };
      setUploadedFile(fileData);

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          const completed = { ...fileData, progress: 100, status: "completed" as const };
          setUploadedFile(completed);
          onFileUploaded?.(completed);
        } else {
          setUploadedFile((prev) => (prev ? { ...prev, progress } : null));
        }
      }, 300);
    },
    [onFileUploaded]
  );

  const validateAndUpload = useCallback(
    (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const validExts = acceptedFormats.split(",").map((f) => f.replace(".", "").toLowerCase());
      if (!ext || !validExts.includes(ext)) {
        toast({ title: "Invalid file type", description: `Supported formats: ${acceptedFormats}`, variant: "destructive" });
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ title: "File too large", description: `Max file size is ${maxSizeMB}MB`, variant: "destructive" });
        return;
      }
      simulateUpload(file);
    },
    [acceptedFormats, maxSizeMB, simulateUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [validateAndUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      e.target.value = "";
    },
    [validateAndUpload]
  );

  const removeFile = () => setUploadedFile(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} kb`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <img src={icCloudUpload} alt="Upload" className="w-10 h-10 mb-4" />
        <div className="flex items-center gap-3 mb-3">
          {!hideAddUrl && (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Link2 className="w-4 h-4" /> Add URL
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Upload File
          </Button>
        </div>
        <p className="text-sm font-medium text-foreground">Drag and drop your files here</p>
        <p className="text-xs text-muted-foreground mt-1">Supported Format: XLSX, CSV ({maxSizeMB}MB)</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {uploadedFile && (
        <div className="mt-3 border border-border rounded-lg px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</span>
              {uploadedFile.status === "completed" && (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              )}
            </div>
            {uploadedFile.status === "uploading" ? (
              <div className="flex items-center gap-3 mt-1">
                <Progress value={uploadedFile.progress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground w-8">{Math.round(uploadedFile.progress)}%</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{formatSize(uploadedFile.size)}</span>
            )}
          </div>
          <button onClick={removeFile} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
