import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import Text from "../locales/ko.json";

/* 난이도를 고른 뒤 대결 직전에 나오는 상대 소개 화면. 문구는 ko.json의 briefing에서 고칩니다. */
type BriefingProps = {
  scenarioId: string;
  level: number;
  Portrait: ComponentType<{ kind: string; face: any; small?: boolean }>;
  onTone: (frequency: number, duration?: number) => void;
  onStart: () => void;
  onBack: () => void;
};

const TOPICS = Text.briefing.topics;
const START_INDEX = TOPICS.length;

function BriefingScreen({ scenarioId, level, Portrait, onTone, onStart, onBack }: BriefingProps) {
  const [selected, setSelected] = useState(0);
  const scenario = (Text.scenarios as any)[scenarioId];
  const info = (Text.briefing.characters as any)[scenarioId];
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
        <div className="briefing-portrait"><Portrait kind={scenario.character} face="NORMAL" /></div>
        <div className="briefing-nameplate"><b>{scenario.opponent}</b><small>{scenario.role}</small></div>
      </div>
      <div className="briefing-side">
        <div className="briefing-head"><p>{Text.briefing.kicker}</p><h2>{scenario.name}</h2><span>{scenario.setting} · {Text.ui.difficulty[level]}</span></div>
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
