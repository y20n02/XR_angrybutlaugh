import { useEffect, useState } from "react";
import Text from "../locales/ko.json";
import Assets from "../assets.json";
import type { Gender } from "./maps";

/* 처음 GAME START를 누르면 나오는 주인공 선택 (←→ 고르기, Enter 결정). 문구는 ko.json의 select에서 고칩니다. */
type SelectProps = {
  initial: Gender | null;
  onPick: (gender: Gender) => void;
  onBack: () => void;
  onTone: (frequency: number, duration?: number) => void;
};

const OPTIONS: Gender[] = ["f", "m"];

export default function PlayerSelect({ initial, onPick, onBack, onTone }: SelectProps) {
  const [selected, setSelected] = useState(Math.max(0, OPTIONS.indexOf(initial ?? "f")));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "ArrowLeft" || event.code === "ArrowRight" || event.code === "KeyA" || event.code === "KeyD") {
        event.preventDefault(); setSelected((i) => 1 - i); onTone(520, 0.04);
      } else if (event.code === "Enter" || event.code === "Space") {
        event.preventDefault(); onTone(760, 0.1); onPick(OPTIONS[selected]);
      } else if (event.code === "Escape") { event.preventDefault(); onBack(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section className="select-scene">
      <h2>{Text.select.title}</h2>
      <div className="select-cards">
        {OPTIONS.map((gender, i) => (
          <button key={gender} className={`select-card pixel-panel${selected === i ? " selected" : ""}`} onMouseEnter={() => setSelected(i)} onClick={() => { onTone(760, 0.1); onPick(gender); }}>
            <span className="select-art"><img src={(Assets as any).players[gender].front} alt="" draggable={false} /></span>
            <b>{selected === i && "▶ "}{Text.select[gender]}</b>
          </button>
        ))}
      </div>
      <p className="select-hint">{Text.select.hint}</p>
    </section>
  );
}
