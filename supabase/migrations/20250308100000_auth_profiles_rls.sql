-- Auth: profiles table + RLS
-- Links auth.users to tenants; created on signup via trigger

-- Profiles: user_id (from auth) -> tenant_id
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id TEXT;
BEGIN
  -- Special case: link hello@bidblender.com.au to pre-seeded demo tenant
  IF NEW.email = 'hello@bidblender.com.au' THEN
    INSERT INTO profiles (id, tenant_id, email, full_name)
    VALUES (NEW.id::text, 'hello-bidblender', NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
  END IF;

  -- Create a new tenant for other users (individual account)
  new_tenant_id := 'user-' || NEW.id::text;
  INSERT INTO tenants (id, name) VALUES (new_tenant_id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  INSERT INTO profiles (id, tenant_id, email, full_name)
  VALUES (NEW.id::text, new_tenant_id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: enable on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE complexity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's tenant_id from profile (in public schema for RLS)
CREATE OR REPLACE FUNCTION public.user_tenant_id()
RETURNS TEXT AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tenant_id() TO service_role;

-- RLS policies: users can only access their tenant's data
CREATE POLICY "Users can read own tenant" ON tenants FOR SELECT USING (id = public.user_tenant_id());
CREATE POLICY "Users can update own tenant" ON tenants FOR UPDATE USING (id = public.user_tenant_id());

CREATE POLICY "Users can manage own org data" ON organisations FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own people" ON people FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own opportunities" ON opportunities FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own assessments" ON opportunity_assessments FOR ALL
  USING (opportunity_id IN (SELECT id FROM opportunities WHERE tenant_id = public.user_tenant_id()));
CREATE POLICY "Users can manage own relationship signals" ON relationship_signals FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own complexity signals" ON complexity_signals FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own connectors" ON connector_sources FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own tender boards" ON tender_boards FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own intelligence events" ON intelligence_events FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own settings" ON user_settings FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own chats" ON chats FOR ALL USING (tenant_id = public.user_tenant_id());
CREATE POLICY "Users can manage own chat messages" ON chat_messages FOR ALL
  USING (chat_id IN (SELECT id FROM chats WHERE tenant_id = public.user_tenant_id()));
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::text);
