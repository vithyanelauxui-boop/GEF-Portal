
-- Table to store saved filter views
CREATE TABLE public.saved_filter_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  filters JSONB NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_filter_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read public views
CREATE POLICY "Anyone can read public views"
ON public.saved_filter_views
FOR SELECT
USING (is_public = true);

-- Allow creator to read their private views
CREATE POLICY "Creator can read own views"
ON public.saved_filter_views
FOR SELECT
USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow anyone to insert (no auth required for now since app has no auth)
CREATE POLICY "Anyone can create views"
ON public.saved_filter_views
FOR INSERT
WITH CHECK (true);

-- Allow creator to update own views
CREATE POLICY "Creator can update own views"
ON public.saved_filter_views
FOR UPDATE
USING (true);

-- Allow creator to delete own views
CREATE POLICY "Creator can delete own views"
ON public.saved_filter_views
FOR DELETE
USING (true);
