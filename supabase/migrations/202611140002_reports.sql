begin;
create function public.report_summary(p_animal uuid default null,p_species text default null,p_from timestamptz default null,p_to timestamptz default null)
returns jsonb language sql stable security invoker set search_path=public as $$
with filtered as (
 select w.*,a.species from public.weighing_records w join public.animals a on a.id=w.animal_id and a.user_id=w.user_id
 where w.user_id=auth.uid() and w.status='saved' and (p_animal is null or w.animal_id=p_animal) and (p_species is null or a.species=p_species)
 and (p_from is null or w.created_at>=p_from) and (p_to is null or w.created_at<=p_to)
), daily as (
 select (created_at at time zone 'America/Sao_Paulo')::date::text as date,round(avg(estimated_weight_kg),1) as estimated,round(avg(actual_weight_kg),1) as actual from filtered group by 1 order by 1
), distribution as (select species,count(*) as count from filtered group by species)
select jsonb_build_object(
 'animals',(select count(*) from public.animals where user_id=auth.uid() and (p_species is null or species=p_species) and (p_animal is null or id=p_animal)),
 'weighings',(select count(*) from filtered),'last',(select max(created_at) from filtered),'average',(select round(avg(estimated_weight_kg),1) from filtered),
 'series',coalesce((select jsonb_agg(daily) from daily),'[]'::jsonb),'distribution',coalesce((select jsonb_agg(distribution) from distribution),'[]'::jsonb));
$$;
revoke all on function public.report_summary(uuid,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.report_summary(uuid,text,timestamptz,timestamptz) to authenticated;
commit;
