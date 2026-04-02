-- Clean Rooms Data Partitioning

CREATE TABLE public.clean_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    opportunity_id TEXT REFERENCES public.opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.clean_room_members (
    clean_room_id UUID REFERENCES public.clean_rooms(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('owner', 'guest')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (clean_room_id, tenant_id)
);

CREATE TABLE public.clean_room_documents (
    clean_room_id UUID REFERENCES public.clean_rooms(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.document_assets(id) ON DELETE CASCADE,
    shared_by_tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (clean_room_id, document_id)
);

-- RLS
ALTER TABLE public.clean_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clean_room_documents ENABLE ROW LEVEL SECURITY;

-- Clean Rooms: Read if your tenant is a member
CREATE POLICY "Users can access clean rooms they are members of" 
ON public.clean_rooms 
FOR SELECT 
USING (
    id IN (
        SELECT clean_room_id FROM public.clean_room_members 
        WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
    )
);

-- Clean Room Members
CREATE POLICY "Users can view members of their clean rooms" 
ON public.clean_room_members 
FOR SELECT 
USING (
    clean_room_id IN (
        SELECT clean_room_id FROM public.clean_room_members 
        WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
    )
);

-- Clean Room Documents
CREATE POLICY "Users can see what documents are shared in their clean rooms" 
ON public.clean_room_documents 
FOR SELECT 
USING (
    clean_room_id IN (
        SELECT clean_room_id FROM public.clean_room_members 
        WHERE tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid())
    )
);

-- Notice: We DO NOT update storage.objects RLS. 
-- This intrinsically guarantees IP Protection. A user in a clean room can SEE that 
-- a foreign document is mapped in `clean_room_documents`, but any attempt to GET 
-- the file from Supabase Storage will be rejected because the path belongs to the foreign tenant.
-- The AI Context Engine (running natively via pgvector/service_role) handles chunk synthesis.
