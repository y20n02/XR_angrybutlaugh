import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Text from "../locales/ko.json";
import Assets from "../assets.json";
import "./game.css";
/* [추가 인트로·튜토리얼] 화면 본체는 아래 두 파일에 있고, 이 파일에는 연결 코드만 있음 */
import "./intro-tutorial.css";
import "./battle-layout.css";
import PlayerBack from "./PlayerBack";
import IntroScreen from "./IntroScreen";
import TutorialScreen from "./TutorialScreen";
import BriefingScreen from "./BriefingScreen";
import TitleScreen from "./TitleScreen";
import MapScreen, { MapCloseup } from "./MapScreen";
import "./play-theme.css";
import { opponentName, setPlayerGender } from "./maps";
import type { Gender } from "./maps";
import PlayerSelect from "./PlayerSelect";

/* TUNABLES CONTRACT — read before editing this file.
   1. Gameplay and UI constants live in DebugPanel.define below; read T.* where used.
   2. Tuning requests edit schema defaults only.
   3. The platform injects DebugPanel; never add a local copy or script tag.
   4. Add tunables for every new gameplay feature and control. */
/* [수정 김홍경 11/03] 로컬 실행(npm run dev)용 대체 DebugPanel
   DebugPanel은 Verse8 플랫폼이 넣어 주는 기능이라, Verse8 밖(내 컴퓨터)에서는 없어서 게임이 로딩 화면에서 멈췄음.
   Verse8에서는 플랫폼 것을 그대로 쓰고, 없을 때만 아래 기본값(value)으로 동작하게 함. */
const LocalDebugPanel = {
  define(schema: Record<string, Record<string, any>>) {
    const out: Record<string, Record<string, any>> = {};
    for (const group of Object.keys(schema)) {
      out[group] = {};
      for (const key of Object.keys(schema[group])) {
        if (key === "_label") continue;
        const item = schema[group][key];
        out[group][key] = item.value;
        if (item.cssVar) document.documentElement.style.setProperty(item.cssVar, `${item.value}${item.unit ?? ""}`);
      }
    }
    return out as any;
  },
  stat() {},
  frame(raw: number) { return raw; },
};
const DebugPanel = (window as any).DebugPanel ?? LocalDebugPanel;
const T = DebugPanel.define({
  game: {
    _label: "게임 진행",
    easyTime: { value: 25, min: 10, max: 40, step: 1, label: "입문 문장 제한 시간 (초)" },
    normalTime: { value: 20, min: 10, max: 35, step: 1, label: "숙련 문장 제한 시간 (초)" },
    expertTime: { value: 18, min: 10, max: 30, step: 1, label: "전문가 문장 제한 시간 (초)" },
    angerThreshold: { value: 70, min: 40, max: 90, step: 1, label: "분노 조절 이벤트 시작 수치" },
  },
  minigame: {
    _label: "미니게임",
    calmSpeed: { value: 68, min: 25, max: 130, step: 1, label: "호흡 바늘 속도 (높을수록 어려움)" },
    calmWindow: { value: 18, min: 8, max: 35, step: 1, label: "호흡 성공 구간 폭" },
    /* [수정 김홍경 11/03] 기싸움 난이도별 목표 연타 수·제한 시간 (하 → 중 → 상으로 갈수록 어려움) */
    stareGoal: { value: 20, min: 8, max: 40, step: 1, label: "기싸움 성공 연타 수 (하)" },
    stareGoalNormal: { value: 24, min: 8, max: 45, step: 1, label: "기싸움 성공 연타 수 (중)" },
    stareGoalHard: { value: 26, min: 8, max: 50, step: 1, label: "기싸움 성공 연타 수 (상)" },
    stareSeconds: { value: 5, min: 3, max: 10, step: 0.5, label: "기싸움 제한 시간 (초, 하)" },
    stareSecondsNormal: { value: 4.5, min: 2, max: 10, step: 0.5, label: "기싸움 제한 시간 (초, 중)" },
    stareSecondsHard: { value: 4, min: 2, max: 10, step: 0.5, label: "기싸움 제한 시간 (초, 상)" },
    feverSpeed: { value: 12, min: 5, max: 28, step: 1, label: "피버 문장 낙하 속도 (높을수록 어려움)" },
    /* [수정 김홍경 11/03] 피버(산성비) 문장 하나가 떨어지는 시간을 3초 늘림 */
    feverExtraSeconds: { value: 3, min: 0, max: 10, step: 0.5, label: "피버 문장 1개 낙하 시간 추가 (초)" },
    calmCenter: { value: 55, min: 35, max: 75, step: 1, label: "호흡 성공 구간 위치" },
  },
  ui: {
    _label: "조작부 위치와 크기",
    controlX: { value: 0, min: -100, max: 100, step: 1, cssVar: "--control-x", unit: "px", label: "버튼 가로 위치" },
    controlY: { value: 0, min: -80, max: 80, step: 1, cssVar: "--control-y", unit: "px", label: "버튼 세로 위치" },
    controlW: { value: 188, min: 120, max: 320, step: 1, cssVar: "--control-w", unit: "px", label: "버튼 너비" },
    controlH: { value: 50, min: 38, max: 76, step: 1, cssVar: "--control-h", unit: "px", label: "버튼 높이" },
    inputX: { value: 0, min: -100, max: 100, step: 1, cssVar: "--input-x", unit: "px", label: "입력창 가로 위치" },
    inputY: { value: 0, min: -80, max: 80, step: 1, cssVar: "--input-y", unit: "px", label: "입력창 세로 위치" },
    /* [수정 김홍경 11/03] 입력창 크기 키움: 너비 620→760, 높이 62→74 */
    inputW: { value: 760, min: 320, max: 1000, step: 1, cssVar: "--input-w", unit: "px", label: "입력창 너비" },
    inputH: { value: 74, min: 44, max: 100, step: 1, cssVar: "--input-h", unit: "px", label: "입력창 높이" },
  },
  /* [추가 인트로·튜토리얼] 오프닝 속도와 연습 난이도 */
  tutorial: {
    _label: "인트로·튜토리얼",
    introCharsPerSecond: { value: 24, min: 8, max: 60, step: 1, label: "인트로 글자 출력 속도 (초당)" },
    introHoldSeconds: { value: 1.4, min: 0.4, max: 5, step: 0.1, label: "인트로 문장 유지 시간 (초)" },
    introFinaleSeconds: { value: 2.2, min: 0.5, max: 6, step: 0.1, label: "인트로 마지막 문장 유지 시간 (초)" },
    typos: { value: 3, min: 0, max: 8, step: 1, label: "튜토리얼 허용 오타 수" },
    startAnger: { value: 30, min: 0, max: 60, step: 1, label: "튜토리얼 시작 분노" },
    calmSpeed: { value: 42, min: 15, max: 130, step: 1, label: "튜토리얼 호흡 바늘 속도" },
    calmWindow: { value: 28, min: 8, max: 50, step: 1, label: "튜토리얼 호흡 성공 구간 폭" },
    stareGoal: { value: 8, min: 3, max: 30, step: 1, label: "튜토리얼 기싸움 연타 수" },
    feverFallSeconds: { value: 15, min: 5, max: 30, step: 0.5, label: "튜토리얼 피버 문장 낙하 시간 (초)" },
  },
  audio: {
    _label: "효과음",
    volume: { value: 0.22, min: 0, max: 0.6, step: 0.01, label: "효과음 음량" },
  },
  advanced: {
    _label: "세부 밸런스",
    angerMax: { value: 100, min: 70, max: 150, step: 1, label: "분노 최대치" },
    socialMax: { value: 100, min: 50, max: 150, step: 1, label: "사회생활력 최대치" },
    mentalMax: { value: 100, min: 50, max: 150, step: 1, label: "상대 멘탈 최대치" },
    feverLine: { value: 78, min: 60, max: 90, step: 1, label: "피버타임 낙하 실패선 (%)" },
    blanketSeconds: { value: 45, min: 20, max: 90, step: 1, label: "이불킥 문장 제한 시간 (초)" },
    minimumSendMs: { value: 550, min: 0, max: 1500, step: 50, label: "답변 전 최소 생각 시간 (ms)" },
    easyTypos: { value: 3, min: 0, max: 8, step: 1, label: "입문 허용 오타 수" },
    normalTypos: { value: 2, min: 0, max: 6, step: 1, label: "숙련 허용 오타 수" },
    expertTypos: { value: 1, min: 0, max: 4, step: 1, label: "전문가 허용 오타 수" },
    curseLimit: { value: 3, min: 1, max: 6, step: 1, label: "게임 오버 욕설 누적 횟수" },
    easyRounds: { value: 3, min: 2, max: 6, step: 1, label: "입문 대화 라운드 수" },
    normalRounds: { value: 4, min: 2, max: 8, step: 1, label: "숙련 대화 라운드 수" },
    expertRounds: { value: 5, min: 2, max: 10, step: 1, label: "전문가 대화 라운드 수" },
    feverEasyScale: { value: 0.78, min: 0.5, max: 1.4, step: 0.01, label: "입문 피버 속도 보정" },
    feverHardScale: { value: 1.2, min: 0.8, max: 2, step: 0.01, label: "전문가 피버 속도 보정" },
    calmFeedbackMs: { value: 800, min: 300, max: 1800, step: 50, label: "호흡 실패 안내 시간 (ms)" },
    angerTimeout: { value: 25, min: 5, max: 50, step: 1, label: "시간 초과 분노 증가" },
    socialTimeout: { value: 15, min: 0, max: 40, step: 1, label: "시간 초과 사회생활력 감소" },
    angerTypo: { value: 15, min: 0, max: 40, step: 1, label: "오타 초과 분노 증가" },
    angerCurse: { value: 30, min: 5, max: 60, step: 1, label: "욕설 분노 증가" },
    socialCurse: { value: 30, min: 5, max: 60, step: 1, label: "욕설 사회생활력 감소" },
    angerSuccess: { value: 10, min: 0, max: 30, step: 1, label: "성공 시 분노 감소" },
    socialSuccess: { value: 2, min: 0, max: 15, step: 1, label: "성공 시 사회생활력 회복" },
    mentalHit: { value: 20, min: 5, max: 40, step: 1, label: "반박 성공 시 상대 멘탈 감소" },
    angerCalmSuccess: { value: 25, min: 5, max: 50, step: 1, label: "호흡 성공 시 분노 감소" },
    angerCalmMiss: { value: 15, min: 0, max: 40, step: 1, label: "호흡 실패 시 분노 증가" },
    angerStareMiss: { value: 15, min: 0, max: 40, step: 1, label: "기싸움 실패 시 분노 증가" },
    mentalStareWin: { value: 20, min: 5, max: 40, step: 1, label: "기싸움 성공 상대 멘탈 감소" },
    angerFeverSuccess: { value: 20, min: 5, max: 40, step: 1, label: "피버 완벽 성공 분노 감소" },
    mentalFeverFull: { value: 40, min: 10, max: 60, step: 1, label: "피버 완벽 성공 상대 멘탈 감소" },
    socialFeverFull: { value: 10, min: 0, max: 25, step: 1, label: "피버 완벽 성공 사회생활력 회복" },
    angerFeverPartial: { value: 5, min: 0, max: 20, step: 1, label: "피버 2문장 성공 분노 감소" },
    mentalFeverPartial: { value: 20, min: 5, max: 40, step: 1, label: "피버 2문장 성공 상대 멘탈 감소" },
    mentalFeverOne: { value: 10, min: 0, max: 25, step: 1, label: "피버 1문장 성공 상대 멘탈 감소" },
    angerFeverFail: { value: 25, min: 5, max: 50, step: 1, label: "피버 전부 실패 분노 증가" },
    selectionX: { value: 0, min: -100, max: 100, step: 1, cssVar: "--selection-x", unit: "px", label: "상황·난이도 버튼 가로 위치" },
    selectionY: { value: 0, min: -80, max: 80, step: 1, cssVar: "--selection-y", unit: "px", label: "상황·난이도 버튼 세로 위치" },
    selectionW: { value: 100, min: 60, max: 100, step: 1, cssVar: "--selection-w", unit: "%", label: "상황·난이도 버튼 너비" },
    /* [수정 김홍경 11/03] 상황·난이도 버튼 높이 75→92 (글자 키운 만큼) */
    selectionH: { value: 92, min: 50, max: 110, step: 1, cssVar: "--selection-h", unit: "px", label: "상황·난이도 버튼 높이" },
    soundX: { value: 0, min: -50, max: 50, step: 1, cssVar: "--sound-x", unit: "px", label: "효과음 버튼 가로 위치" },
    soundY: { value: 0, min: -25, max: 25, step: 1, cssVar: "--sound-y", unit: "px", label: "효과음 버튼 세로 위치" },
    soundW: { value: 95, min: 60, max: 150, step: 1, cssVar: "--sound-w", unit: "px", label: "효과음 버튼 너비" },
    soundH: { value: 28, min: 18, max: 42, step: 1, cssVar: "--sound-h", unit: "px", label: "효과음 버튼 높이" },
    rankSAccuracy: { value: 0.97, min: 0.8, max: 1, step: 0.01, label: "최고 등급 정확도 기준" },
    rankSSocial: { value: 80, min: 50, max: 100, step: 1, label: "최고 등급 사회생활력 기준" },
    rankAAccuracy: { value: 0.85, min: 0.6, max: 0.98, step: 0.01, label: "우수 등급 정확도 기준" },
    rankASocial: { value: 55, min: 30, max: 90, step: 1, label: "우수 등급 사회생활력 기준" },
    rankBAccuracy: { value: 0.65, min: 0.4, max: 0.9, step: 0.01, label: "성장 등급 정확도 기준" },
  },
});

/* [수정 김홍경 11/03] 난이도(0=하, 1=중, 2=상)별 기싸움 목표 연타 수·제한 시간 */
const stareGoalFor = (level: number) => level === 0 ? T.minigame.stareGoal : level === 1 ? T.minigame.stareGoalNormal : T.minigame.stareGoalHard;
const stareSecondsFor = (level: number) => level === 0 ? T.minigame.stareSeconds : level === 1 ? T.minigame.stareSecondsNormal : T.minigame.stareSecondsHard;
const INTERNAL = { storageKey: "time-to-get-mad-save-v1", secondsPerMinute: 60, millisecondsPerSecond: 1000, typingUnit: 5, frameClampSeconds: 0.05, renderThrottleMs: 80, percentMax: 100, feverStartY: -14 };
const TUTORIAL_STORAGE_KEY = "time-to-get-mad-tutorial-v1";
const LAST_MAP_KEY = "time-to-get-mad-last-map-v1";
const PLAYER_KEY = "time-to-get-mad-player-v1";
const SCENARIO_IDS = ["office", "team", "shop"] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];
type Screen = "intro" | "tutorial" | "briefing" | "title" | "select" | "map" | "howto" | "scenarios" | "difficulty" | "play" | "ending" | "collection";
type Mode = "typing" | "reaction" | "calm" | "stare" | "fever";
type Ending = "win" | "over" | "night" | "blanket" | "done";
type Face = "NORMAL" | "SMILE" | "SMIRK" | "ANNOYED" | "SURPRISED" | "ANGRY" | "DEFEATED";
type Certificate = { date: string; rank: string };
type SaveData = { unlocked: Record<ScenarioId, number>; certificates: Partial<Record<ScenarioId, Certificate>> };
type Session = {
  scenario: ScenarioId;
  level: number;
  mode: Mode;
  roundIndex: number;
  completed: number;
  input: string;
  remaining: number;
  anger: number;
  social: number;
  mental: number;
  curses: number;
  feedback: string;
  face: Face;
  reactionKind: "round" | "event";
  calmConsumed: boolean;
  stareDone: boolean;
  feverDone: boolean;
  calmPosition: number;
  calmDirection: number;
  stareRemaining: number;
  stareGauge: number;
  feverIndex: number;
  feverY: number;
  feverHits: number;
  combo: number;
  feverWon: boolean;
  stareWon: boolean;
  misses: string[];
  typedChars: number;
  matchingChars: number;
  targetChars: number;
  typingMilliseconds: number;
  inputStarted: number;
  /* [수정 김홍경 11/03] 시작 버튼을 누르기 전 대기 상태 (반박하기·기싸움·피버). true면 시간이 흐르지 않음 */
  waiting?: boolean;
  blanketIndex: number;
};

const STARTING_SAVE: SaveData = { unlocked: { office: 0, team: 0, shop: 0 }, certificates: {} };
const PROFANITY = ["씨발", "시발", "병신", "개새끼", "좆", "꺼져"];

function loadSave(): SaveData {
  try {
    const stored = localStorage.getItem(INTERNAL.storageKey);
    if (!stored) return STARTING_SAVE;
    const parsed = JSON.parse(stored) as Partial<SaveData>;
    return {
      unlocked: { ...STARTING_SAVE.unlocked, ...parsed.unlocked },
      certificates: parsed.certificates ?? {},
    };
  } catch {
    return STARTING_SAVE;
  }
}

function loadTutorialDone() {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function getSentence(scenario: ScenarioId, level: number, round: number) {
  return (Text.scenarios as any)[scenario].levels[level].rounds[round];
}

function countErrors(expected: string, actual: string) {
  const a = Array.from(expected);
  const b = Array.from(actual);
  return Math.max(a.length, b.length) - a.reduce((count, char, index) => count + (char === b[index] ? 1 : 0), 0);
}

function allowedErrors(level: number) {
  return [T.advanced.easyTypos, T.advanced.normalTypos, T.advanced.expertTypos][level];
}

function limitFor(level: number) {
  return [T.game.easyTime, T.game.normalTime, T.game.expertTime][level];
}

function levelRoundCount(level: number) {
  return [T.advanced.easyRounds, T.advanced.normalRounds, T.advanced.expertRounds][level];
}

function titleCaseRank(session: Session) {
  const accuracy = session.targetChars ? session.matchingChars / session.targetChars : 0;
  if (accuracy > T.advanced.rankSAccuracy && session.social >= T.advanced.rankSSocial) return Text.ui.rankS;
  if (accuracy > T.advanced.rankAAccuracy && session.social >= T.advanced.rankASocial) return Text.ui.rankA;
  if (accuracy > T.advanced.rankBAccuracy) return Text.ui.rankB;
  return Text.ui.rankC;
}

function getDeadline(session: Session) {
  return session.mode === "fever" ? (Text.scenarios as any)[session.scenario].levels[session.level].fever[session.feverIndex] : "";
}

function Portrait({ kind, face, small = false, level = 0 }: { kind: string; face: Face; small?: boolean; level?: number }) {
  /* 레벨별 그림(office-1 등)이 assets.json에 있으면 그걸, 없으면 상황 기본 그림(office)을 씀 */
  const artUrl = (Assets as any).characters[`${kind}-${level}`]?.url ?? (Assets as any).characters[kind]?.url;
  const [imageFailed, setImageFailed] = useState(false);
  const showArt = Boolean(artUrl) && !imageFailed;
  return (
    <div className={`portrait ${kind} lv-${level} ${showArt ? "has-art" : ""} ${small ? "portrait-small" : ""} face-${face.toLowerCase()}`} aria-label={`${Text.ui.opponent} ${Text.ui.moodNames[face]}`}>
      <div className="portrait-shadow" />
      {showArt ? <img className="portrait-art" src={artUrl} alt="" onError={() => setImageFailed(true)} /> : <>
        <div className="character-body"><i className="neck" /><i className="shirt" /><i className="lapel left" /><i className="lapel right" /></div>
        <div className="character-head">
          <i className="ear left" /><i className="ear right" /><i className="hair-back" /><i className="face-shape" />
          <i className="hair-fringe" /><i className="brow left" /><i className="brow right" />
          <i className="eye left" /><i className="eye right" /><i className="nose" /><i className="mouth" />
        </div>
      </>}
      <span className="portrait-glint">✦</span>
    </div>
  );
}

function GameScreen() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [tutorialDone, setTutorialDone] = useState(loadTutorialDone);
  const [tutorialReturn, setTutorialReturn] = useState<Screen>("map");
  const [briefingLevel, setBriefingLevel] = useState(0);
  const introFrameRef = useRef<((dt: number) => void) | null>(null);
  const [ending, setEnding] = useState<Ending>("over");
  /* 마지막으로 있던 맵을 기억 → 다시 켜도 타이틀 배경과 시작 맵이 그 맵 */
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>(() => {
    try { const stored = localStorage.getItem(LAST_MAP_KEY); return SCENARIO_IDS.includes(stored as ScenarioId) ? stored as ScenarioId : "office"; } catch { return "office"; }
  });
  useEffect(() => { try { localStorage.setItem(LAST_MAP_KEY, selectedScenario); } catch { /* 저장 실패해도 진행에는 영향 없음 */ } }, [selectedScenario]);
  /* 고른 주인공(f/m) — 처음 GAME START 때 고름. 맵 도트 색·대결 뒷모습에 반영 */
  const [playerGender, setPlayerGenderState] = useState<Gender | null>(() => { try { const g = localStorage.getItem(PLAYER_KEY); return g === "f" || g === "m" ? g : null; } catch { return null; } });
  if (playerGender) setPlayerGender(playerGender);
  const pickPlayer = (gender: Gender) => { setPlayerGender(gender); setPlayerGenderState(gender); try { localStorage.setItem(PLAYER_KEY, gender); } catch { /* 저장 실패해도 진행 가능 */ } if (tutorialDone) setScreen("map"); else openTutorial("map"); };
  const [save, setSave] = useState<SaveData>(loadSave);
  const [session, setSession] = useState<Session | null>(null);
  const [typedTarget, setTypedTarget] = useState("");
  const [composing, setComposing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [calmMessage, setCalmMessage] = useState("");
  const [blanketInput, setBlanketInput] = useState("");
  const [blanketFeedback, setBlanketFeedback] = useState("");
  const [blanketRemaining, setBlanketRemaining] = useState(T.advanced.blanketSeconds);
  const sessionRef = useRef<Session | null>(null);
  const screenRef = useRef<Screen>(screen);
  const endingRef = useRef<Ending>(ending);
  const audioRef = useRef<AudioContext | null>(null);
  const playToneRef = useRef<(frequency: number, duration?: number) => void>(() => {});
  sessionRef.current = session;
  screenRef.current = screen;
  endingRef.current = ending;

  useEffect(() => { document.title = Text.title; }, []);
  useEffect(() => { localStorage.setItem(INTERNAL.storageKey, JSON.stringify(save)); }, [save]);
  useEffect(() => { DebugPanel.stat("Current scene", () => screenRef.current); }, []);
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let lastPaint = 0;
    let accumulatedDt = 0;
    const tick = (now: number) => {
      const raw = Math.min((now - previous) / INTERNAL.millisecondsPerSecond, INTERNAL.frameClampSeconds);
      previous = now;
      const dt = DebugPanel.frame(raw);
      if (dt) introFrameRef.current?.(dt);
      const current = sessionRef.current;
      if (dt && current && screenRef.current === "play") {
        if (current.mode === "typing" && !current.waiting) {
          accumulatedDt += dt;
          if (now - lastPaint > INTERNAL.renderThrottleMs) {
            lastPaint = now;
            const step = accumulatedDt;
            accumulatedDt = 0;
            setSession((old) => old?.mode === "typing" ? { ...old, remaining: Math.max(0, old.remaining - step) } : old);
          }
        } else if (current.mode === "calm") {
          accumulatedDt = 0;
          setSession((old) => {
            if (!old || old.mode !== "calm") return old;
            let position = old.calmPosition + old.calmDirection * T.minigame.calmSpeed * dt;
            let direction = old.calmDirection;
            if (position > INTERNAL.percentMax) { position = INTERNAL.percentMax - (position - INTERNAL.percentMax); direction = -1; }
            if (position < 0) { position = -position; direction = 1; }
            return { ...old, calmPosition: position, calmDirection: direction };
          });
        } else if (current.mode === "stare" && !current.waiting) {
          accumulatedDt += dt;
          if (now - lastPaint > INTERNAL.renderThrottleMs) {
            lastPaint = now;
            const step = accumulatedDt;
            accumulatedDt = 0;
            setSession((old) => old?.mode === "stare" ? { ...old, stareRemaining: Math.max(0, old.stareRemaining - step) } : old);
          }
        } else if (current.mode === "fever" && !current.waiting) {
          accumulatedDt = 0;
          const multiplier = current.level === 0 ? T.advanced.feverEasyScale : current.level === 1 ? 1 : T.advanced.feverHardScale;
          /* [수정 김홍경 11/03] 원래 낙하 시간 + feverExtraSeconds(3초)가 되도록 속도를 다시 계산 */
          const distance = T.advanced.feverLine - INTERNAL.feverStartY;
          const fallSeconds = distance / (T.minigame.feverSpeed * multiplier) + T.minigame.feverExtraSeconds;
          setSession((old) => old?.mode === "fever" ? { ...old, feverY: old.feverY + distance / fallSeconds * dt } : old);
        } else accumulatedDt = 0;
      } else if (dt && screenRef.current === "ending" && endingRef.current === "blanket") {
        accumulatedDt += dt;
        if (now - lastPaint > INTERNAL.renderThrottleMs) {
          lastPaint = now;
          const step = accumulatedDt;
          accumulatedDt = 0;
          setBlanketRemaining((old) => old - step);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const playTone = useCallback((frequency: number, duration = 0.08) => {
    if (!soundOn || T.audio.volume <= 0) return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      audioRef.current ??= new AudioContextClass();
      if (audioRef.current.state === "suspended") void audioRef.current.resume();
      const oscillator = audioRef.current.createOscillator();
      const gain = audioRef.current.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "square";
      gain.gain.setValueAtTime(T.audio.volume, audioRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioRef.current.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioRef.current.destination);
      oscillator.start();
      oscillator.stop(audioRef.current.currentTime + duration);
    } catch { /* Audio is optional; all game controls work without it. */ }
  }, [soundOn]);
  playToneRef.current = playTone;

  const currentScenario = useMemo(() => (Text.scenarios as any)[selectedScenario], [selectedScenario]);
  const runningScenario = session ? (Text.scenarios as any)[session.scenario] : currentScenario;
  const currentRound = session ? getSentence(session.scenario, session.level, session.roundIndex) : null;
  const activeTarget = session?.mode === "fever" ? getDeadline(session) : session?.mode === "typing" ? currentRound?.target : "";
  const feverDifficulty = session ? session.level === 0 ? T.advanced.feverEasyScale : session.level === 1 ? 1 : T.advanced.feverHardScale : 1;

  /* [추가 인트로·튜토리얼] 튜토리얼을 아직 안 봤으면 GAME START 때 먼저 보여 줌 */
  const openTutorial = (returnTo: Screen) => { setTutorialReturn(returnTo); setScreen("tutorial"); };
  const startGame = () => { if (!playerGender) setScreen("select"); else if (tutorialDone) setScreen("map"); else openTutorial("map"); };
  const finishTutorial = () => {
    setTutorialDone(true);
    try { localStorage.setItem(TUTORIAL_STORAGE_KEY, "done"); } catch { /* Saving is optional; the tutorial just shows again. */ }
    setScreen(tutorialReturn);
  };

  const startScenario = (id: ScenarioId, level: number) => {
    setSelectedScenario(id);
    const now = performance.now();
    setSession({
      scenario: id, level, mode: "typing", roundIndex: 0, completed: 0, input: "", remaining: limitFor(level),
      anger: 0, social: T.advanced.socialMax, mental: T.advanced.mentalMax, curses: 0, feedback: "", face: "NORMAL", reactionKind: "round",
      calmConsumed: false, stareDone: false, feverDone: false, calmPosition: 0, calmDirection: 1,
      stareRemaining: stareSecondsFor(level), stareGauge: 0, feverIndex: 0, feverY: -14,
      feverHits: 0, combo: 0, feverWon: false, stareWon: false, misses: [], typedChars: 0, matchingChars: 0,
      targetChars: 0, typingMilliseconds: 0, inputStarted: now, blanketIndex: 0, waiting: true,
    });
    setTypedTarget("");
    setComposing(false);
    setBlanketRemaining(T.advanced.blanketSeconds);
    setScreen("play");
    playTone(520, 0.12);
  };

  const clearResult = (next: Session) => {
    if (next.anger >= T.advanced.angerMax || next.social <= 0 || next.curses >= T.advanced.curseLimit) {
      setSession({ ...next, mode: "reaction" });
      setEnding("over");
      setScreen("ending");
      playToneRef.current(110, 0.35);
      return true;
    }
    return false;
  };

  const startReaction = (next: Session, message: string, face: Face, kind: "round" | "event") => {
    setSession({ ...next, mode: "reaction", feedback: message, face, reactionKind: kind, input: "" });
    setTypedTarget("");
  };

  const beginFever = (next: Session) => {
    setSession({ ...next, mode: "fever", feverDone: true, feverIndex: 0, feverY: -14, feverHits: 0, combo: 0, input: "", feedback: "", waiting: true });
    setTypedTarget("");
    playTone(840, 0.2);
  };

  const beginStare = (next: Session) => {
    setSession({ ...next, mode: "stare", stareDone: true, stareRemaining: stareSecondsFor(next.level), stareGauge: 0, face: "ANGRY", feedback: "", waiting: true });
    playTone(190, 0.22);
  };

  const beginCalm = (next: Session) => {
    setCalmMessage("");
    setSession({ ...next, mode: "calm", calmConsumed: true, calmPosition: 0, calmDirection: 1, feedback: "" });
  };

  const finishWin = (next: Session) => {
    const updated: SaveData = {
      ...save,
      unlocked: { ...save.unlocked, [next.scenario]: Math.max(save.unlocked[next.scenario], Math.min(2, next.level + 1)) },
      certificates: { ...save.certificates },
    };
    if (next.level === 2) updated.certificates[next.scenario] = { date: new Date().toLocaleDateString("ko-KR"), rank: titleCaseRank(next) };
    setSave(updated);
    setSession({ ...next, mode: "reaction", face: "DEFEATED" });
    setEnding("win");
    setScreen("ending");
    playTone(660, 0.18);
  };

  const advanceAt = (initial: Session, completed: number) => {
    let next = { ...initial, completed, input: "", feedback: "" };
    if (next.anger >= T.advanced.angerMax || next.social <= 0 || next.curses >= T.advanced.curseLimit) {
      setSession(next); setEnding("over"); setScreen("ending"); playTone(110, 0.35); return;
    }
    if (next.anger >= T.game.angerThreshold && !next.calmConsumed) { beginCalm(next); return; }
    const middle = Math.ceil(levelRoundCount(next.level) / 2);
    if (completed >= middle && !next.stareDone) { beginStare(next); return; }
    if (completed >= middle && !next.feverDone) { beginFever(next); return; }
    if (completed >= levelRoundCount(next.level)) { finishWin({ ...next, mental: next.mental <= 0 ? 0 : next.mental }); return; }
    const nextRound = completed;
    next = { ...next, mode: "typing", roundIndex: nextRound, remaining: limitFor(next.level), inputStarted: performance.now(), face: "NORMAL", feedback: "", waiting: true };
    setSession(next);
  };

  /* [수정 김홍경 11/03] 시작 버튼(또는 Enter)을 누르면 그때부터 제한 시간·낙하가 시작됨 */
  const startWaiting = () => {
    const s = sessionRef.current;
    if (!s || !s.waiting) return;
    setSession({ ...s, waiting: false, remaining: s.mode === "typing" ? limitFor(s.level) : s.remaining, stareRemaining: s.mode === "stare" ? stareSecondsFor(s.level) : s.stareRemaining, inputStarted: performance.now(), feedback: "" });
    setTypedTarget("");
    playTone(620, 0.08);
  };

  const continueReaction = () => {
    if (!session) return;
    playTone(440, 0.06);
    if (session.reactionKind === "round") advanceAt(session, session.completed + 1);
    else advanceAt(session, session.completed);
  };

  const handleTimeout = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.mode !== "typing" || screenRef.current !== "play") return;
    const round = getSentence(s.scenario, s.level, s.roundIndex);
    const currentInput = Array.from(s.input);
    const targetInput = Array.from(round.target);
    const targetLength = targetInput.length;
    const matchedInput = currentInput.filter((char, index) => char === targetInput[index]).length;
    const next = { ...s, anger: Math.min(T.advanced.angerMax, s.anger + T.advanced.angerTimeout), social: Math.max(0, s.social - T.advanced.socialTimeout), misses: [...s.misses, round.target], face: "SMIRK" as Face, typedChars: s.typedChars + currentInput.length, matchingChars: s.matchingChars + matchedInput, targetChars: s.targetChars + targetLength, typingMilliseconds: s.typingMilliseconds + (performance.now() - s.inputStarted) };
    if (!clearResult(next)) startReaction(next, round.timeout, "ANNOYED", "round");
  }, []);

  const handleFeverMiss = useCallback(() => {
    const s = sessionRef.current;
    if (!s || s.mode !== "fever" || screenRef.current !== "play") return;
    const index = s.feverIndex + 1;
    const updated = { ...s, feverIndex: index, feverY: INTERNAL.feverStartY, combo: 0, input: "", feedback: Text.ui.feverMiss };
    setTypedTarget("");
    playToneRef.current(150, 0.12);
    if (index >= (Text.scenarios as any)[s.scenario].levels[s.level].fever.length) finishFever(updated);
    else setSession(updated);
  }, []);

  const finishFever = (s: Session) => {
    const count = s.feverHits;
    const feverCount = (Text.scenarios as any)[s.scenario].levels[s.level].fever.length;
    const next: Session = count === feverCount
      ? { ...s, mental: Math.max(0, s.mental - T.advanced.mentalFeverFull), anger: Math.max(0, s.anger - T.advanced.angerFeverSuccess), social: Math.min(T.advanced.socialMax, s.social + T.advanced.socialFeverFull), feverWon: true, face: "DEFEATED" }
      : count === 2
        ? { ...s, mental: Math.max(0, s.mental - T.advanced.mentalFeverPartial), anger: Math.max(0, s.anger - T.advanced.angerFeverPartial), feverWon: false, face: "SURPRISED" }
        : count === 1
          ? { ...s, mental: Math.max(0, s.mental - T.advanced.mentalFeverOne), feverWon: false, face: "ANNOYED" }
          : { ...s, anger: Math.min(T.advanced.angerMax, s.anger + T.advanced.angerFeverFail), feverWon: false, face: "SMIRK" };
    const reaction = count === feverCount ? Text.ui.perfectReaction : count > 0 ? (Text.scenarios as any)[s.scenario].levels[s.level].rounds[s.roundIndex].win : (Text.scenarios as any)[s.scenario].levels[s.level].rounds[s.roundIndex].typo;
    if (!clearResult(next)) startReaction(next, reaction, next.face, "event");
  };

  useEffect(() => {
    if (screen === "play" && session?.mode === "typing" && session.remaining <= 0) handleTimeout();
  }, [screen, session?.mode, session?.remaining, handleTimeout]);
  useEffect(() => {
    if (screen === "play" && session?.mode === "fever" && session.feverY >= T.advanced.feverLine) handleFeverMiss();
  }, [screen, session?.mode, session?.feverY, handleFeverMiss]);
  useEffect(() => {
    if (screen === "play" && session?.mode === "stare" && session.stareRemaining <= 0) {
      const next = { ...session, anger: Math.min(T.advanced.angerMax, session.anger + T.advanced.angerStareMiss), face: "SMIRK" as Face, stareWon: false };
      if (!clearResult(next)) startReaction(next, Text.ui.stareFail, "SMIRK", "event");
    }
  }, [screen, session?.mode, session?.stareRemaining]);
  useEffect(() => {
    if (screen === "ending" && ending === "blanket" && blanketRemaining <= 0) {
      setBlanketFeedback(Text.ui.blanketTimeout);
      setBlanketInput("");
      setBlanketRemaining(T.advanced.blanketSeconds);
    }
  }, [screen, ending, blanketRemaining]);

  const submitAnswer = () => {
    if (!session || (session.mode !== "typing" && session.mode !== "fever") || session.waiting) return;
    if (composing) return;
    const s = session;
    const expected = activeTarget;
    const typed = typedTarget;
    if (s.mode === "typing") {
      if (s.remaining <= 0) { handleTimeout(); return; }
      const round = currentRound;
      if (!round) return;
      const elapsed = performance.now() - s.inputStarted;
    if (elapsed < T.advanced.minimumSendMs) {
        setSession({ ...s, feedback: Text.ui.tooEarly });
        return;
      }
      if (PROFANITY.some((word) => typed.includes(word))) {
        const next = { ...s, anger: Math.min(T.advanced.angerMax, s.anger + T.advanced.angerCurse), social: Math.max(0, s.social - T.advanced.socialCurse), curses: s.curses + 1, misses: [...s.misses, round.target], typedChars: s.typedChars + Array.from(typed).length, targetChars: s.targetChars + Array.from(round.target).length, typingMilliseconds: s.typingMilliseconds + elapsed, face: "ANGRY" as Face };
        setTypedTarget("");
        if (!clearResult(next)) startReaction(next, round.curse, "ANGRY", "round");
        return;
      }
      const errors = countErrors(round.target, typed);
      const matching = Math.max(0, Array.from(round.target).length - errors);
      const measured: Session = { ...s, typedChars: s.typedChars + Array.from(typed).length, matchingChars: s.matchingChars + matching, targetChars: s.targetChars + Array.from(round.target).length, typingMilliseconds: s.typingMilliseconds + elapsed };
      if (errors <= allowedErrors(s.level)) {
        const next = { ...measured, mental: Math.max(0, s.mental - T.advanced.mentalHit), anger: Math.max(0, s.anger - T.advanced.angerSuccess), social: Math.min(T.advanced.socialMax, s.social + T.advanced.socialSuccess), face: "SURPRISED" as Face, calmConsumed: s.anger - T.advanced.angerSuccess < T.game.angerThreshold ? false : s.calmConsumed };
        setTypedTarget("");
        playTone(740, 0.1);
        startReaction(next, round.win, next.face, "round");
      } else {
        const next = { ...measured, anger: Math.min(T.advanced.angerMax, s.anger + T.advanced.angerTypo), face: "SMIRK" as Face };
        setTypedTarget("");
        if (!clearResult(next)) startReaction(next, round.typo, "SMIRK", "round");
        playTone(170, 0.11);
      }
    } else {
      if (typed === expected) {
        const newIndex = s.feverIndex + 1;
        const hits = s.feverHits + 1;
        const combo = s.combo + 1;
        const next = { ...s, feverIndex: newIndex, feverY: INTERNAL.feverStartY, feverHits: hits, combo, input: "", feedback: "" };
        setTypedTarget("");
        playTone(500 + combo * 110, 0.08);
        if (newIndex >= (Text.scenarios as any)[s.scenario].levels[s.level].fever.length) finishFever(next);
        else setSession(next);
      } else {
        setSession({ ...s, feedback: Text.ui.typos });
        playTone(180, 0.08);
      }
    }
  };

  const tapStare = () => {
    if (!session || session.mode !== "stare" || session.waiting) return;
    const gauge = session.stareGauge + 1;
    if (gauge >= stareGoalFor(session.level)) {
      const next = { ...session, mode: "reaction" as Mode, stareGauge: gauge, mental: Math.max(0, session.mental - T.advanced.mentalStareWin), face: "SURPRISED" as Face, stareWon: true, feedback: Text.ui.stareSuccess, reactionKind: "event" as const };
      setSession(next); playTone(820, 0.12);
    } else setSession({ ...session, stareGauge: gauge });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && screenRef.current === "play") { setScreen("map"); return; }
      /* [수정 김홍경 11/03] 반응 대사 화면에서 Enter로 '다음 대화' 진행 (마우스 클릭 없이)
         - 길게 누를 때 반복 입력(repeat)과 한글 조합 중 Enter, 입력창에서 이미 처리한 Enter는 무시해서
           반박 문장을 전송한 Enter가 반응 대사까지 건너뛰지 않게 함 */
      const isEnter = event.key === "Enter" || event.code === "NumpadEnter";
      if (isEnter && !event.repeat && !event.isComposing && !event.defaultPrevented && screenRef.current === "play" && sessionRef.current?.mode === "reaction") {
        event.preventDefault(); continueReaction(); return;
      }
      /* [수정 김홍경 11/03] 대기 중일 때 Enter(기싸움은 Space도)로 시작 */
      if (!event.repeat && !event.isComposing && !event.defaultPrevented && screenRef.current === "play" && sessionRef.current?.waiting && (isEnter || (event.code === "Space" && sessionRef.current?.mode === "stare"))) {
        event.preventDefault(); startWaiting(); return;
      }
      if (event.code !== "Space" || screenRef.current !== "play") return;
      if (document.activeElement instanceof HTMLInputElement) return;
      const current = sessionRef.current;
      if (current?.mode === "calm") { event.preventDefault(); doCalm(current.calmPosition); }
      /* [수정 김홍경 11/03] Space를 꾹 누르고 있을 때 자동 반복 입력(repeat)은 무시 → 한 번 누를 때 1칸만 올라감 */
      if (current?.mode === "stare") { event.preventDefault(); if (!event.repeat) tapStare(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const doCalm = (position: number) => {
    if (!session || session.mode !== "calm") return;
    const inZone = Math.abs(position - T.minigame.calmCenter) <= T.minigame.calmWindow / 2;
    let next: Session;
    if (inZone) {
      const anger = Math.max(0, session.anger - T.advanced.angerCalmSuccess);
      next = { ...session, mode: "reaction", anger, calmConsumed: anger >= T.game.angerThreshold, face: "SURPRISED", feedback: Text.ui.calmSuccess, reactionKind: "event" };
      setCalmMessage(Text.ui.calmSuccess); playTone(760, 0.15);
    } else {
      next = { ...session, anger: Math.min(T.advanced.angerMax, session.anger + T.advanced.angerCalmMiss), face: "SMIRK" };
      setCalmMessage(Text.ui.calmFail); playTone(160, 0.13);
    }
    if (clearResult(next)) return;
    if (inZone) startReaction(next, Text.ui.calmSuccess, "SURPRISED", "event");
    else { setSession({ ...next, mode: "calm", feedback: Text.ui.calmFail }); window.setTimeout(() => setCalmMessage(""), T.advanced.calmFeedbackMs); }
  };

  const beginBlanket = () => { setEnding("night"); setBlanketFeedback(""); playTone(320, 0.12); };
  const missedSentences = session?.misses.length ? session.misses : [currentRound?.target ?? Text.ui.genericMiss];
  const blanketTarget = session ? missedSentences[session.blanketIndex % missedSentences.length] : "";
  const submitBlanket = () => {
    if (!session) return;
    if (blanketInput.trim() === blanketTarget) {
      const index = session.blanketIndex + 1;
      setBlanketInput("");
      if (index >= missedSentences.length) { setSession({ ...session, blanketIndex: index }); setEnding("done"); playTone(600, 0.15); }
      else { setSession({ ...session, blanketIndex: index }); setBlanketFeedback(""); setBlanketRemaining(T.advanced.blanketSeconds); }
    } else { setBlanketFeedback(Text.ui.typos); playTone(180, 0.08); }
  };

  const onTextKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault(); submitAnswer();
    }
  };

  const displayedAccuracy = session?.targetChars ? Math.round(session.matchingChars / session.targetChars * INTERNAL.percentMax) : INTERNAL.percentMax;
  const averageWpm = session?.typingMilliseconds ? Math.round(session.typedChars / INTERNAL.typingUnit / (session.typingMilliseconds / INTERNAL.millisecondsPerSecond / INTERNAL.secondsPerMinute)) : 0;
  const enteredChars = Array.from(typedTarget);
  const activeChars = Array.from(activeTarget);
  const checkedChars = Math.max(0, enteredChars.length - (composing ? 1 : 0));
  const liveAccuracy = checkedChars ? Math.round(enteredChars.slice(0, checkedChars).filter((char, index) => char === activeChars[index]).length / checkedChars * INTERNAL.percentMax) : 0;
  const character = (Text.scenarios as any)[session?.scenario ?? selectedScenario].character;
  const roundNumber = session ? Math.min(session.completed + 1, levelRoundCount(session.level)) : 1;

  return (
    <main className="game-shell">
      <div className={`screen-frame${screen === "title" || screen === "map" || screen === "intro" ? " is-fullbleed" : ""}`} data-ui>
        <div className="screen-scanlines" />
        <header className="top-strip">
          <span className="brand-mark">{Text.title}</span>
          <span className="top-center">{screen === "play" && session ? `${Text.ui.stageLabel.replace("{number}", String(SCENARIO_IDS.indexOf(session.scenario) + 1).padStart(2, "0"))} / ${Text.ui.difficultyShort[session.level]}` : Text.subtitle}</span>
          <button className="sound-toggle" data-ui onClick={() => setSoundOn((value) => !value)}>{soundOn ? "♪" : "×"} <span>{soundOn ? Text.ui.soundOn : Text.ui.soundOff}</span></button>
        </header>

        {screen === "intro" && <IntroScreen T={T} frameRef={introFrameRef} Portrait={Portrait} onTone={playTone} onDone={() => setScreen("title")} />}
        {screen === "tutorial" && <TutorialScreen T={T} frameRef={introFrameRef} kit={{ Portrait, Meter, TypingPreview, countErrors, renderHowText }} onTone={playTone} onFinish={finishTutorial} />}

        {screen === "briefing" && <BriefingScreen scenarioId={selectedScenario} level={briefingLevel} Portrait={Portrait} onTone={playTone} onStart={() => startScenario(selectedScenario, briefingLevel)} onBack={() => setScreen("map")} />}

        {screen === "title" && <TitleScreen mapId={selectedScenario} collectionCount={Object.keys(save.certificates).length} soundOn={soundOn} onToggleSound={() => setSoundOn((value) => !value)} onStart={startGame} onHowTo={() => setScreen("howto")} onCollection={() => setScreen("collection")} onTone={playTone} />}

        {screen === "select" && <PlayerSelect initial={playerGender} onPick={pickPlayer} onBack={() => setScreen("title")} onTone={playTone} />}

        {screen === "map" && <MapScreen mapId={selectedScenario} save={save} onChangeMap={(id) => setSelectedScenario(id as ScenarioId)} onTalk={(id, level) => { setSelectedScenario(id as ScenarioId); setBriefingLevel(level); setScreen("briefing"); }} onTitle={() => setScreen("title")} onTone={playTone} />}

        {screen === "howto" && <section className="menu-scene howto-scene">
          <h2 className="scene-heading">{Text.ui.howTitle}</h2><div className="howto-panel pixel-panel">
            {/* [수정 김홍경 11/03] HOW TO PLAY를 "소제목|본문" 형식으로 나누고 강조 표시 지원 (ko.json howBody 참고) */}
            {Text.ui.howBody.map((paragraph, index) => {
              const [head, body] = paragraph.includes("|") ? paragraph.split("|") : ["", paragraph];
              return <p key={paragraph}><b>0{index + 1}</b><span>{head && <strong className="how-head">{head}</strong>}{renderHowText(body)}</span></p>;
            })}
          </div><div className="ending-actions howto-actions"><button className="action-button tutorial-replay" onClick={() => openTutorial("title")}>{Text.tutorial.replay}</button><button className="action-button" onClick={() => setScreen("title")}>{Text.ui.back}</button></div>
        </section>}

        {screen === "scenarios" && <section className="menu-scene scenario-scene">
          <div className="scene-heading-row"><div><p className="eyebrow">{Text.ui.scenarioEyebrow}</p><h2 className="scene-heading">{Text.ui.select}</h2></div><span className="chapter-count">{Text.ui.stageCount}</span></div>
          <div className="scenario-list" data-ui>{SCENARIO_IDS.map((id, index) => {
            const item = (Text.scenarios as any)[id];
            const level = save.unlocked[id];
            return <button className={`scenario-row ${selectedScenario === id ? "selected" : ""}`} key={id} onClick={() => { setSelectedScenario(id); setScreen("difficulty"); }}>
              <span className={`scenario-icon icon-${item.character}`}><i>{["▦", "▤", "▣"][index]}</i></span>
              <span className="scenario-info"><b>{Text.ui.stageLabel.replace("{number}", String(index + 1).padStart(2, "0"))} — {item.name}</b><small>{item.role}</small></span>
              <span className="scenario-progress">{Text.ui.stageProgress.replace("{level}", Text.ui.difficultyShort[level])}<i>{"◆".repeat(level + 1)}{"◇".repeat(2 - level)}</i></span>
              <span className="row-arrow">▶</span>
            </button>;
          })}</div>
          <button className="text-button" onClick={() => setScreen("title")}>◀ {Text.ui.back}</button>
        </section>}

        {screen === "difficulty" && <section className="menu-scene difficulty-scene">
          <div className="scene-heading-row"><div><p className="eyebrow">{Text.ui.sceneLabel} · {currentScenario.setting}</p><h2 className="scene-heading">{currentScenario.name}</h2></div><span className="chapter-count">{Text.ui.stageScene.replace("{number}", String(SCENARIO_IDS.indexOf(selectedScenario) + 1).padStart(2, "0"))}</span></div>
          <div className="difficulty-list" data-ui>{Text.ui.difficulty.map((label, level) => {
            const unlocked = level <= save.unlocked[selectedScenario];
            const cleared = level < save.unlocked[selectedScenario] || (level === 2 && !!save.certificates[selectedScenario]);
            return <button key={label} className={`difficulty-option level-${level} ${unlocked ? "" : "locked"}`} disabled={!unlocked} onClick={() => { setBriefingLevel(level); setScreen("briefing"); }}>
              <span className="difficulty-number">0{level + 1}</span><span className="difficulty-copy"><b>{label}</b><small>{Text.ui.difficultyMeta[level]}</small></span>
              <span className="difficulty-status">{cleared ? `✓ ${Text.ui.cleared}` : unlocked ? "▶" : `▣ ${Text.ui.locked}`}</span>
            </button>;
          })}</div>
          <button className="text-button" onClick={() => setScreen("scenarios")}>◀ {Text.ui.back}</button>
        </section>}

        {screen === "play" && session && <section className={`play-scene play-${session.mode} mood-${session.face.toLowerCase()} char-${character}`}>
          <div className="scene-background"><MapCloseup mapId={session.scenario} level={session.level} /></div>
          <div className="scene-meta"><span>{runningScenario.setting}</span><span>{Text.ui.round.replace("{current}", String(roundNumber)).replace("{total}", String(levelRoundCount(session.level)))}</span></div>
          <div className="hud-bars"><div className="battle-plate plate-player"><span className="plate-name">{Text.battle.player}</span>
            <Meter label={Text.ui.anger} value={session.anger} max={T.advanced.angerMax} type="anger" />
            <Meter label={Text.ui.social} value={session.social} max={T.advanced.socialMax} type="social" /></div><div className="battle-plate plate-opponent"><span className="plate-name">{session ? opponentName(session.scenario, session.level) : runningScenario.opponent}</span>
            <Meter label={Text.ui.mental} value={session.mental} max={T.advanced.mentalMax} type="mental" /></div>
          </div>
          <PlayerBack kind={character} gender={playerGender} />
          <div className={`stage-character ${session.mode === "stare" ? "character-emphasis" : ""}`}>
            <Portrait key={`${character}-${session.level}`} kind={character} level={session.level} face={session.face} small={session.mode === "fever"} />
            {/* 상대 이름표는 위쪽 게이지 패널(plate-opponent)로 옮김 */}
          </div>
          {session.mode === "typing" && <p key={session.roundIndex} className="battle-taunt"><span>“{currentRound.taunt}”</span></p>}
          {session.mode === "typing" && <div className="dialog-panel pixel-panel">
            <div className="dialog-name"><span>{session ? opponentName(session.scenario, session.level) : runningScenario.opponent}</span><i>{Text.ui.moodNames[session.face]}</i></div>
            {/* 상대 대사는 인물이 보이도록 대화창 위(battle-taunt)로 옮김 */}
            <div className="prompt-row"><span className="prompt-label">{Text.ui.target}</span><span className="prompt-sentence">{currentRound.target}</span></div>
            {/* [수정 김홍경 11/03] 시작 전에는 입력창 대신 시작 버튼을 보여 줌 (시간이 흐르지 않음) */}
            {session.waiting ? <div className="ready-row">
              <div className="timer-block"><span>{Text.ui.time}</span><b>{Math.ceil(session.remaining)}<i>″</i></b></div>
              <button className="action-button ready-button" onClick={startWaiting}>{Text.ui.readyStart} <b>↵</b></button>
              <span className="ready-hint">{Text.ui.readyHint.replace("{seconds}", String(Math.ceil(session.remaining)))}</span>
            </div> : <div className="input-row">
              <div className="timer-block"><span>{Text.ui.time}</span><b className={session.remaining <= 5 ? "urgent" : ""}>{Math.ceil(session.remaining)}<i>″</i></b></div>
              <form className="typing-form" onSubmit={(event) => { event.preventDefault(); submitAnswer(); }}>
                <TypingPreview target={currentRound.target} value={typedTarget} composing={composing} />
                <input autoFocus aria-label={Text.ui.placeholder} value={typedTarget} onChange={(event) => { setTypedTarget(event.target.value); setSession((old) => old ? { ...old, input: event.target.value, feedback: "" } : old); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={onTextKey} placeholder={Text.ui.placeholder} />
                <button type="submit" className="submit-button" disabled={composing}>{Text.ui.submit}</button>
              </form>
            </div>}
            <div className="typing-footer"><span>{session.feedback || Text.ui.countdown}</span><span>{Text.ui.liveAccuracy.replace("{value}", String(liveAccuracy))} · {Text.ui.curseCount.replace("{count}", String(session.curses))}</span></div>
          </div>}

          {session.mode === "reaction" && <div className="dialog-panel reaction-panel pixel-panel">
            <div className="dialog-name"><span>{session ? opponentName(session.scenario, session.level) : runningScenario.opponent}</span><i>{Text.ui.moodNames[session.face]}</i></div>
            <p className="reaction-text">{session.feedback}</p>
            <div className="reaction-controls"><span>{Text.ui.curseCount.replace("{count}", String(session.curses))}</span><button className="action-button" onClick={continueReaction}>{Text.ui.next} <b>↵</b>{/* [수정 김홍경 11/03] Enter로 넘어간다는 표시: ▶ → ↵ */}</button></div>
          </div>}

          {session.mode === "calm" && <div className="minigame-shade calm-overlay"><div className="minigame-card pixel-panel">
            <p className="event-kicker">{Text.ui.angerEventKicker}</p><h2>{Text.ui.calmTitle}</h2><p>{Text.ui.calmHelp}</p>
            <div className="calm-dial"><div className="calm-zone" style={{ left: `${T.minigame.calmCenter - T.minigame.calmWindow / 2}%`, width: `${T.minigame.calmWindow}%` }} /><i className="calm-needle" style={{ left: `${session.calmPosition}%` }} /></div>
            <div className="calm-labels"><span>{Text.ui.breathIn}</span><span>{Text.ui.breathOut}</span></div>
            <button className="action-button" onClick={() => doCalm(session.calmPosition)}>{Text.ui.calmAction}</button>
            {calmMessage && <p className="inline-feedback">{calmMessage}</p>}
          </div></div>}

          {session.mode === "stare" && <div className="minigame-shade stare-overlay"><div className="stare-backdrop">{Text.ui.stareBackdrop}</div><div className="stare-portrait"><Portrait key={`${character}-${session.level}`} kind={character} level={session.level} face="ANGRY" /></div><PlayerBack kind={character} gender={playerGender} /><div className="minigame-card stare-card pixel-panel">
            <p className="event-kicker">{Text.ui.stareEventKicker}</p><h2>{Text.ui.stareTitle}</h2><p>{Text.ui.stareHelp.replace("{seconds}", String(stareSecondsFor(session.level))).replace("{goal}", String(stareGoalFor(session.level)))}</p><div className="stare-meter"><i style={{ width: `${Math.min(100, session.stareGauge / stareGoalFor(session.level) * 100)}%` }} /></div>
            <div className="stare-meta"><span>{Text.ui.stareMeter}</span><b>{session.stareGauge} / {stareGoalFor(session.level)}</b><strong>{session.stareRemaining.toFixed(1)}″</strong></div>
            {/* [수정 김홍경 11/03] 기싸움도 시작 버튼을 눌러야 5초가 흐름 */}
            {session.waiting ? <button className="action-button ready-button" onClick={startWaiting}>{Text.ui.readyStart} <b>↵</b></button> : <button className="action-button" onClick={tapStare}>{Text.ui.stareAction}</button>}
          </div></div>}

          {session.mode === "fever" && <div className="fever-overlay">
            <div className="fever-top"><span>✦ {Text.ui.fever}</span><b>{Text.ui.combo} ×{session.combo}</b><i>{Text.ui.successCount.replace("{count}", String(session.feverHits))}</i></div>
            <p className="fever-subtitle">「{Text.ui.feverSub}」</p>
            <div className="fever-lane">{!session.waiting && <div className="falling-sentence" style={{ top: `${session.feverY}%`, transform: `translateX(-50%) scale(${feverDifficulty})` }}>{getDeadline(session)}</div>}{/* [수정 김홍경 11/03] 시작 전에는 떨어질 문장을 숨김 */}
              <div className="dead-line" style={{ top: `${T.advanced.feverLine}%` }}><span>{Text.ui.deadLine}</span></div></div>
            {/* [수정 김홍경 11/03] 피버(산성비)도 시작 버튼을 누르면 문장이 떨어지기 시작 */}
            <div className="fever-bottom"><p>{session.waiting ? Text.ui.feverReadyHint : Text.ui.feverHint}</p>{session.waiting ? <button className="action-button ready-button" onClick={startWaiting}>{Text.ui.readyStart} <b>↵</b></button> : <form className="fever-form" onSubmit={(event) => { event.preventDefault(); submitAnswer(); }}>
              <TypingPreview target={getDeadline(session)} value={typedTarget} composing={composing} />
              <input autoFocus aria-label={Text.ui.placeholder} value={typedTarget} onChange={(event) => { setTypedTarget(event.target.value); setSession((old) => old ? { ...old, input: event.target.value, feedback: "" } : old); }} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={onTextKey} placeholder={Text.ui.placeholder} />
              <button className="submit-button" disabled={composing}>{Text.ui.submit}</button>
            </form>}<span className="fever-feedback">{session.feedback}</span></div>
          </div>}
          <div className="play-corner"><span>{Text.ui.curseCount.replace("{count}", String(session.curses))}</span><span>{Text.ui.escapeHint}</span></div>
          <div className="crt-vignette" />
        </section>}

        {screen === "ending" && session && <section className={`ending-scene ending-${ending} ${ending === "night" || ending === "blanket" || ending === "done" ? "night-scene" : ""}`}>
          {ending === "win" && <div className="ending-content win-content pixel-panel">
            <p className="eyebrow">{Text.ui.goodBye}</p><h1>{Text.ui.clearTitle}</h1><h2>「{Text.ui.clearSub}」</h2><p className="ending-quote">{Text.ui.happyLine}</p>
            <div className="result-grid"><Stat label={Text.ui.accuracy} value={`${displayedAccuracy}%`} /><Stat label={Text.ui.speed} value={Text.ui.wpm.replace("{value}", String(averageWpm))} /><Stat label={Text.ui.social} value={`${session.social}`} /><Stat label={Text.ui.anger} value={`${session.anger}`} /><Stat label={`${Text.ui.feverResult} / ${Text.ui.stareResult}`} value={`${session.feverWon ? Text.ui.won : Text.ui.notWon} / ${session.stareWon ? Text.ui.won : Text.ui.notWon}`} /><Stat label={Text.ui.rating} value={titleCaseRank(session)} /></div>
            {session.level === 2 && <div className="certificate-toast">✦ {Text.ui.certificate} — {(Text.scenarios as any)[session.scenario].certificate}</div>}
            <p className="final-line">{Text.ui.finalLine}</p><div className="ending-actions"><button className="action-button" onClick={() => setScreen("map")}>{Text.ui.toMap}</button><button className="text-button" onClick={() => setScreen("title")}>{Text.ui.toTitle}</button></div>
          </div>}
          {ending === "over" && <div className="ending-content over-content pixel-panel"><p className="eyebrow">{Text.ui.overKicker}</p><h1>{Text.ui.overline}</h1><h2>「{Text.ui.overSub}」</h2><p className="over-reason">{session.curses >= T.advanced.curseLimit ? Text.ui.curseCount.replace("{count}", String(session.curses)) : session.anger >= T.advanced.angerMax ? Text.ui.anger : Text.ui.social}</p><button className="action-button" onClick={beginBlanket}>{Text.ui.next} ▶</button></div>}
          {ending === "night" && <div className="night-narrative"><p>{Text.ui.badIntro}</p><h2>「{Text.ui.nightThought}」</h2><button className="action-button" onClick={() => { setEnding("blanket"); setBlanketInput(""); setBlanketFeedback(""); setBlanketRemaining(T.advanced.blanketSeconds); }}>{Text.ui.blanketTitle} ▶</button></div>}
          {ending === "blanket" && <div className="blanket-game pixel-panel"><p className="eyebrow">{Text.ui.blanketEventKicker}</p><h2>{Text.ui.blanketTitle}</h2><p>{Text.ui.blanketPrompt}</p><div className="blanket-memory">“{blanketTarget}”</div><form className="blanket-form" onSubmit={(event) => { event.preventDefault(); submitBlanket(); }}><input autoFocus value={blanketInput} onChange={(event) => setBlanketInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); submitBlanket(); } }} placeholder={Text.ui.placeholder} aria-label={Text.ui.placeholder} /><button className="submit-button">{Text.ui.submit}</button></form><p className="blanket-status">{blanketFeedback || `${session.blanketIndex + 1} / ${missedSentences.length} · ${Math.ceil(blanketRemaining)}″`}</p></div>}
          {ending === "done" && <div className="ending-content done-content pixel-panel"><p>{Text.ui.blanketLine1}</p><p>{Text.ui.blanketLine2}</p><h2>「{Text.ui.blanketEnd}」</h2><button className="action-button" onClick={() => startScenario(session.scenario, session.level)}>{Text.ui.retry} ▶</button></div>}
          {ending === "night" && <div className="night-room"><div className="night-window"><i /><i /><i /></div><div className="night-bed"><div className="pillow" /><div className="blanket-shape" /></div><span className="night-thought">{Text.ui.nightThought}</span></div>}
        </section>}

        {screen === "collection" && <section className="menu-scene collection-scene">
          <p className="eyebrow">{Text.ui.collectionEyebrow}</p><h2 className="scene-heading">{Text.ui.collectionTitle}</h2><p className="collection-hint">{Text.ui.collectionHint}</p>
          <div className="certificate-list">{SCENARIO_IDS.map((id, index) => {
            const earned = save.certificates[id];
            return <div className={`certificate-card ${earned ? "earned" : "unearned"}`} key={id}><div className="certificate-stamp">{earned ? "✦" : "◇"}</div><div><small>{(Text.scenarios as any)[id].name}</small><b>{(Text.scenarios as any)[id].certificate}</b><span>{earned ? Text.ui.certificateDate.replace("{date}", earned.date) : Text.ui.locked}</span>{earned && <i>{Text.ui.rating}: {earned.rank}</i>}</div><strong>{earned ? Text.ui.certificateStamp : "---"}</strong></div>;
          })}</div>
          {SCENARIO_IDS.every((id) => save.certificates[id]) && <div className="master-certificate"><span>✹</span><div><small>{Text.ui.special}</small><b>{Text.ui.allCertificate}</b><i>{Text.ui.mastery}</i></div><span>✹</span></div>}
          <button className="text-button" onClick={() => setScreen("title")}>◀ {Text.ui.toTitle}</button>
        </section>}
        <div className="frame-corner corner-tl" /><div className="frame-corner corner-tr" /><div className="frame-corner corner-bl" /><div className="frame-corner corner-br" />
      </div>
      {screen !== "title" && screen !== "map" && screen !== "intro" && <div className="keyboard-hint">{Text.ui.tip}</div>}
    </main>
  );
}

/* [수정 김홍경 11/03] HOW TO PLAY 강조 표시
   **글자** → 금색 강조, !!글자!! → 빨간색 경고, [키] → 키보드 키 모양 */
function renderHowText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|!![^!]+!!|\[[^\]]+\])/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**")) return <em key={index} className="how-em">{part.slice(2, -2)}</em>;
    if (part.startsWith("!!")) return <em key={index} className="how-warn">{part.slice(2, -2)}</em>;
    if (part.startsWith("[")) return <kbd key={index} className="how-key">{part.slice(1, -1)}</kbd>;
    return part;
  });
}

function Meter({ label, value, max, type }: { label: string; value: number; max: number; type: string }) {
  const percent = Math.max(0, Math.min(INTERNAL.percentMax, value / max * INTERNAL.percentMax));
  return <div className={`meter meter-${type}`}><div><span>{label}</span><b>{Math.round(value)}<small>/ {Math.round(max)}</small></b></div><i><em style={{ width: `${percent}%` }} /></i></div>;
}

function TypingPreview({ target, value, composing }: { target: string; value: string; composing: boolean }) {
  const entered = Array.from(value);
  const expected = Array.from(target);
  return <div className="typing-preview" aria-hidden="true">{expected.map((char, index) => <span className={composing && index < entered.length ? "composing" : entered[index] === undefined ? "pending" : entered[index] === char ? "match" : "mismatch"} key={`${index}-${char}`}>{char}</span>)}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="result-stat"><small>{label}</small><b>{value}</b></div>;
}

export default GameScreen;
