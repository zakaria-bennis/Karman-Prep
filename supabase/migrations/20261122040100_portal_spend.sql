-- One balance for coins, and every spend in one step (PR 309 review, 2026-11-22).
--
-- Coins are earned in three places (student_point_awards, student_coin_awards, exam_sittings.coins)
-- and were spent in two: the portal's Rewards (portal_rewards.spent) and the old Daily 10 box
-- (student_reward_boxes, open_reward_box). Each ledger ignored the other, so the same coins could be
-- spent twice, and two tabs could both read the same balance and both spend it.
--
-- portal_spend charges a price and applies its prize under the same lock open_reward_box took,
-- against everything earned less everything spent (old boxes included, so a box opened before the
-- swap stays paid for). portal_use_pass takes one held pass in a single update. open_reward_box is
-- retired: the Daily 10's end no longer opens boxes, and nothing may spend through it again.
-- Additive: no table changes.

create or replace function public.portal_spend(
  p_student text,
  p_price integer,
  p_add_owned text default null,
  p_pass text default null,
  p_pass_max integer default null
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_earned bigint;
  v_boxes bigint;
  v_spent integer;
  v_owned text[];
  v_passes jsonb;
  v_held integer;
  v_balance bigint;
begin
  if p_student is null or p_price is null or p_price <= 0 then
    raise exception 'bad_input';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reward-box:' || p_student, 0));

  select coalesce(sum(points), 0) into v_earned
    from public.student_point_awards where student_id = p_student;
  v_earned := v_earned + coalesce(
    (select sum(coins) from public.student_coin_awards where student_id = p_student), 0);
  v_earned := v_earned + coalesce(
    (select sum(coins) from public.exam_sittings where student_id = p_student and coins > 0), 0);
  select coalesce(sum(cost - bonus), 0) into v_boxes
    from public.student_reward_boxes where student_id = p_student;

  insert into public.portal_rewards (student_id) values (p_student)
    on conflict (student_id) do nothing;
  select spent, owned, passes into v_spent, v_owned, v_passes
    from public.portal_rewards where student_id = p_student for update;

  v_balance := v_earned - v_boxes - v_spent;
  if v_balance < p_price then
    return jsonb_build_object('ok', false, 'error', 'not_enough', 'coins', greatest(v_balance, 0));
  end if;

  if p_add_owned is not null then
    if p_add_owned = any(v_owned) then
      return jsonb_build_object('ok', false, 'error', 'owned', 'owned', to_jsonb(v_owned));
    end if;
    if cardinality(v_owned) >= 100 then
      return jsonb_build_object('ok', false, 'error', 'full', 'owned', to_jsonb(v_owned));
    end if;
    v_owned := v_owned || p_add_owned;
  end if;

  if p_pass is not null then
    v_held := coalesce((v_passes ->> p_pass)::integer, 0);
    if p_pass_max is not null and v_held >= p_pass_max then
      return jsonb_build_object('ok', false, 'error', 'max');
    end if;
    v_passes := jsonb_set(v_passes, array[p_pass], to_jsonb(v_held + 1));
  end if;

  update public.portal_rewards
    set spent = v_spent + p_price, owned = v_owned, passes = v_passes, updated_at = now()
    where student_id = p_student;
  return jsonb_build_object(
    'ok', true, 'coins', v_balance - p_price, 'owned', to_jsonb(v_owned), 'passes', v_passes);
end;
$$;

-- takes one held pass; false when none is held
create or replace function public.portal_use_pass(p_student text, p_pass text) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_found boolean;
begin
  update public.portal_rewards
    set passes = jsonb_set(passes, array[p_pass], to_jsonb((passes ->> p_pass)::integer - 1)),
        updated_at = now()
    where student_id = p_student and coalesce((passes ->> p_pass)::integer, 0) > 0
    returning true into v_found;
  return coalesce(v_found, false);
end;
$$;

revoke all on function public.portal_spend(text, integer, text, text, integer) from public;
revoke all on function public.portal_use_pass(text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.portal_spend(text, integer, text, text, integer) from anon';
    execute 'revoke all on function public.portal_use_pass(text, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.portal_spend(text, integer, text, text, integer) from authenticated';
    execute 'revoke all on function public.portal_use_pass(text, text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.portal_spend(text, integer, text, text, integer) to service_role';
    execute 'grant execute on function public.portal_use_pass(text, text) to service_role';
    -- the old Daily 10 box spent the same coins through a ledger of its own: retired
    execute 'revoke all on function public.open_reward_box(text, uuid, integer, text[], integer) from service_role';
  end if;
end $$;
