-- Add avatar_url to profiles and sync from auth user metadata (LinkedIn, etc.)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update handle_new_user to capture avatar from OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id TEXT;
  avatar_url_val TEXT;
  full_name_val TEXT;
  email_val TEXT;
BEGIN
  -- Extract from provider metadata (LinkedIn uses 'picture', Supabase often uses 'avatar_url')
  avatar_url_val := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  full_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name'
  );
  email_val := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');

  -- Special case: link hello@bidblender.com.au to pre-seeded demo tenant
  IF email_val = 'hello@bidblender.com.au' THEN
    INSERT INTO profiles (id, tenant_id, email, full_name, avatar_url)
    VALUES (NEW.id::text, 'hello-bidblender', email_val, full_name_val, avatar_url_val);
    RETURN NEW;
  END IF;

  -- Create a new tenant for other users (individual account)
  new_tenant_id := 'user-' || NEW.id::text;
  INSERT INTO tenants (id, name) VALUES (new_tenant_id, COALESCE(full_name_val, split_part(email_val, '@', 1)));
  INSERT INTO profiles (id, tenant_id, email, full_name, avatar_url)
  VALUES (NEW.id::text, new_tenant_id, email_val, full_name_val, avatar_url_val);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sync profile when auth user metadata is updated (e.g. on OAuth token refresh)
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', email),
    full_name = COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      full_name
    ),
    avatar_url = COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      avatar_url
    ),
    updated_at = NOW()
  WHERE id = NEW.id::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
    OR OLD.email IS DISTINCT FROM NEW.email
  )
  EXECUTE FUNCTION public.handle_user_updated();
