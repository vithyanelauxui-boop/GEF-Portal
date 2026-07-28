import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const sessionCode = url.searchParams.get("code");

  // GET: Serve the mobile upload HTML page
  if (req.method === "GET") {
    if (!sessionCode) {
      return new Response("Missing session code", { status: 400, headers: corsHeaders });
    }

    // Validate session code format to prevent XSS injection
    if (!/^[A-Z0-9]{6}$/i.test(sessionCode)) {
      return new Response("Invalid session code format", { status: 400, headers: corsHeaders });
    }

    // Server-side session validation before serving HTML
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: session, error: sessError } = await supabase
      .from("upload_sessions")
      .select("id, expires_at, is_active")
      .eq("session_code", sessionCode)
      .eq("is_active", true)
      .single();

    if (sessError || !session || new Date(session.expires_at) < new Date()) {
      return new Response("Invalid or expired session", { status: 403, headers: corsHeaders });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Upload Photos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f9fa; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 24px 16px; color: #1a1a1a; }
    .container { max-width: 400px; width: 100%; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; text-align: center; }
    .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; text-align: center; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 12px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; margin-bottom: 12px; }
    .btn-camera { background: #1a1a1a; color: white; }
    .btn-camera:active { background: #333; }
    .btn-gallery { background: white; color: #1a1a1a; border: 1.5px solid #e5e7eb; }
    .btn-gallery:active { background: #f9fafb; }
    .preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
    .preview-item { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; }
    .preview-item img { width: 100%; height: 100%; object-fit: cover; }
    .preview-check { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .preview-check svg { width: 14px; height: 14px; color: white; }
    .status { text-align: center; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 500; margin-top: 12px; }
    .status-success { background: #f0fdf4; color: #16a34a; }
    .status-error { background: #fef2f2; color: #dc2626; }
    .status-uploading { background: #eff6ff; color: #2563eb; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #2563eb; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <h1>Upload Photos</h1>
    <p class="subtitle">Photos will appear on your desktop instantly</p>
    
    <button class="btn btn-camera" onclick="openCamera()">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
      Take Photo
    </button>
    <button class="btn btn-gallery" onclick="openGallery()">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      Choose from Gallery
    </button>

    <div id="previews" class="preview-grid"></div>
    <div id="status"></div>
  </div>

  <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display:none" onchange="handleFiles(this.files)">
  <input type="file" id="galleryInput" accept="image/*" multiple style="display:none" onchange="handleFiles(this.files)">

  <script>
    const SESSION_CODE = "${sessionCode}";
    const SUPABASE_URL = "${supabaseUrl}";
    const SUPABASE_KEY = "${supabaseKey}";
    let uploadCount = 0;

    function openCamera() { document.getElementById('cameraInput').click(); }
    function openGallery() { document.getElementById('galleryInput').click(); }

    function showStatus(el, msg, type) {
      el.textContent = '';
      const div = document.createElement('div');
      div.className = 'status status-' + type;
      if (type === 'uploading') {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        div.appendChild(spinner);
        div.appendChild(document.createTextNode(' ' + msg));
      } else {
        div.textContent = msg;
      }
      el.appendChild(div);
    }

    async function handleFiles(files) {
      if (!files || files.length === 0) return;
      const statusEl = document.getElementById('status');
      const previewsEl = document.getElementById('previews');

      // First verify session
      const sessRes = await fetch(SUPABASE_URL + '/rest/v1/upload_sessions?session_code=eq.' + SESSION_CODE + '&is_active=eq.true&select=id,expires_at', {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      const sessions = await sessRes.json();
      if (!sessions || sessions.length === 0) {
        showStatus(statusEl, 'Session expired or invalid. Please scan a new QR code.', 'error');
        return;
      }
      const session = sessions[0];
      if (new Date(session.expires_at) < new Date()) {
        showStatus(statusEl, 'Session expired. Please scan a new QR code.', 'error');
        return;
      }

      for (const file of files) {
        uploadCount++;
        const fileName = session.id + '/' + Date.now() + '-' + file.name;

        // Show uploading status
        showStatus(statusEl, 'Uploading...', 'uploading');

        // Upload to storage
        const uploadRes = await fetch(SUPABASE_URL + '/storage/v1/object/qr-uploads/' + fileName, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          showStatus(statusEl, 'Upload failed. Please try again.', 'error');
          continue;
        }

        // Get signed URL since bucket is private
        const signedRes = await fetch(SUPABASE_URL + '/storage/v1/object/sign/qr-uploads/' + fileName, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: 3600 }),
        });
        let fileUrl = '';
        if (signedRes.ok) {
          const signedData = await signedRes.json();
          fileUrl = SUPABASE_URL + '/storage/v1' + signedData.signedURL;
        } else {
          fileUrl = SUPABASE_URL + '/storage/v1/object/qr-uploads/' + fileName;
        }

        // Insert into session_media
        await fetch(SUPABASE_URL + '/rest/v1/session_media', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ session_id: session.id, file_url: fileUrl, file_name: file.name }),
        });

        // Show preview using safe DOM methods
        const div = document.createElement('div');
        div.className = 'preview-item';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = 'uploaded';
        div.appendChild(img);
        const checkDiv = document.createElement('div');
        checkDiv.className = 'preview-check';
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '3');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        const polyline = document.createElementNS(svgNS, 'polyline');
        polyline.setAttribute('points', '20 6 9 17 4 12');
        svg.appendChild(polyline);
        checkDiv.appendChild(svg);
        div.appendChild(checkDiv);
        previewsEl.appendChild(div);

        showStatus(statusEl, uploadCount + ' photo(s) uploaded successfully', 'success');
      }

      // Reset inputs
      document.getElementById('cameraInput').value = '';
      document.getElementById('galleryInput').value = '';
    }
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
