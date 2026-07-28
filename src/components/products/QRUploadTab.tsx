import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, RefreshCw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRUploadTabProps {
  onMediaAdded: (urls: string[]) => void;
}

export function QRUploadTab({ onMediaAdded }: QRUploadTabProps) {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState("");

  const createSession = useCallback(async () => {
    setIsCreating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("upload_sessions")
      .insert({ session_code: code })
      .select()
      .single();

    if (data && !error) {
      setSessionCode(data.session_code);
      setSessionId(data.id);
      setExpiresAt(new Date(data.expires_at));
      setUploadedFiles([]);
    }
    setIsCreating(false);
  }, []);

  // Create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Realtime subscription for new uploads
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-media-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_media",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newUrl = (payload.new as any).file_url;
          setUploadedFiles((prev) => {
            const updated = [...prev, newUrl];
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Sync uploaded files to parent whenever they change
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      onMediaAdded(uploadedFiles);
    }
  }, [uploadedFiles, onMediaAdded]);

  // Use the published app URL so the QR code works when scanned from any phone
  const appBaseUrl = "https://fyndcatalog.lovable.app";
  const uploadUrl = sessionCode
    ? `${appBaseUrl}/mobile-upload?code=${sessionCode}`
    : "";

  const isExpired = timeLeft === "Expired";

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {sessionCode && !isExpired ? (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            <span>Scan with your phone to upload photos</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <QRCodeSVG value={uploadUrl} size={180} level="M" />
          </div>
          <p className="text-xs text-muted-foreground">
            Expires in <span className="font-mono font-semibold text-foreground">{timeLeft}</span>
          </p>

          {uploadedFiles.length > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <Check className="w-4 h-4" />
                {uploadedFiles.length} photo(s) received
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uploadedFiles.map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border">
                    <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : isExpired ? (
        <div className="text-center space-y-3 py-4">
          <p className="text-sm text-muted-foreground">Session expired</p>
          <Button variant="outline" size="sm" onClick={createSession} disabled={isCreating}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isCreating ? "animate-spin" : ""}`} />
            Generate New QR
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Generating QR code...</span>
        </div>
      )}
    </div>
  );
}
