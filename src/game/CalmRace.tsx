/* [추가 김홍경 11/17] 분노 조절 미니게임 '진정 레이스' 트랙 (본 게임·튜토리얼 공용)
   - 기존 '호흡 바늘 맞추기'가 무슨 뜻인지 알기 어려워서, 상대와 타자 레이스를 하는 방식으로 바꿈
   - 위 레인: 나 (목표 문장을 앞에서부터 맞게 친 만큼 전진)
   - 아래 레인: 상대 (난이도별 일정한 속도로 전진, 속도는 GameScreen.tsx의 calmRaceCpm…에서 조절) */

/** 목표 문장을 앞에서부터 몇 %까지 맞게 쳤는지 (틀린 글자가 나오면 거기서 멈춤) */
export function raceProgress(target: string, typed: string) {
  const expected = Array.from(target);
  const entered = Array.from(typed);
  let matched = 0;
  while (matched < expected.length && entered[matched] === expected[matched]) matched++;
  return expected.length ? (matched / expected.length) * 100 : 0;
}

/** 상대가 결승선까지 가는 데 걸리는 시간(초) = 글자 수 ÷ 분당 글자 수 × 60 */
export function raceSeconds(target: string, charsPerMinute: number) {
  return Math.max(1, (Array.from(target).length / Math.max(1, charsPerMinute)) * 60);
}

type LaneProps = { name: string; progress: number; kind: "me" | "rival"; goal: string };

function Lane({ name, progress, kind, goal }: LaneProps) {
  const left = Math.max(0, Math.min(100, progress));
  return (
    <div className={`race-lane race-${kind}`}>
      <span className="race-name">{name}</span>
      <div className="race-road">
        <i className="race-fill" style={{ width: `${left}%` }} />
        <b className="race-runner" style={{ left: `${left}%` }}>▶</b>
        <span className="race-goal">{goal}</span>
      </div>
      <span className="race-percent">{Math.floor(left)}%</span>
    </div>
  );
}

export default function CalmRace({ me, rival, goal, myProgress, rivalProgress }: { me: string; rival: string; goal: string; myProgress: number; rivalProgress: number }) {
  return (
    <div className="race-track" aria-label={`${me} ${Math.floor(myProgress)}%, ${rival} ${Math.floor(rivalProgress)}%`}>
      <Lane name={me} progress={myProgress} kind="me" goal={goal} />
      <Lane name={rival} progress={rivalProgress} kind="rival" goal={goal} />
    </div>
  );
}
