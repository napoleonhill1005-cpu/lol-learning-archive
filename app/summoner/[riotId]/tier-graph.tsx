import type { TierSnapshot } from "@/lib/tier-store";

/**
 * 티어 변화 그래프 (서버 렌더 순수 SVG, 차트 라이브러리 없음).
 * y축은 티어·디비전·LP를 절대 LP로 편 값: 아이언4 0LP = 0, 디비전당 100, 티어당 400,
 * 마스터 이상 = 2800 + LP (마스터부터는 LP가 연속이라 그대로 이어진다).
 */

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"];
const TIER_SHORT: Record<string, string> = {
  IRON: "아이언",
  BRONZE: "브론즈",
  SILVER: "실버",
  GOLD: "골드",
  PLATINUM: "플래",
  EMERALD: "에메",
  DIAMOND: "다이아",
  MASTER: "마스터",
  GRANDMASTER: "그마",
  CHALLENGER: "챌린저",
};
const DIV_OFFSET: Record<string, number> = { IV: 0, III: 100, II: 200, I: 300 };
const DIV_NUM: Record<string, string> = { IV: "4", III: "3", II: "2", I: "1" };

function absoluteLp(s: TierSnapshot): number {
  const i = TIERS.indexOf(s.tier);
  return i < 0 ? 2800 + s.lp : i * 400 + (DIV_OFFSET[s.division] ?? 0) + s.lp;
}

function shortLabel(s: TierSnapshot): string {
  const apex = TIERS.indexOf(s.tier) < 0;
  const name = TIER_SHORT[s.tier] ?? s.tier;
  return apex ? `${name} ${s.lp}LP` : `${name} ${DIV_NUM[s.division] ?? ""} ${s.lp}LP`;
}

/** 절대 LP 값이 어느 구간인지 역변환 — 그리드라인 라벨용 */
function boundaryLabel(abs: number): string {
  if (abs >= 2800) return `마스터+ ${abs - 2800}LP`;
  const tier = TIERS[Math.floor(abs / 400)];
  const div = ["IV", "III", "II", "I"][Math.floor((abs % 400) / 100)];
  return `${TIER_SHORT[tier]} ${DIV_NUM[div]}`;
}

export default function TierGraph({ history }: { history: TierSnapshot[] }) {
  // 점 하나로는 그래프가 안 됨 — 스냅샷이 이틀 이상 쌓이면 자동으로 나타난다
  if (history.length < 2) return null;

  const W = 640;
  const H = 170;
  const PAD = { top: 14, right: 14, bottom: 22, left: 74 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const values = history.map(absoluteLp);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, 60); // 변동이 없어도 납작해지지 않게 최소 폭
  const min = rawMin - span * 0.15;
  const max = rawMax + span * 0.15;

  const x = (i: number) =>
    PAD.left + (history.length === 1 ? iw / 2 : (i / (history.length - 1)) * iw);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * ih;

  // 디비전 경계(100LP 단위) 그리드라인 — 너무 빽빽하면 티어 경계(400)로 성긴다
  const step = (max - min) / 100 > 7 ? 400 : 100;
  const lines: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) lines.push(v);

  const points = history.map((s, i) => `${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`);
  const last = history[history.length - 1];
  const delta = values[values.length - 1] - values[0];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-zinc-200">티어 변화</h2>
        <span className="text-xs text-zinc-500">
          {history[0].capturedOn} ~ {last.capturedOn} · {history.length}일 ·{" "}
          <span className={delta >= 0 ? "text-emerald-400" : "text-red-400"}>
            {delta >= 0 ? "+" : ""}
            {delta}LP
          </span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[420px]"
          role="img"
          aria-label="일자별 티어 변화 그래프"
        >
          {lines.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="#3f3f46"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#71717a">
                {boundaryLabel(v)}
              </text>
            </g>
          ))}
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {history.map((s, i) => (
            <circle key={s.capturedOn} cx={x(i)} cy={y(values[i])} r="3" fill="#fbbf24">
              <title>{`${s.capturedOn} · ${shortLabel(s)} (시즌 ${s.wins}승 ${s.losses}패)`}</title>
            </circle>
          ))}
          <text x={PAD.left} y={H - 6} fontSize="9" fill="#71717a">
            {history[0].capturedOn}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" fontSize="9" fill="#71717a">
            {last.capturedOn}
          </text>
        </svg>
      </div>
    </div>
  );
}
