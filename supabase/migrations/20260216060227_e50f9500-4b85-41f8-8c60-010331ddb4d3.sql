
-- Fix upload_sessions RLS policies
DROP POLICY IF EXISTS "Anyone can read upload sessions by code" ON public.upload_sessions;
DROP POLICY IF EXISTS "Anyone can update upload sessions" ON public.upload_sessions;
DROP POLICY IF EXISTS "Anyone can create upload sessions" ON public.upload_sessions;

-- Only allow reading active, non-expired sessions
CREATE POLICY "Read active sessions only"
ON public.upload_sessions FOR SELECT
USING (is_active = true AND expires_at > now());

-- Only allow creating sessions (keep permissive for QR flow)
CREATE POLICY "Create upload sessions"
ON public.upload_sessions FOR INSERT
WITH CHECK (true);

-- Only allow deactivating sessions (setting is_active to false)
CREATE POLICY "Deactivate sessions only"
ON public.upload_sessions FOR UPDATE
USING (is_active = true)
WITH CHECK (is_active = false);

-- Fix session_media RLS policies
DROP POLICY IF EXISTS "Anyone can read session media" ON public.session_media;
DROP POLICY IF EXISTS "Anyone can insert session media" ON public.session_media;

-- Only allow reading media for active, non-expired sessions
CREATE POLICY "Read media for active sessions"
ON public.session_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.upload_sessions
    WHERE id = session_media.session_id
      AND is_active = true
      AND expires_at > now()
  )
);

-- Only allow inserting media for active, non-expired sessions
CREATE POLICY "Insert media for active sessions"
ON public.session_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.upload_sessions
    WHERE id = session_media.session_id
      AND is_active = true
      AND expires_at > now()
  )
);

-- Fix storage bucket: make private, add file constraints
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'qr-uploads';

-- Fix storage policies
DROP POLICY IF EXISTS "Anyone can upload to qr-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read qr-uploads" ON storage.objects;

-- Allow uploads only to paths matching active session IDs
CREATE POLICY "Upload to active sessions only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'qr-uploads'
  AND EXISTS (
    SELECT 1 FROM public.upload_sessions
    WHERE id::text = (storage.foldername(name))[1]
      AND is_active = true
      AND expires_at > now()
  )
);

-- Allow reading files from active sessions only
CREATE POLICY "Read files from active sessions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'qr-uploads'
  AND EXISTS (
    SELECT 1 FROM public.upload_sessions
    WHERE id::text = (storage.foldername(name))[1]
      AND is_active = true
      AND expires_at > now()
  )
);
