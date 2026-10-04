-- Server-owned baptism names: sample once at profile creation, keep forever.
-- Existing accounts keep their stored name as their legacy baptismal name.
-- Editable display names and baptismal names may coincide;
-- the existing public profile code remains the unique identifier.
create table online_private.baptism_name_words (
  category text not null check (category in ('title', 'adjective', 'noun', 'epithet')),
  word text not null check (char_length(word) between 1 and 12),
  primary key (category, word)
);
alter table online_private.baptism_name_words enable row level security;

insert into online_private.baptism_name_words(category, word) values
  ('title', 'Sir'),
  ('title', 'Lady'),
  ('title', 'Lord'),
  ('title', 'Dame'),
  ('title', 'Duke'),
  ('title', 'Duchess'),
  ('title', 'Count'),
  ('title', 'Countess'),
  ('title', 'Baron'),
  ('title', 'Baroness'),
  ('title', 'Prince'),
  ('title', 'Princess'),
  ('title', 'King'),
  ('title', 'Queen'),
  ('title', 'Captain'),
  ('title', 'Admiral'),
  ('title', 'Commodore'),
  ('title', 'Commander'),
  ('title', 'General'),
  ('title', 'Major'),
  ('title', 'Colonel'),
  ('title', 'Sergeant'),
  ('title', 'Officer'),
  ('title', 'Marshal'),
  ('title', 'Chief'),
  ('title', 'Boss'),
  ('title', 'Dr.'),
  ('title', 'Professor'),
  ('title', 'Doctor'),
  ('title', 'Dean'),
  ('title', 'Maestro'),
  ('title', 'Maestra'),
  ('title', 'DJ'),
  ('title', 'MC'),
  ('title', 'Mx.'),
  ('title', 'Mr.'),
  ('title', 'Ms.'),
  ('title', 'Mister'),
  ('title', 'Miss'),
  ('title', 'Madam'),
  ('title', 'Monsieur'),
  ('title', 'Madame'),
  ('title', 'Don'),
  ('title', 'Donna'),
  ('title', 'Senor'),
  ('title', 'Senora'),
  ('title', 'Senorita'),
  ('title', 'Comrade'),
  ('title', 'Citizen'),
  ('title', 'Friend'),
  ('title', 'Buddy'),
  ('title', 'Pal'),
  ('title', 'Cousin'),
  ('title', 'Uncle'),
  ('title', 'Auntie'),
  ('title', 'Papa'),
  ('title', 'Mama'),
  ('title', 'Grandpa'),
  ('title', 'Grandma'),
  ('title', 'Your Grace'),
  ('title', 'Your Honor'),
  ('title', 'Highness'),
  ('title', 'Majesty'),
  ('title', 'Reverend'),
  ('adjective', 'Wobbly'),
  ('adjective', 'Wiggly'),
  ('adjective', 'Bouncy'),
  ('adjective', 'Fluffy'),
  ('adjective', 'Fuzzy'),
  ('adjective', 'Feathery'),
  ('adjective', 'Plucky'),
  ('adjective', 'Clucky'),
  ('adjective', 'Crispy'),
  ('adjective', 'Crunchy'),
  ('adjective', 'Scrambled'),
  ('adjective', 'Sunny'),
  ('adjective', 'Golden'),
  ('adjective', 'Dapper'),
  ('adjective', 'Fancy'),
  ('adjective', 'Posh'),
  ('adjective', 'Regal'),
  ('adjective', 'Royal'),
  ('adjective', 'Sleepy'),
  ('adjective', 'Yawning'),
  ('adjective', 'Dizzy'),
  ('adjective', 'Goofy'),
  ('adjective', 'Silly'),
  ('adjective', 'Cheeky'),
  ('adjective', 'Sneaky'),
  ('adjective', 'Sassy'),
  ('adjective', 'Saucy'),
  ('adjective', 'Spicy'),
  ('adjective', 'Zesty'),
  ('adjective', 'Tangy'),
  ('adjective', 'Pickled'),
  ('adjective', 'Buttery'),
  ('adjective', 'Toasty'),
  ('adjective', 'Peppy'),
  ('adjective', 'Perky'),
  ('adjective', 'Bubbly'),
  ('adjective', 'Jolly'),
  ('adjective', 'Merry'),
  ('adjective', 'Giggly'),
  ('adjective', 'Ticklish'),
  ('adjective', 'Awkward'),
  ('adjective', 'Clumsy'),
  ('adjective', 'Wonky'),
  ('adjective', 'Quirky'),
  ('adjective', 'Cosmic'),
  ('adjective', 'Galactic'),
  ('adjective', 'Orbiting'),
  ('adjective', 'Lunar'),
  ('adjective', 'Starry'),
  ('adjective', 'Sparkly'),
  ('adjective', 'Glittery'),
  ('adjective', 'Groovy'),
  ('adjective', 'Funky'),
  ('adjective', 'Jazzy'),
  ('adjective', 'Bluesy'),
  ('adjective', 'Swinging'),
  ('adjective', 'Syncopated'),
  ('adjective', 'Offbeat'),
  ('adjective', 'Tuneful'),
  ('adjective', 'Booming'),
  ('adjective', 'Humming'),
  ('adjective', 'Whistling'),
  ('adjective', 'Bopping'),
  ('adjective', 'Tap-Dancing'),
  ('adjective', 'Moonwalking'),
  ('adjective', 'Disco'),
  ('adjective', 'Velvet'),
  ('adjective', 'Neon'),
  ('adjective', 'Pastel'),
  ('adjective', 'Striped'),
  ('adjective', 'Polka-Dot'),
  ('adjective', 'Checkered'),
  ('adjective', 'Tiny'),
  ('adjective', 'Mighty'),
  ('adjective', 'Mini'),
  ('adjective', 'Jumbo'),
  ('adjective', 'Pocket'),
  ('adjective', 'Turbo'),
  ('adjective', 'Nimble'),
  ('adjective', 'Speedy'),
  ('adjective', 'Zooming'),
  ('adjective', 'Drifting'),
  ('adjective', 'Floating'),
  ('adjective', 'Noodly'),
  ('adjective', 'Squishy'),
  ('adjective', 'Squashy'),
  ('adjective', 'Stretchy'),
  ('adjective', 'Rubbery'),
  ('adjective', 'Ruffled'),
  ('adjective', 'Bedheaded'),
  ('adjective', 'Curious'),
  ('adjective', 'Puzzled'),
  ('adjective', 'Unbothered'),
  ('adjective', 'Dramatic'),
  ('adjective', 'Theatrical'),
  ('adjective', 'Triumphant'),
  ('noun', 'Clucks'),
  ('noun', 'Peep'),
  ('noun', 'Chirp'),
  ('noun', 'Squawk'),
  ('noun', 'Cackle'),
  ('noun', 'Bawk'),
  ('noun', 'Chicken'),
  ('noun', 'Rooster'),
  ('noun', 'Hen'),
  ('noun', 'Chick'),
  ('noun', 'Pullet'),
  ('noun', 'Bantam'),
  ('noun', 'Chook'),
  ('noun', 'Feather'),
  ('noun', 'Plume'),
  ('noun', 'Wing'),
  ('noun', 'Beak'),
  ('noun', 'Comb'),
  ('noun', 'Wattle'),
  ('noun', 'Tailfeather'),
  ('noun', 'Egg'),
  ('noun', 'Eggshell'),
  ('noun', 'Yolk'),
  ('noun', 'Omelette'),
  ('noun', 'Frittata'),
  ('noun', 'Souffle'),
  ('noun', 'Nugget'),
  ('noun', 'Drumstick'),
  ('noun', 'Wishbone'),
  ('noun', 'Coop'),
  ('noun', 'Henhouse'),
  ('noun', 'Nest'),
  ('noun', 'Haystack'),
  ('noun', 'Corn'),
  ('noun', 'Kernel'),
  ('noun', 'Seed'),
  ('noun', 'Pebble'),
  ('noun', 'Puddle'),
  ('noun', 'Worm'),
  ('noun', 'Cricket'),
  ('noun', 'Duck'),
  ('noun', 'Goose'),
  ('noun', 'Turkey'),
  ('noun', 'Quail'),
  ('noun', 'Pigeon'),
  ('noun', 'Dodo'),
  ('noun', 'Kiwi'),
  ('noun', 'Penguin'),
  ('noun', 'Puffin'),
  ('noun', 'Parrot'),
  ('noun', 'Owl'),
  ('noun', 'Emu'),
  ('noun', 'Flamingo'),
  ('noun', 'Pawn'),
  ('noun', 'Rook'),
  ('noun', 'Bishop'),
  ('noun', 'Knight'),
  ('noun', 'Castle'),
  ('noun', 'Gambit'),
  ('noun', 'Checkmate'),
  ('noun', 'Stalemate'),
  ('noun', 'Fork'),
  ('noun', 'Pin'),
  ('noun', 'Zugzwang'),
  ('noun', 'Tempo'),
  ('noun', 'Beat'),
  ('noun', 'Groove'),
  ('noun', 'Bassline'),
  ('noun', 'Backbeat'),
  ('noun', 'Downbeat'),
  ('noun', 'Hi-Hat'),
  ('noun', 'Snare'),
  ('noun', 'Cymbal'),
  ('noun', 'Cowbell'),
  ('noun', 'Kazoo'),
  ('noun', 'Banjo'),
  ('noun', 'Ukulele'),
  ('noun', 'Trombone'),
  ('noun', 'Tuba'),
  ('noun', 'Trumpet'),
  ('noun', 'Clarinet'),
  ('noun', 'Saxophone'),
  ('noun', 'Marimba'),
  ('noun', 'Tambourine'),
  ('noun', 'Bongo'),
  ('noun', 'Triangle'),
  ('noun', 'Synth'),
  ('noun', 'Boogie'),
  ('noun', 'Shuffle'),
  ('noun', 'Waltz'),
  ('noun', 'Polka'),
  ('noun', 'Noodle'),
  ('noun', 'Dumpling'),
  ('noun', 'Waffle'),
  ('noun', 'Pancake'),
  ('noun', 'Biscuit'),
  ('noun', 'Crumpet'),
  ('noun', 'Muffin'),
  ('noun', 'Cupcake'),
  ('noun', 'Bagel'),
  ('noun', 'Pretzel'),
  ('noun', 'Pickle'),
  ('noun', 'Turnip'),
  ('noun', 'Potato'),
  ('noun', 'Bean'),
  ('noun', 'Peanut'),
  ('noun', 'Popcorn'),
  ('noun', 'Pudding'),
  ('noun', 'Teapot'),
  ('noun', 'Spoon'),
  ('noun', 'Spatula'),
  ('noun', 'Whisk'),
  ('epithet', 'a-Lot'),
  ('epithet', 'o-Rama'),
  ('epithet', 'McFluff'),
  ('epithet', 'McWobble'),
  ('epithet', 'McPeep'),
  ('epithet', 'McGroove'),
  ('epithet', 'McSquawk'),
  ('epithet', 'McBawk'),
  ('epithet', 'McNugget'),
  ('epithet', 'McBeak'),
  ('epithet', 'McFeather'),
  ('epithet', 'McYolk'),
  ('epithet', 'McBiscuit'),
  ('epithet', 'McBoogie'),
  ('epithet', 'McWiggle'),
  ('epithet', 'McGambit'),
  ('epithet', 'McKazoo'),
  ('epithet', 'McWaffle'),
  ('epithet', 'McMuffin'),
  ('epithet', 'McPickle'),
  ('epithet', 'McCowbell'),
  ('epithet', 'McShuffle'),
  ('epithet', 'McTempo'),
  ('epithet', 'McNoodle'),
  ('epithet', 'McPudding'),
  ('epithet', 'McPlume'),
  ('epithet', 'McCorn'),
  ('epithet', 'McBongo'),
  ('epithet', 'McPancake'),
  ('epithet', 'McDoodle'),
  ('epithet', 'McToasty'),
  ('epithet', 'McSparkle');

create function online_private.generate_baptism_name() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare honorific text; adjective text; noun text; epithet text; style integer;
begin
  select word into strict honorific from online_private.baptism_name_words where category='title' order by random() limit 1;
  select word into strict adjective from online_private.baptism_name_words where category='adjective' order by random() limit 1;
  select word into strict noun from online_private.baptism_name_words where category='noun' order by random() limit 1;
  style:=floor(random()*3)::integer;
  if style=0 then return honorific || ' ' || adjective || ' ' || noun; end if;
  if style=1 then
    select word into strict epithet from online_private.baptism_name_words where category='epithet' order by random() limit 1;
    return honorific || ' ' || noun || '-' || epithet;
  end if;
  return honorific || ' ' || noun || ' the ' || adjective;
end $$;

alter table public.online_profiles add column baptismal_name text check (char_length(baptismal_name) between 1 and 40);
-- Backfill once without changing the visible name or resetting any progress.
update public.online_profiles set baptismal_name=display_name;
alter table public.online_profiles alter column baptismal_name set not null;
alter table public.online_profiles alter column display_name drop default;

create function online_private.keep_baptism_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP='INSERT' then
    NEW.baptismal_name:=online_private.generate_baptism_name();
    NEW.display_name:=coalesce(NEW.display_name, NEW.baptismal_name);
  elsif NEW.baptismal_name is distinct from OLD.baptismal_name then
    raise exception 'NAME_IMMUTABLE' using errcode='23514';
  end if;
  return NEW;
end $$;
create trigger profile_baptism_name before insert or update of baptismal_name on public.online_profiles
for each row execute function online_private.keep_baptism_name();

create or replace function online_private.profile_json(p_id uuid, p_viewer uuid default auth.uid()) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p.id,'code',p.code,'display_name',p.display_name,'baptismal_name',p.baptismal_name,'profile',
    case when p.id=p_viewer then s.profile else jsonb_build_object('profileVersion',1,'conqueredCityIds','[]'::jsonb,'goldenEggs',p.golden_eggs,'points',p.points,'rank',online_private.rank(p.points),'winsCount',p.wins_count,'lastPlayedCityId',null,'updatedAt',floor(extract(epoch from p.updated_at)*1000),'moveRewardNotices',jsonb_build_object('best',false,'worst',false),'gameplayTipSeen',false) end)
  from public.online_profiles p join online_private.profile_saves s on s.user_id=p.id where p.id=p_id
$$;

-- Import Auth's Google name only at creation. Later reads never overwrite edits.
-- The existing signature continues to support editing the separate display name.
create or replace function public.online_profile(p_local_profile jsonb default null,p_display_name text default null,p_expected_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid:=online_private.require_user(); save jsonb; inserted integer; google_name text;
begin
  if p_expected_user_id is not null and u is distinct from p_expected_user_id then raise exception 'FORBIDDEN_IDENTITY' using errcode='42501'; end if;
  select nullif(left(btrim(regexp_replace(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),'[[:cntrl:]]','','g')),40),'')
    into google_name from auth.users where id=u;
  save:=online_private.normalize_profile(p_local_profile);
  insert into public.online_profiles(id,display_name) values(u,google_name) on conflict(id) do nothing;
  insert into online_private.profile_saves(user_id,profile) values(u,save) on conflict(user_id) do nothing;
  get diagnostics inserted=row_count;
  if inserted=1 then update public.online_profiles set points=(save->>'points')::bigint,golden_eggs=(save->>'goldenEggs')::bigint,wins_count=(save->>'winsCount')::bigint where id=u; end if;
  if p_display_name is not null then
    if char_length(btrim(p_display_name)) not between 1 and 40 or p_display_name ~ '[[:cntrl:]]' then raise exception 'INVALID_NAME' using errcode='22023'; end if;
    update public.online_profiles set display_name=btrim(p_display_name),updated_at=now() where id=u;
    update public.online_public_rooms d set creator_name=btrim(p_display_name) from public.online_rooms r where d.room_id=r.id and r.host_id=u;
  end if;
  return online_private.profile_json(u,u);
end $$;

revoke all on function online_private.generate_baptism_name() from public, anon, authenticated;
revoke all on function online_private.keep_baptism_name() from public, anon, authenticated;
