-- Fix the trigger schema resolution for `tenants` and `profiles` tables
-- Triggers on `auth.users` evaluate without the `public` schema in the search path by default.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id TEXT;
  resolved_full_name TEXT;
  resolved_avatar_url TEXT;
BEGIN
  resolved_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)
  );

  resolved_avatar_url := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'picture', '')
  );

  -- Special case: link hello@bidblender.com.au to pre-seeded demo tenant
  IF NEW.email = 'hello@bidblender.com.au' THEN
    INSERT INTO public.profiles (id, tenant_id, email, full_name, avatar_url)
    VALUES (NEW.id::text, 'hello-bidblender', NEW.email, resolved_full_name, resolved_avatar_url);
    RETURN NEW;
  END IF;

  -- Create a new tenant for other users (individual account)
  new_tenant_id := 'user-' || NEW.id::text;
  
  INSERT INTO public.tenants (id, name) 
  VALUES (new_tenant_id, resolved_full_name);
  
  INSERT INTO public.profiles (id, tenant_id, email, full_name, avatar_url)
  VALUES (NEW.id::text, new_tenant_id, NEW.email, resolved_full_name, resolved_avatar_url);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
