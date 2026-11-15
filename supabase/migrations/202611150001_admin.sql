begin;
create table public.admin_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9_-]{3,64}$'),
 email text not null unique,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.admin_accounts enable row level security;
revoke all on public.admin_accounts from public,anon,authenticated;
grant all on public.admin_accounts to service_role;

create table public.admin_login_limits (
 key text primary key, window_started_at timestamptz not null default now(), attempts integer not null default 0 check(attempts>=0)
);
alter table public.admin_login_limits enable row level security;
revoke all on public.admin_login_limits from public,anon,authenticated;
grant all on public.admin_login_limits to service_role;

create function public.allow_admin_login(p_ip_hash text,p_username_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
declare ip_hits integer; user_hits integer;
begin
 if length(p_ip_hash)<>64 or length(p_username_hash)<>64 then return false; end if;
 perform pg_advisory_xact_lock(8340021);
 delete from public.admin_login_limits where window_started_at<now()-interval '1 day';
 insert into public.admin_login_limits as limits(key,attempts) values('ip:'||p_ip_hash,1)
 on conflict(key) do update set
 attempts=case when limits.window_started_at<now()-interval '15 minutes' then 1 else limits.attempts+1 end,
 window_started_at=case when limits.window_started_at<now()-interval '15 minutes' then now() else limits.window_started_at end
 returning attempts into ip_hits;
 insert into public.admin_login_limits as limits(key,attempts) values('user:'||p_username_hash,1)
 on conflict(key) do update set
 attempts=case when limits.window_started_at<now()-interval '15 minutes' then 1 else limits.attempts+1 end,
 window_started_at=case when limits.window_started_at<now()-interval '15 minutes' then now() else limits.window_started_at end
 returning attempts into user_hits;
 return ip_hits<=30 and user_hits<=12;
end; $$;
revoke all on function public.allow_admin_login(text,text) from public,anon,authenticated;
grant execute on function public.allow_admin_login(text,text) to service_role;

create function public.admin_overview()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'users',(select count(*) from profiles p where not exists(select 1 from admin_accounts a where a.user_id=p.id)),
 'animals',(select count(*) from animals),
 'records',(select count(*) from weighing_records where status='saved'),
 'pending_deletions',(select count(*) from profiles where deletion_requested_at is not null),
 'analyses_today',(select count(*) from analysis_usage where created_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
 'analyses_month',(select count(*) from analysis_usage where created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
 'completed_month',(select count(*) from analysis_usage where status='completed' and created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
 'failed_month',(select count(*) from analysis_usage where status='failed' and created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
 'input_tokens_month',(select coalesce(sum(input_tokens),0) from analysis_usage where created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'),
 'output_tokens_month',(select coalesce(sum(output_tokens),0) from analysis_usage where created_at>=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
);
$$;
revoke all on function public.admin_overview() from public,anon,authenticated;
grant execute on function public.admin_overview() to service_role;

create function public.admin_user_directory(p_search text default '',p_page integer default 1,p_size integer default 20,p_deletions boolean default false)
returns jsonb language sql stable security definer set search_path=public as $$
with filtered as (
 select p.* from profiles p where not exists(select 1 from admin_accounts a where a.user_id=p.id)
 and (not p_deletions or p.deletion_requested_at is not null)
 and (p_search='' or p.full_name ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%' or p.farm_name ilike '%'||p_search||'%')
), page_rows as (
 select f.*, (select count(*) from animals a where a.user_id=f.id) as animal_count,
 (select count(*) from weighing_records w where w.user_id=f.id and status='saved') as record_count
 from filtered f order by f.created_at desc,f.id limit greatest(1,least(p_size,100)) offset greatest(0,p_page-1)*greatest(1,least(p_size,100))
)
select jsonb_build_object('items',coalesce((select jsonb_agg(page_rows) from page_rows),'[]'::jsonb),'total',(select count(*) from filtered));
$$;
revoke all on function public.admin_user_directory(text,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.admin_user_directory(text,integer,integer,boolean) to service_role;
commit;
