
-- Add DELETE policy for expired/inactive upload sessions (cleanup)
CREATE POLICY "Delete expired or inactive sessions"
ON public.upload_sessions
FOR DELETE
USING (is_active = false OR expires_at < now());

-- Add DELETE policy for session_media tied to expired/inactive sessions
CREATE POLICY "Delete media for expired sessions"
ON public.session_media
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM upload_sessions
  WHERE upload_sessions.id = session_media.session_id
  AND (upload_sessions.is_active = false OR upload_sessions.expires_at < now())
));

-- Tighten session creation: add a rate-limit-style constraint
-- Replace the overly permissive INSERT policy with one that limits creation
DROP POLICY IF EXISTS "Create upload sessions" ON public.upload_sessions;

-- New INSERT policy: still allows anonymous creation but adds a check
-- that session_code must be exactly 6 alphanumeric characters
CREATE POLICY "Create upload sessions with validation"
ON public.upload_sessions
FOR INSERT
WITH CHECK (
  length(session_code) = 6
  AND session_code ~ '^[A-Z0-9]{6}$'
);
