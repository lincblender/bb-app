-- Enable pg_net for async HTTP outbounds
create extension if not exists pg_net;

create or replace function public.webhook_broadcast_crm_signal()
returns trigger
language plpgsql
security definer
as $$
declare
  payload jsonb;
begin
  if (old.strategy_posture is distinct from new.strategy_posture) then
    payload := jsonb_build_object(
      'old_record', row_to_json(old),
      'record', row_to_json(new)
    );

    perform net.http_post(
      url := coalesce(current_setting('app.settings.crm_webhook_url', true), 'http://127.0.0.1:54321/functions/v1/crm-webhook'),
      body := payload,
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer internal-trigger-token"}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_broadcast_crm_signal on public.opportunity_assessments;
create trigger trg_broadcast_crm_signal
after update of strategy_posture on public.opportunity_assessments
for each row
execute function public.webhook_broadcast_crm_signal();
