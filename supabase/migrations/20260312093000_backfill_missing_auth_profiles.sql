-- Backfill tenant/profile rows for legacy auth users that predate the
-- current signup trigger or missed it for any reason.

WITH missing_users AS (
  SELECT
    au.id::text AS user_id,
    au.email,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      split_part(COALESCE(au.email, au.id::text), '@', 1)
    ) AS full_name,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(au.raw_user_meta_data->>'picture', '')
    ) AS avatar_url,
    CASE
      WHEN au.email = 'hello@bidblender.com.au' THEN 'hello-bidblender'
      ELSE 'user-' || au.id::text
    END AS tenant_id
  FROM auth.users au
  LEFT JOIN public.profiles profile
    ON profile.id = au.id::text
  WHERE profile.id IS NULL
)
INSERT INTO public.tenants (id, name)
SELECT missing_users.tenant_id, missing_users.full_name
FROM missing_users
LEFT JOIN public.tenants tenant
  ON tenant.id = missing_users.tenant_id
WHERE tenant.id IS NULL;

WITH missing_users AS (
  SELECT
    au.id::text AS user_id,
    au.email,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'full_name', ''),
      split_part(COALESCE(au.email, au.id::text), '@', 1)
    ) AS full_name,
    COALESCE(
      NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
      NULLIF(au.raw_user_meta_data->>'picture', '')
    ) AS avatar_url,
    CASE
      WHEN au.email = 'hello@bidblender.com.au' THEN 'hello-bidblender'
      ELSE 'user-' || au.id::text
    END AS tenant_id
  FROM auth.users au
  LEFT JOIN public.profiles profile
    ON profile.id = au.id::text
  WHERE profile.id IS NULL
)
INSERT INTO public.profiles (id, tenant_id, email, full_name, avatar_url)
SELECT
  missing_users.user_id,
  missing_users.tenant_id,
  missing_users.email,
  missing_users.full_name,
  missing_users.avatar_url
FROM missing_users;
