import { useEffect, useState } from "react";
import type { ComponentType, MutableRefObject } from "react";
import Text from "../locales/ko.json";

/* 게임을 켜면 타이틀 전에 한 번 나오는 오프닝. 대사는 ko.json의 intro.beats에서 고칩니다. */
type IntroProps = {
  T: any;
  frameRef: MutableRefObject<((dt: number) => void) | null>;
  Portrait: ComponentType<{ kind: string; face: any; small?: boolean }>;
  onTone: (frequency: number, duration?: number) => void;
  onDone: () => void;
};

const BEATS = Text.intro.beats as { kind: string; text: string; character?: string; face?: string }[];

function IntroScreen({ T, frameRef, Portrait, onTone, onDone }: IntroProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const beat = BEATS[index];
  const chars = Array.from(beat.text);
  const typingSeconds = chars.length / T.tutorial.introCharsPerSecond;
  const holdSeconds = beat.kind === "finale" ? T.tutorial.introFinaleSeconds : T.tutorial.introHoldSeconds;
  const shownCount = Math.min(chars.length, Math.floor(elapsed * T.tutorial.introCharsPerSecond));

  const nextBeat = () => {
    if (index + 1 >= BEATS.length) { onDone(); return; }
    setIndex(index + 1);
    setElapsed(0);
  };
  /* 글자가 나오는 중이면 문장을 끝까지 보여 주고, 다 나왔으면 다음 장면으로 */
  const advance = () => {
    onTone(440, 0.05);
    if (shownCount < chars.length) setElapsed(typingSeconds);
    else nextBeat();
  };

  useEffect(() => {
    frameRef.current = (dt) => setElapsed((old) => old + dt);
    return () => { frameRef.current = null; };
  }, [frameRef]);
  useEffect(() => {
    if (elapsed >= typingSeconds + holdSeconds) nextBeat();
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape") { event.preventDefault(); onDone(); return; }
      if (event.key === "Enter" || event.code === "NumpadEnter" || event.code === "Space") { event.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <section className={`intro-screen intro-${beat.kind}`} onClick={advance}>
      <div className="night-room"><div className="night-window"><i /><i /><i /></div><div className="night-bed"><div className="pillow" /><div className="blanket-shape" /></div></div>
      <div className="intro-shade" />
      {beat.character && <div className="intro-portrait" key={index}><Portrait kind={beat.character} face={beat.face} /><b>{(Text.scenarios as any)[beat.character].opponent}</b></div>}
      <p className="intro-line" aria-label={beat.text}><span>{chars.slice(0, shownCount).join("")}</span><span className="intro-ghost">{chars.slice(shownCount).join("")}</span></p>
      <button className="text-button intro-skip" onClick={(event) => { event.stopPropagation(); onDone(); }}>{Text.intro.skip}</button>
      <span className="intro-hint">{Text.intro.hint}</span>
    </section>
  );
}

export default IntroScreen;
