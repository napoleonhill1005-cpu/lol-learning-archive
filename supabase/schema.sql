-- 티어 스냅샷 테이블 (계정당 하루 1행, 같은 날 재검색은 갱신).
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.
create table if not exists tier_snapshots (
  id bigint generated always as identity primary key,
  puuid text not null,
  riot_id text not null,
  tier text not null,
  division text not null default '',
  lp int not null,
  wins int not null,
  losses int not null,
  captured_on date not null,
  created_at timestamptz not null default now(),
  unique (puuid, captured_on)
);

create index if not exists tier_snapshots_puuid_idx
  on tier_snapshots (puuid, captured_on);

-- RLS 켜고 정책은 만들지 않는다 = anon 키로는 접근 불가, service_role 키(서버 전용)로만 읽고 쓴다.
alter table tier_snapshots enable row level security;
