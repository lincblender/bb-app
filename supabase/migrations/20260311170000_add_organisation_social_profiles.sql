ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS social_profiles JSONB DEFAULT '[]';
