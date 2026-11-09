import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import Text from "../locales/ko.json";
import { npcText, opponentName } from "./maps";
import "./briefing-theme.css";

/* 난이도를 고른 뒤 대결 직전에 나오는 상대 소개 화면. 문구는 ko.json의 briefing에서 고칩니다. */
type BriefingProps = {
  scenarioId: string;
  level: number;
  Portrait: ComponentType<{ kind: string; face: any; small?: boolean; level?: number }>;
  onTone: (frequency: number, duration?: number) => void;
  onStart: () => void;
  onBack: () => void;
};

const TOPICS = Text.briefing.topics;
const START_INDEX = TOPICS.length;

function BriefingScreen({ scenarioId, level, Portrait, onTone, onStart, onBack }: BriefingProps) {
  const [selected, setSelected] = useState(0);
  const scenario = (Text.scenarios as any)[scenarioId];
  /* 사람(레벨)별 소개가 ko.json map.maps에 있으면 그걸, 없으면 상황 공통 소개 */
  const info = { ...(Text.briefing.characters as any)[scenarioId], ...npcText(scenarioId, level) };
  const lines = [info.profile, info.habit, info.tip, Text.briefing.ready];
  const select = (index: number) => { setSelected(index); onTone(440, 0.05); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") { event.preventDefault(); onBack(); return; }
      if (event.code === "ArrowDown" || event.code === "ArrowUp") {
        event.preventDefault();
        select((selected + (event.code === "ArrowDown" ? 1 : START_INDEX)) % (START_INDEX + 1));
        return;
      }
      /* Enter를 누를 때마다 다음 항목을 읽고, 마지막 '대결 시작'에서 시작 */
      if ((event.key === "Enter" || event.code === "NumpadEnter") && !event.repeat) {
        event.preventDefault();
        if (selected === START_INDEX) onStart();
        else select(selected + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section className="briefing-scene">
      <div className="briefing-frame">
        <div className="briefing-portrait"><Portrait kind={scenario.character} level={level} face="NORMAL" /></div>
      </div>
      <div className="briefing-side">
        {/* 상대 이름·역할은 오른쪽 칸 맨 위 */}
        <div className="briefing-head">
          <p>{Text.briefing.kicker}</p>
          <h2>{opponentName(scenarioId, level)}</h2>
          <strong>{info.role ?? scenario.role}</strong>
          <span>{scenario.name} · {scenario.setting} · {Text.ui.difficulty[level]}</span>
        </div>
        <div className="briefing-menu" data-ui>
          {TOPICS.map((topic, index) => <button key={topic} className={selected === index ? "selected" : ""} onClick={() => select(index)}>{topic}</button>)}
          <button className={`briefing-start ${selected === START_INDEX ? "selected" : ""}`} onClick={onStart}>{Text.briefing.start} ▶</button>
        </div>
        <div className="briefing-box"><p key={selected}>{lines[selected]}</p></div>
      </div>
      <span className="briefing-hint">{Text.briefing.hint}</span>
    </section>
  );
}

export default BriefingScreen;
