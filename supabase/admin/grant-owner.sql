-- One-time administrative operation for the owner's existing verified account.
-- Never expose this operation through the browser or public RPCs.
do $$
begin
  if (select count(*) from auth.users where lower(email) = 'atimoda@gmail.com' and email_confirmed_at is not null) <> 1 then
    raise exception 'Expected exactly one verified owner account';
  end if;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"access_level":"admin"}'::jsonb
    where lower(email) = 'atimoda@gmail.com' and email_confirmed_at is not null;
end $$;
select email, raw_app_meta_data->>'access_level' as access_level
from auth.users where lower(email) = 'atimoda@gmail.com';
