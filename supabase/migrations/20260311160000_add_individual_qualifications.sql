-- Add individual qualifications (person-level certs, degrees) separate from org certifications
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS individual_qualifications JSONB DEFAULT '[]';
