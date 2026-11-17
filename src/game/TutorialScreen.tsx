import { useEffect, useState } from "react";
import type { ComponentType, MutableRefObject, ReactNode } from "react";
import Text from "../locales/ko.json";
import PlayerBack from "./PlayerBack";
import CalmRace, { raceProgress, raceSeconds } from "./CalmRace"; /* [추가 김홍경 11/17] 분노 조절 → 진정 레이스 */

/* 처음 GAME START를 눌렀을 때 나오는 체험형 연습. 실패해도 불이익 없이 다시 시도합니다.
   문구는 ko.json의 tutorial, 난이도는 GameScreen.tsx의 T.tutorial에서 고칩니다. */
export type TutorialKit = {
  Portrait: ComponentType<{ kind: string; face: any; small?: boolean }>;
  Meter: ComponentType<{ label: string; value: number; max: number; type: string }>;
  TypingPreview: ComponentType<{ target: string; value: string; composing: boolean }>;
  countErrors: (expected: string, actual: string) => number;
  renderHowText: (text: string) => ReactNode;
};
type TutorialProps = {
  T: any;
  frameRef: MutableRefObject<((dt: number) => void) | null>;
  kit: TutorialKit;
  onTone: (frequency: number, duration?: number) => void;
  onFinish: () => void;
};
type Phase = "info" | "ready" | "active" | "result";

const STEPS = ["welcome", "gauges", "typing", "penalty", "calm", "stare", "fever", "rules"] as const;
type Step = (typeof STEPS)[number];
const FEVER_START_Y = -14;
/* [수정 김홍경 11/17] 튜토리얼 피버도 본 게임처럼 어절 하나씩 떨어짐 (끝 마침표는 뺌) */
const FEVER_SENTENCES: string[] = Text.tutorial.feverSentences.flatMap((sentence: string) => sentence.split(/\s+/)).map((word: string) => word.replace(/[.,!?…~]+$/u, "")).filter(Boolean);
const feverLaneX = (index: number) => 20 + (index * 37) % 61;
/* [수정 김홍경 11/17] 진정 레이스도 시작 버튼부터 (calm: active → ready) */
const firstPhase = (step: Step): Phase => step === "typing" || step === "calm" || step === "stare" || step === "fever" ? "ready" : "info";
const CALM_TARGET: string = Text.tutorial.calmTarget;

function TutorialScreen({ T, frameRef, kit, onTone, onFinish }: TutorialProps) {
  const { Portrait, Meter, TypingPreview, countErrors, renderHowText } = kit;
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("info");
  const [face, setFace] = useState("NORMAL");
  const [stats, setStats] = useState({ anger: T.tutorial.startAnger as number, social: T.advanced.socialMax as number, mental: T.advanced.mentalMax as number });
  const [typedState, setTyped] = useState("");
  const typed = typedState;
  const [composing, setComposing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rival, setRival] = useState(0); /* [수정 김홍경 11/17] 진정 레이스 상대 진행도(0~100%) */
  const [stareGauge, setStareGauge] = useState(0);
  const [feverIndex, setFeverIndex] = useState(0);
  const [feverY, setFeverY] = useState(FEVER_START_Y);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const feverTarget = FEVER_SENTENCES[feverIndex] ?? "";

  const adjust = (delta: { anger?: number; social?: number; mental?: number }) => setStats((old) => ({
    anger: Math.max(0, Math.min(T.advanced.angerMax, old.anger + (delta.anger ?? 0))),
    social: Math.max(0, Math.min(T.advanced.socialMax, old.social + (delta.social ?? 0))),
    mental: Math.max(0, Math.min(T.advanced.mentalMax, old.mental + (delta.mental ?? 0))),
  }));
  const succeed = (nextFace: string, frequency: number) => { setFace(nextFace); setPhase("result"); setFeedback(""); setTyped(""); onTone(frequency, 0.14); };

  const goNext = () => {
    if (isLastStep) { onFinish(); return; }
    const next = STEPS[stepIndex + 1];
    setStepIndex(stepIndex + 1);
    setPhase(firstPhase(next));
    setFeedback("");
    setTyped("");
    setComposing(false);
    setFace(next === "penalty" ? "SMIRK" : next === "stare" ? "ANGRY" : "NORMAL");
    /* 실패하면 게이지가 어떻게 변하는지 보여 주려고 분노를 호흡 이벤트 기준까지 올림 */
    if (next === "penalty") { setStats((old) => ({ ...old, anger: T.game.angerThreshold, social: Math.max(0, old.social - T.advanced.socialTimeout) })); onTone(170, 0.11); }
    else onTone(440, 0.06);
  };
  const begin = () => { setPhase("active"); setFeedback(""); setTyped(""); setFeverY(FEVER_START_Y); setRival(0); onTone(620, 0.08); };

  const submit = (typedOverride?: string) => {
    if ((composing && typedOverride === undefined) || phase !== "active") return;
    const typed = typedOverride ?? typedState; /* [수정 김홍경 11/17] 피버는 Space 제출 시 값을 직접 넘김 */
    if (step === "typing") {
      if (countErrors(Text.tutorial.typingTarget, typed) <= T.tutorial.typos) {
        adjust({ mental: -T.advanced.mentalHit, anger: -T.advanced.angerSuccess, social: T.advanced.socialSuccess });
        succeed("SURPRISED", 740);
      } else { setFeedback(Text.tutorial.typingRetry); setTyped(""); onTone(170, 0.11); }
    } else if (step === "calm") {
      if (typed === CALM_TARGET) winRace();
      else setFeedback(Text.ui.calmTypo);
    } else if (step === "fever") {
      if (typed.trim() !== feverTarget) { setFeedback(Text.ui.typos); setTyped(""); onTone(180, 0.08); return; }
      onTone(610, 0.08);
      setTyped("");
      setFeedback("");
      if (feverIndex + 1 >= FEVER_SENTENCES.length) {
        adjust({ mental: -T.advanced.mentalFeverFull, anger: -T.advanced.angerFeverSuccess });
        succeed("DEFEATED", 760);
      } else { setFeverIndex(feverIndex + 1); setFeverY(FEVER_START_Y); }
    }
  };
  /* [수정 김홍경 11/17] 호흡 바늘(breathe) → 진정 레이스에서 먼저 도착 */
  const winRace = () => {
    if (step !== "calm" || phase !== "active") return;
    adjust({ anger: -T.advanced.angerCalmSuccess });
    succeed("SURPRISED", 760);
  };
  const tapStare = () => {
    if (step !== "stare" || phase !== "active") return;
    const gauge = stareGauge + 1;
    setStareGauge(gauge);
    if (gauge >= T.tutorial.stareGoal) { adjust({ mental: -T.advanced.mentalStareWin }); succeed("SURPRISED", 820); }
    else onTone(300 + gauge * 30, 0.04);
  };

  useEffect(() => {
    if (phase === "active" && step === "calm") frameRef.current = (dt) => setRival((old) => Math.min(100, old + 100 / raceSeconds(CALM_TARGET, T.tutorial.calmRaceCpm) * dt));
    else if (phase === "active" && step === "fever") frameRef.current = (dt) => setFeverY((old) => old + (T.advanced.feverLine - FEVER_START_Y) / T.tutorial.feverFallSeconds * dt);
    else frameRef.current = null;
    return () => { frameRef.current = null; };
  }, [phase, step, frameRef, T]);
  /* [추가 김홍경 11/17] 연습이라 상대가 먼저 도착해도 처음부터 다시 */
  useEffect(() => {
    if (phase !== "active" || step !== "calm" || rival < 100) return;
    setRival(0);
    setTyped("");
    setFeedback(Text.tutorial.calmRetry);
    onTone(160, 0.13);
  }, [phase, step, rival, onTone]);
  useEffect(() => {
    if (phase !== "active" || step !== "fever" || feverY < T.advanced.feverLine) return;
    setFeverY(FEVER_START_Y);
    setTyped("");
    setFeedback(Text.tutorial.feverRetry);
    onTone(150, 0.12);
  }, [phase, step, feverY, T, onTone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented) return;
      if (event.code === "Escape") { event.preventDefault(); onFinish(); return; }
      const isEnter = event.key === "Enter" || event.code === "NumpadEnter";
      if (isEnter && !event.repeat && (phase === "info" || phase === "result")) { event.preventDefault(); goNext(); return; }
      if (!event.repeat && phase === "ready" && (isEnter || (event.code === "Space" && step === "stare"))) { event.preventDefault(); begin(); return; }
      if (event.code !== "Space" || phase !== "active" || document.activeElement instanceof HTMLInputElement) return;
      event.preventDefault();
      if (event.repeat) return;
      if (step === "stare") tapStare();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const onTextKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); submit(); }
  };
  const answerForm = (target: string, className: string) => <form className={className} onSubmit={(event) => { event.preventDefault(); submit(); }}>
    <TypingPreview target={target} value={typed} composing={composing} />
    <input autoFocus aria-label={Text.ui.placeholder} value={typed} onChange={(event) => { const value = event.target.value; /* [수정 김홍경 11/17] 피버에서는 Space로도 제출 */ if (step === "fever" && /\s$/.test(value) && value.trim()) { submit(value.trim()); return; } setTyped(step === "fever" ? value.trimStart() : value); setFeedback(""); if (step === "calm" && value === CALM_TARGET) winRace(); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={onTextKey} placeholder={Text.ui.placeholder} />
    <button type="submit" className="submit-button" disabled={composing}>{Text.ui.submit}</button>
  </form>;

  const infoLine = step === "welcome" ? Text.tutorial.welcome : step === "gauges" ? Text.tutorial.gauges : step === "penalty" ? Text.tutorial.penalty.replace("{threshold}", String(T.game.angerThreshold)) : Text.tutorial.rules;
  const resultLine = step === "typing" ? Text.tutorial.typingWin : step === "calm" ? Text.ui.calmSuccess : step === "stare" ? Text.ui.stareSuccess : Text.ui.perfectReaction;
  const opponentSpeaks = phase === "result" && step === "typing";

  return (
    <section className={`play-scene tutorial-scene char-office mood-${face.toLowerCase()} ${step === "fever" && phase !== "result" ? "play-fever" : ""}`}>
      <div className="scene-background" />
      <div className="tutorial-bar">
        <span>{Text.tutorial.progress.replace("{current}", String(stepIndex + 1)).replace("{total}", String(STEPS.length))}</span>
        <span>{Text.tutorial.scene}</span>
        <button className="text-button" onClick={onFinish}>{Text.tutorial.skip}</button>
      </div>
      <div className={`hud-bars ${step === "gauges" ? "tutorial-spotlight" : ""}`}>
        <div className="battle-plate plate-player"><span className="plate-name">{Text.battle.player}</span>
          <Meter label={Text.ui.anger} value={stats.anger} max={T.advanced.angerMax} type="anger" />
          <Meter label={Text.ui.social} value={stats.social} max={T.advanced.socialMax} type="social" /></div>
        <div className="battle-plate plate-opponent"><span className="plate-name">{Text.tutorial.opponent}</span>
          <Meter label={Text.ui.mental} value={stats.mental} max={T.advanced.mentalMax} type="mental" /></div>
      </div>
      <PlayerBack kind="office" />
      <div className="stage-character">
        <Portrait kind="office" face={face} small={step === "fever" && phase !== "result"} />
      </div>

      {(phase === "info" || phase === "result") && <div className="dialog-panel reaction-panel pixel-panel">
        <div className="dialog-name"><span>{opponentSpeaks ? Text.tutorial.opponent : Text.tutorial.coachName}</span><i>{Text.tutorial.practice}</i></div>
        <p key={`${step}-${phase}`} className="reaction-text tutorial-rich">{renderHowText(phase === "info" ? infoLine : resultLine)}</p>
        <div className="reaction-controls"><span /><button className="action-button" onClick={goNext}>{isLastStep ? Text.tutorial.finish : Text.tutorial.next} <b>↵</b></button></div>
      </div>}

      {step === "typing" && phase !== "result" && <>
        <p className="battle-taunt"><span>“{Text.tutorial.typingTaunt}”</span></p>
        <aside className="tutorial-coach pixel-panel"><b>{Text.tutorial.coachName}</b><p className="tutorial-rich">{renderHowText(phase === "ready" ? Text.tutorial.typingReady : Text.tutorial.typingActive)}</p></aside>
        <div className="dialog-panel pixel-panel">
          <div className="dialog-name"><span>{Text.tutorial.opponent}</span><i>{Text.tutorial.practice}</i></div>
          <div className="prompt-row"><span className="prompt-label">{Text.ui.target}</span><span className="prompt-sentence">{Text.tutorial.typingTarget}</span></div>
          {phase === "ready" ? <div className="ready-row"><button className="action-button ready-button" onClick={begin}>{Text.ui.readyStart} <b>↵</b></button></div> : <div className="input-row">{answerForm(Text.tutorial.typingTarget, "typing-form")}</div>}
          <div className="typing-footer"><span>{feedback || Text.tutorial.typingHint}</span></div>
        </div>
      </>}

      {/* [수정 김홍경 11/17] 분노 조절 연습: 호흡 바늘 → 진정 레이스 */}
      {step === "calm" && phase !== "result" && <div className="minigame-shade calm-overlay"><div className="minigame-card race-card pixel-panel">
        <p className="event-kicker">{Text.ui.angerEventKicker}</p><h2>{Text.ui.calmTitle}</h2><p>{phase === "ready" ? Text.ui.calmReadyHint : Text.ui.calmHelp}<br />{Text.tutorial.calmNote}</p>
        <CalmRace me={Text.battle.player} rival={Text.tutorial.opponent} goal={Text.ui.raceGoal} myProgress={phase === "ready" ? 0 : raceProgress(CALM_TARGET, typed)} rivalProgress={rival} />
        <div className="race-sentence"><span>{Text.ui.target}</span>{CALM_TARGET}</div>
        {phase === "ready" ? <button className="action-button ready-button" onClick={begin}>{Text.ui.readyStart} <b>↵</b></button> : answerForm(CALM_TARGET, "fever-form race-form")}
        <p className="inline-feedback">{feedback}</p>
      </div></div>}

      {step === "stare" && phase !== "result" && <div className="minigame-shade stare-overlay"><div className="stare-backdrop">{Text.ui.stareBackdrop}</div><div className="stare-portrait"><Portrait kind="office" face="ANGRY" /></div><PlayerBack kind="office" /><div className="minigame-card stare-card pixel-panel">
        <p className="event-kicker">{Text.ui.stareEventKicker}</p><h2>{Text.ui.stareTitle}</h2><p className="tutorial-rich">{renderHowText(Text.tutorial.stareHelp.replace("{goal}", String(T.tutorial.stareGoal)))}</p>
        <div className="stare-meter"><i style={{ width: `${Math.min(100, stareGauge / T.tutorial.stareGoal * 100)}%` }} /></div>
        <div className="stare-meta"><span>{Text.ui.stareMeter}</span><b>{stareGauge} / {T.tutorial.stareGoal}</b></div>
        {phase === "ready" ? <button className="action-button ready-button" onClick={begin}>{Text.ui.readyStart} <b>↵</b></button> : <button className="action-button" onClick={tapStare}>{Text.ui.stareAction}</button>}
      </div></div>}

      {step === "fever" && phase !== "result" && <div className="fever-overlay">
        <div className="fever-top"><span>✦ {Text.ui.fever}</span><i>{Text.tutorial.feverCount.replace("{count}", String(feverIndex)).replace("{total}", String(FEVER_SENTENCES.length))}</i></div>
        <p className="fever-subtitle">「{Text.ui.feverSub}」</p>
        <div className="fever-lane">{phase === "active" && <div key={feverIndex} className="falling-sentence falling-word" style={{ top: `${feverY}%`, left: `${feverLaneX(feverIndex)}%` }}>{feverTarget}</div>}
          <div className="dead-line" style={{ top: `${T.advanced.feverLine}%` }}><span>{Text.ui.deadLine}</span></div></div>
        <div className="fever-bottom"><p>{phase === "ready" ? Text.tutorial.feverReady : Text.tutorial.feverActive}</p>{phase === "ready" ? <button className="action-button ready-button" onClick={begin}>{Text.ui.readyStart} <b>↵</b></button> : answerForm(feverTarget, "fever-form")}<span className="fever-feedback">{feedback}</span></div>
      </div>}
      <div className="crt-vignette" />
    </section>
  );
}

export default TutorialScreen;
