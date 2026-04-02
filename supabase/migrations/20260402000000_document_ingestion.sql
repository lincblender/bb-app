-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Create Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('opportunity_documents', 'opportunity_documents', false) 
ON CONFLICT (id) DO NOTHING;

-- document_assets
CREATE TABLE public.document_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opportunity_id TEXT references public.opportunities(id) on delete set null,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'safe', 'malicious', 'error')),
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- document_chunks
CREATE TABLE public.document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.document_assets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opportunity_id TEXT references public.opportunities(id) on delete set null,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: document_assets
ALTER TABLE public.document_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assets in their tenants" 
ON public.document_assets 
FOR ALL 
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- RLS: document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access chunks in their tenants" 
ON public.document_chunks 
FOR ALL 
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- RLS: Storage files
CREATE POLICY "Users can upload and read their tenant documents" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'opportunity_documents' AND 
  (auth.uid() IN (
    SELECT user_id FROM public.user_tenants 
    WHERE tenant_id::text = (string_to_array(name, '/'))[1]
  ))
)
WITH CHECK (
  bucket_id = 'opportunity_documents' AND 
  (auth.uid() IN (
    SELECT user_id FROM public.user_tenants 
    WHERE tenant_id::text = (string_to_array(name, '/'))[1]
  ))
);

-- Optional: index for similarity search
CREATE INDEX ON public.document_chunks USING hnsw (embedding vector_l2_ops);
