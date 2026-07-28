
-- Upload sessions for QR-based mobile uploads
CREATE TABLE public.upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Uploaded media files linked to a session
CREATE TABLE public.session_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.upload_sessions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_media ENABLE ROW LEVEL SECURITY;

-- Public read/write for upload sessions (short-lived, code-gated)
CREATE POLICY "Anyone can create upload sessions"
ON public.upload_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read upload sessions by code"
ON public.upload_sessions FOR SELECT USING (true);

CREATE POLICY "Anyone can update upload sessions"
ON public.upload_sessions FOR UPDATE USING (true);

-- Session media policies
CREATE POLICY "Anyone can insert session media"
ON public.session_media FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read session media"
ON public.session_media FOR SELECT USING (true);

-- Enable realtime for session_media so desktop gets instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_media;

-- Storage bucket for QR uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-uploads', 'qr-uploads', true);

CREATE POLICY "Anyone can upload to qr-uploads"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-uploads');

CREATE POLICY "Anyone can read qr-uploads"
ON storage.objects FOR SELECT USING (bucket_id = 'qr-uploads');
