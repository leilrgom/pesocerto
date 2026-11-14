begin;
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 full_name text not null default '', email text not null default '', phone text not null default '', farm_name text not null default '',
 deletion_requested_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.animals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 identification text not null check(length(identification) between 1 and 80), name text not null default '',
 species text not null check(species in ('Bovino','Suíno','Ovino','Caprino','Equino')), breed text not null default '',
 sex text not null check(sex in ('Macho','Fêmea','Não informado')), birth_date date,
 approximate_age_months integer check(approximate_age_months>0 and approximate_age_months<=1200),
 reference_weight_kg numeric check(reference_weight_kg>0 and reference_weight_kg<=10000), photo_path text, notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), unique(user_id,identification)
);
create table public.weighing_records (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 animal_id uuid not null, estimated_weight_kg numeric, minimum_weight_kg numeric, maximum_weight_kg numeric,
 actual_weight_kg numeric check(actual_weight_kg>0 and actual_weight_kg<=10000),
 estimation_method text not null default 'IA experimental', evidence_quality text not null check(evidence_quality in ('baixa','moderada','alta','insuficiente')),
 model_name text not null, model_version text, ai_response jsonb not null,
 status text not null default 'draft' check(status in ('draft','saved')), notes text default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
 foreign key(animal_id,user_id) references public.animals(id,user_id) on delete cascade,
 check ((estimated_weight_kg is null and minimum_weight_kg is null and maximum_weight_kg is null) or
 (estimated_weight_kg is not null and minimum_weight_kg is not null and maximum_weight_kg is not null and estimated_weight_kg>0 and estimated_weight_kg<=10000 and minimum_weight_kg>0 and maximum_weight_kg<=10000 and minimum_weight_kg<=estimated_weight_kg and maximum_weight_kg>=estimated_weight_kg))
);
create table public.weighing_photos (
 id uuid primary key default gen_random_uuid(), weighing_id uuid not null, user_id uuid not null references public.profiles on delete cascade,
 storage_path text not null unique, photo_type text not null check(photo_type in ('lateral','traseira')), created_at timestamptz not null default now(),
 foreign key(weighing_id,user_id) references public.weighing_records(id,user_id) on delete cascade
);
create table public.analysis_usage (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 request_id uuid not null, payload_hash text not null, weighing_id uuid references public.weighing_records on delete set null,
 model_name text not null, input_tokens integer not null default 0 check(input_tokens>=0), output_tokens integer not null default 0 check(output_tokens>=0),
 status text not null default 'reserved' check(status in ('reserved','completed','failed')), created_at timestamptz not null default now(), unique(user_id,request_id)
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
 title text not null, message text not null, read_at timestamptz, created_at timestamptz not null default now()
);
create index animals_owner on public.animals(user_id,created_at desc);
create index records_owner on public.weighing_records(user_id,status,created_at desc);
create index records_animal on public.weighing_records(animal_id,created_at);
create index photos_owner on public.weighing_photos(user_id,weighing_id);
create index usage_period on public.analysis_usage(created_at,user_id);
create index notifications_owner on public.notifications(user_id,created_at desc);
create function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now();return new;end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger animals_touch before update on public.animals for each row execute function public.touch_updated_at();
create trigger records_touch before update on public.weighing_records for each row execute function public.touch_updated_at();
create function public.on_signup() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.profiles(id,full_name,email) values(new.id,coalesce(left(new.raw_user_meta_data->>'full_name',120),''),coalesce(new.email,''));return new;end; $$;
create trigger signup_profile after insert on auth.users for each row execute function public.on_signup();
-- Backfill users created before migration.
insert into public.profiles(id,full_name,email) select id,coalesce(left(raw_user_meta_data->>'full_name',120),''),coalesce(email,'') from auth.users on conflict do nothing;
create function public.sync_email() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.profiles set email=coalesce(new.email,'') where id=new.id;return new;end; $$;
create trigger user_email_changed after update of email on auth.users for each row execute function public.sync_email();
-- One database-wide transaction lock serializes quota reservations, including concurrent users.
-- All attempts, including failed/reserved ones, count. Dates use America/Sao_Paulo.
create function public.reserve_analysis(p_user uuid,p_request uuid,p_hash text,p_model text,p_daily integer,p_monthly integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.analysis_usage; usage_id uuid; day_start timestamptz; month_start timestamptz;
begin
 if p_daily<1 or p_monthly<1 then raise exception 'INVALID_LIMIT';end if;
 perform pg_advisory_xact_lock(7349201);
 select * into existing from public.analysis_usage where user_id=p_user and request_id=p_request;
 if found then
  if existing.payload_hash<>p_hash then raise exception 'REQUEST_CONFLICT';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status,'weighing_id',existing.weighing_id,'existing',true);
 end if;
 day_start=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 month_start=date_trunc('month',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
 if (select count(*) from public.analysis_usage where user_id=p_user and created_at>=day_start)>=p_daily then raise exception 'DAILY_LIMIT';end if;
 if (select count(*) from public.analysis_usage where created_at>=month_start)>=p_monthly then raise exception 'GLOBAL_LIMIT';end if;
 insert into public.analysis_usage(user_id,request_id,payload_hash,model_name) values(p_user,p_request,p_hash,p_model) returning id into usage_id;
 return jsonb_build_object('id',usage_id,'status','reserved','existing',false);
end; $$;
revoke all on function public.reserve_analysis(uuid,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.reserve_analysis(uuid,uuid,text,text,integer,integer) to service_role;
alter table public.profiles enable row level security;
alter table public.animals enable row level security;
alter table public.weighing_records enable row level security;
alter table public.weighing_photos enable row level security;
alter table public.analysis_usage enable row level security;
alter table public.notifications enable row level security;
create policy own_profile_select on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_animals on public.animals for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_records_read on public.weighing_records for select to authenticated using(user_id=(select auth.uid()));
create policy own_photos_read on public.weighing_photos for select to authenticated using(user_id=(select auth.uid()));
create policy own_usage_read on public.analysis_usage for select to authenticated using(user_id=(select auth.uid()));
create policy own_notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy own_notifications_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.profiles,public.animals,public.weighing_records,public.weighing_photos,public.analysis_usage,public.notifications from anon,authenticated;
grant select on public.profiles,public.animals,public.weighing_records,public.weighing_photos,public.analysis_usage,public.notifications to authenticated;
grant update(full_name,phone,farm_name,deletion_requested_at) on public.profiles to authenticated;
grant insert(user_id,identification,name,species,breed,sex,birth_date,approximate_age_months,reference_weight_kg,notes), update(identification,name,species,breed,sex,birth_date,approximate_age_months,reference_weight_kg,notes),delete on public.animals to authenticated;
grant update(read_at) on public.notifications to authenticated;
-- Records, usage and photo paths are written only by verified server handlers.
grant all on public.profiles,public.animals,public.weighing_records,public.weighing_photos,public.analysis_usage,public.notifications to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('animal-photos','animal-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('weighing-photos','weighing-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy private_animal_photos on storage.objects for select to authenticated using(bucket_id='animal-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy private_weighing_photos on storage.objects for select to authenticated using(bucket_id='weighing-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
