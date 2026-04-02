-- Addenda and Notifications Migration

CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant notifications" 
ON public.notifications 
FOR ALL 
USING (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()));

-- We can index the tenant_id in notifications for faster lookup
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id);
