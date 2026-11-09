import { useEffect, useRef, useState } from "react";
import Text from "../locales/ko.json";
import titleLogo from "../assets/images/title-logo-pixel.webp";
import { MapBackdrop } from "./MapScreen";
import "./title-screen.css";

/* 타이틀 화면: 배경은 플레이어가 지금 있는 맵(진행 상황 그대로), 가운데 픽셀 로고 + 메뉴 */
type TitleProps = {
  mapId: string;
  collectionCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onStart: () => void;
  onHowTo: () => void;
  onCollection: () => void;
  onTone: (frequency: number, duration?: number) => void;
};

/* 메뉴 커서: 웃는 얼굴에 화난 표시 (10×10 도트) */
function CursorIcon() {
  const face = [
    "..yyyyyy..",
    ".yyyyyyyyr",
    "yyyyyyyrrr",
    "yykyyyykyr",
    "yykyyyykyy",
    "yyyyyyyyyy",
    "yykyyyykyy",
    "yyykkkkyyy",
    ".yyyyyyyy.",
    "..yyyyyy..",
  ];
  const colors: Record<string, string> = { y: "#ffd84a", k: "#2a2230", r: "#ff4d4d" };
  return (
    <svg className="px-cursor" viewBox="-1 -1 12 12" shapeRendering="crispEdges" aria-hidden>
      {face.flatMap((row, y) => Array.from(row).map((ch, x) => ch === "." ? null : <rect key={`o${x}-${y}`} x={x - 0.5} y={y - 0.5} width={2} height={2} fill="#2a2230" />))}
      {face.flatMap((row, y) => Array.from(row).map((ch, x) => ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={colors[ch]} />))}
    </svg>
  );
}

export default function TitleScreen({ mapId, collectionCount, soundOn, onToggleSound, onStart, onHowTo, onCollection, onTone }: TitleProps) {
  const items = [
    { label: Text.ui.start, action: onStart },
    { label: Text.ui.howTo, action: onHowTo },
    { label: Text.ui.collection, action: onCollection, extra: `${collectionCount}/3` },
  ];
  const [selected, setSelected] = useState(0);
  const latest = useRef({ items, selected });
  latest.current = { items, selected };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.isComposing) return;
      const move = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (move) { event.preventDefault(); setSelected((i) => (i + move + 3) % 3); onTone(520, 0.04); }
      else if (event.key === "Enter" || event.code === "Space") {
        event.preventDefault();
        onTone(760, 0.08);
        latest.current.items[latest.current.selected].action();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onTone]);

  return (
    <section className="title-screen px-title">
      <MapBackdrop mapId={mapId} />
      <div className="px-dim" />
      <h1 className="px-logo"><img src={titleLogo} alt={Text.title} draggable={false} /></h1>
      <nav className="px-menu" data-ui>
        {items.map((item, i) => (
          <button key={item.label} className={`px-menu-item${i === selected ? " selected" : ""}`} onMouseEnter={() => setSelected(i)} onClick={() => { onTone(760, 0.08); item.action(); }}>
            <span className="px-cursor-slot">{i === selected && <CursorIcon />}</span>
            <span className="px-label">{item.label}</span>
            {item.extra && <small>{item.extra}</small>}
          </button>
        ))}
      </nav>
      <button className="px-sound" data-ui onClick={onToggleSound}>{soundOn ? "♪ ON" : "♪ OFF"}</button>
      <div className="px-footer">
        <span>© 2026 {Text.ui.titleFooterLeft}</span>
        <span className="px-hint">{Text.ui.titleHint}</span>
        <span>{Text.ui.version}</span>
      </div>
    </section>
  );
}
