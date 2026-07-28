import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ImageIcon, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function MobileUploadPage() {
  const [searchParams] = useSearchParams();
  const sessionCode = searchParams.get("code") || "";
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  // Validate session on mount
  useEffect(() => {
    if (!sessionCode || !/^[A-Z0-9]{6}$/i.test(sessionCode)) {
      setSessionValid(false);
      return;
    }

    const validateSession = async () => {
      const { data, error } = await supabase
        .from("upload_sessions")
        .select("id, expires_at, is_active")
        .eq("session_code", sessionCode)
        .eq("is_active", true);

      if (error || !data || data.length === 0) {
        setSessionValid(false);
        return;
      }

      const session = data[0];
      if (new Date(session.expires_at) < new Date()) {
        setSessionValid(false);
        return;
      }

      setSessionId(session.id);
      setSessionValid(true);
    };

    validateSession();
  }, [sessionCode]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !sessionId) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const fileName = `${sessionId}/${Date.now()}-${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("qr-uploads")
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) {
        setError("Upload failed. Please try again.");
        continue;
      }

      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from("qr-uploads")
        .createSignedUrl(fileName, 3600);

      const fileUrl = signedData?.signedUrl || "";

      // Insert into session_media
      await supabase.from("session_media").insert({
        session_id: sessionId,
        file_url: fileUrl,
        file_name: file.name,
      });

      // Show preview
      setPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      setUploadCount((prev) => prev + 1);
    }

    setUploading(false);

    // Reset file inputs
    const cameraInput = document.getElementById("cameraInput") as HTMLInputElement;
    const galleryInput = document.getElementById("galleryInput") as HTMLInputElement;
    if (cameraInput) cameraInput.value = "";
    if (galleryInput) galleryInput.value = "";
  };

  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h1 className="text-lg font-semibold text-gray-900">Session Expired</h1>
          <p className="text-sm text-gray-500">This upload session is invalid or has expired.<br />Please scan a new QR code from the desktop app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">📸 Upload Photos</h1>
          <p className="text-sm text-gray-500 mt-1">Photos will appear on your desktop instantly</p>
        </div>

        <button
          onClick={() => document.getElementById("cameraInput")?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-base font-semibold bg-gray-900 text-white active:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>

        <button
          onClick={() => document.getElementById("galleryInput")?.click()}
          disabled={uploading}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-base font-semibold bg-white text-gray-900 border border-gray-200 active:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ImageIcon className="w-5 h-5" />
          Choose from Gallery
        </button>

        <input
          type="file"
          id="cameraInput"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          type="file"
          id="galleryInput"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-50 text-blue-600 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        )}

        {error && (
          <div className="text-center py-3 px-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {uploadCount > 0 && !uploading && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-50 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            {uploadCount} photo(s) uploaded successfully
          </div>
        )}

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {previews.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
