ALTER TABLE public.pipeline
ADD COLUMN is_video_screened BOOLEAN DEFAULT FALSE,
ADD COLUMN video_screen_reason TEXT;