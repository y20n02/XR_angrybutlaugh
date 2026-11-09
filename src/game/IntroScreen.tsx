import { useEffect, useRef, useState } from "react";
import type { ComponentType, MutableRefObject } from "react";
import Text from "../locales/ko.json";
import { opponentName } from "./maps";
import { MapCloseup } from "./MapScreen";

/* 게임을 켜면 타이틀 전에 한 번 나오는 오프닝 (90년대 PC 비주얼노벨 스타일).
   가운데 장면 창 + 장식 테두리 + 아래 대사창. 대사는 ko.json의 intro.beats에서 고칩니다.
   - narration: 밤의 자취방, taunt: 그 상대의 맵 + 초상화, finale: 불 꺼진 방 */
type IntroProps = {
  T: any;
  frameRef: MutableRefObject<((dt: number) => void) | null>;
  Portrait: ComponentType<{ kind: string; face: any; small?: boolean }>;
  onTone: (frequency: number, duration?: number) => void;
  onDone: () => void;
};

const BEATS = Text.intro.beats as { kind: string; text: string; character?: string; face?: string }[];

/* ---------- 자취방 장면 (288×132 도트) ---------- */
const SW = 288;
const SH = 132;
const R = {
  wall: "#34306e", wallStripe: "#2b2762", wallTop: "#211d50", line: "#14122e",
  desk: "#8d86c9", deskTop: "#b9b2e6", deskShade: "#625ba3", metal: "#d9d3ee", metalShade: "#a29bcc",
  screen: "#1d2a4a", glow: "#8fd1ff", glowSoft: "#5c9bd6", night: "#0f1736", night2: "#1c2a5c",
  moon: "#fff3c4", lamp: "#ffe3a6", curtain: "#5a4f9e", curtainShade: "#463d85", paper: "#ece6f7",
  book: ["#e48aa8", "#8fd1ff", "#ffd27a", "#9be0b0", "#c7a6ff"],
};

function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function drawRoom(ctx: CanvasRenderingContext2D, lightsOn: boolean) {
  const rand = seeded(3);
  const r = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const box = (x: number, y: number, w: number, h: number, c: string) => { r(x, y, w, h, R.line); r(x + 1, y + 1, w - 2, h - 2, c); };
  const dither = (x: number, y: number, w: number, h: number, c: string, step = 2) => {
    ctx.fillStyle = c;
    for (let yy = y; yy < y + h; yy++) for (let xx = x + ((yy - y) % 2); xx < x + w; xx += step) ctx.fillRect(xx, yy, 1, 1);
  };

  /* 벽지 */
  r(0, 0, SW, SH, R.wall);
  for (let x = 0; x < SW; x += 14) r(x, 0, 3, 96, R.wallStripe);
  r(0, 0, SW, 8, R.wallTop); dither(0, 8, SW, 6, R.wallTop);

  /* 창문 + 밤하늘 */
  const wx = 168, wy = 12, ww = 84, wh = 64;
  box(wx - 3, wy - 3, ww + 6, wh + 6, R.metalShade);
  r(wx, wy, ww, wh, R.night2); r(wx, wy, ww, wh / 2, R.night); dither(wx, wy + wh / 2 - 3, ww, 6, R.night);
  for (let i = 0; i < 18; i++) r(wx + Math.floor(rand() * ww), wy + Math.floor(rand() * 34), 1, 1, "#ffffff");
  ctx.fillStyle = R.moon; ctx.beginPath(); ctx.arc(wx + 62, wy + 15, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = R.night; ctx.beginPath(); ctx.arc(wx + 65, wy + 13, 6, 0, Math.PI * 2); ctx.fill();
  let bx = wx;
  while (bx < wx + ww) {
    const bw = 6 + Math.floor(rand() * 10), bh = 10 + Math.floor(rand() * 22);
    r(bx, wy + wh - bh, bw, bh, R.line);
    for (let y = wy + wh - bh + 2; y < wy + wh - 2; y += 4) for (let x = bx + 1; x < bx + bw - 1; x += 3) if (rand() > 0.6) r(x, y, 1, 2, "#ffd27a");
    bx += bw + 1;
  }
  r(wx + ww / 2 - 1, wy, 2, wh, R.metalShade); r(wx, wy + wh / 2 - 1, ww, 2, R.metalShade);
  /* 커튼 */
  [wx - 14, wx + ww + 2].forEach((cx) => { r(cx, wy - 6, 14, wh + 18, R.curtain); for (let x = cx + 2; x < cx + 14; x += 4) r(x, wy - 6, 1, wh + 18, R.curtainShade); });
  r(wx - 16, wy - 8, ww + 34, 3, R.metalShade);

  /* 벽에 붙은 달력·메모 */
  box(28, 18, 26, 32, R.paper);
  for (let y = 26; y < 46; y += 5) r(31, y, 20, 1, R.metalShade);
  r(31, 21, 12, 3, "#e48aa8");
  box(60, 24, 14, 12, "#ffd27a"); r(62, 28, 9, 1, R.line); r(62, 31, 6, 1, R.line);

  /* 책상 */
  r(10, 92, SW - 20, 8, R.deskTop); r(10, 99, SW - 20, 1, R.line);
  r(10, 100, SW - 20, SH - 100, R.desk); r(10, 92, SW - 20, 1, R.line);
  box(22, 104, 54, 16, R.deskShade); r(40, 111, 18, 2, R.line);
  dither(10, 118, SW - 20, 14, R.deskShade);

  /* CRT 모니터 */
  box(104, 46, 58, 44, R.metal); r(158, 48, 3, 41, R.metalShade);
  box(110, 51, 44, 32, R.screen);
  if (lightsOn) {
    r(111, 52, 42, 30, R.glowSoft); dither(111, 52, 42, 30, R.glow, 3);
    box(114, 55, 24, 7, "#ffffff"); box(126, 64, 24, 7, "#ffe3a6"); box(114, 73, 18, 7, "#ffffff");
  }
  box(122, 89, 22, 4, R.metalShade);
  box(100, 94, 52, 5, R.metal);
  for (let x = 103; x < 149; x += 4) r(x, 96, 2, 1, R.metalShade);

  /* 스탠드 */
  const joint = (x: number, y: number) => { ctx.fillStyle = R.line; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = R.metal; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); };
  const arm = (x1: number, y1: number, x2: number, y2: number) => { ctx.strokeStyle = R.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = R.metal; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  if (lightsOn) {
    ctx.fillStyle = "#ffe3a633";
    ctx.beginPath(); ctx.moveTo(84, 30); ctx.lineTo(62, 92); ctx.lineTo(132, 92); ctx.lineTo(96, 30); ctx.closePath(); ctx.fill();
    dither(70, 88, 50, 4, "#ffe3a6", 4);
  }
  box(40, 88, 18, 5, R.metalShade);
  arm(49, 88, 44, 56); arm(44, 56, 80, 30);
  joint(49, 88); joint(44, 56);
  ctx.fillStyle = R.line; ctx.beginPath(); ctx.moveTo(76, 24); ctx.lineTo(98, 28); ctx.lineTo(92, 36); ctx.lineTo(78, 33); ctx.closePath(); ctx.fill();
  ctx.fillStyle = R.metalShade; ctx.beginPath(); ctx.moveTo(78, 26); ctx.lineTo(95, 29); ctx.lineTo(91, 34); ctx.lineTo(79, 31); ctx.closePath(); ctx.fill();
  if (lightsOn) r(82, 33, 9, 2, R.lamp);

  /* 책·머그컵 */
  let x = 200;
  R.book.concat(R.book.slice(0, 3)).forEach((c, i) => { const h = 16 + (i % 3) * 3; box(x, 92 - h, 5, h, c); x += 5; });
  box(176, 82, 10, 10, R.paper); r(186, 85, 2, 4, R.line);
  /* 의자 등받이 */
  box(214, 100, 56, 32, R.deskShade); r(218, 104, 48, 3, R.metalShade);

  if (!lightsOn) {
    ctx.fillStyle = "#0a0820b0"; ctx.fillRect(0, 0, SW, SH);
    ctx.fillStyle = "#8fa8ff22";
    ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx + ww, wy + wh); ctx.lineTo(wx + ww - 30, SH); ctx.lineTo(wx - 50, SH); ctx.closePath(); ctx.fill();
  }
}

/* ---------- 양옆 장식 기둥 (화면 전체 384×216 도트, 오른쪽은 왼쪽을 뒤집어 그림) ---------- */
const F = {
  bg: "#1a1830", bgDot: "#221f3e", line: "#14122e",
  light: "#f1edff", mid: "#c3bbec", mid2: "#9289d6", dark: "#5f54ad",
  gold: "#ffd84a", goldDark: "#b8862a", navy: "#2a1a6f", pink: "#ff8ad8", pinkDark: "#c2489a",
};
const HEART = [".pp.pp.", "ppppppp", "ppppppp", ".ppppp.", "..ppp..", "...p..."];

function drawPillar(ctx: CanvasRenderingContext2D) {
  const r = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const x0 = 9, x1 = 41, cx = 25;
  const shade = (t: number) => (t < 0.12 ? F.dark : t < 0.3 ? F.mid2 : t < 0.45 ? F.mid : t < 0.62 ? F.light : t < 0.78 ? F.mid : t < 0.9 ? F.mid2 : F.dark);
  const band = (y: number, h: number, inset: number) => {
    r(x0 - inset - 1, y - 1, x1 - x0 + inset * 2 + 2, h + 2, F.line);
    for (let x = x0 - inset; x < x1 + inset; x++) r(x, y, 1, h, shade((x - x0 + inset) / (x1 - x0 + inset * 2)));
  };
  const disc = (px: number, py: number, rad: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, rad, 0, Math.PI * 2); ctx.fill(); };
  const volute = (px: number, py: number) => { disc(px, py, 6, F.line); disc(px, py, 5, F.mid); disc(px, py, 3, F.dark); disc(px, py, 2, F.light); r(px, py, 1, 1, F.gold); };

  /* 몸통: 세로 홈 */
  r(x0 - 1, 26, x1 - x0 + 2, 164, F.line);
  for (let x = x0; x < x1; x++) r(x, 26, 1, 164, shade((x - x0) / (x1 - x0)));
  for (let x = x0 + 4; x < x1 - 3; x += 6) r(x, 30, 1, 156, F.dark);

  /* 금빛 덩굴 */
  for (let y = 30; y < 186; y++) {
    if (y > 88 && y < 128) continue;
    const vx = Math.round(cx + Math.sin(y / 11) * 9);
    r(vx - 1, y, 3, 1, F.line); r(vx, y, 1, 1, F.gold);
    if (y % 12 === 0) {
      const side = Math.cos(y / 11) > 0 ? 1 : -1;
      r(vx + side * 2, y - 1, 3 * side, 3, F.line); r(vx + side * 2, y, 2 * side, 1, F.gold); r(vx + side * 3, y - 1, side, 1, F.goldDark);
    }
  }

  /* 가운데 메달 + 하트 */
  ctx.fillStyle = F.line; ctx.beginPath(); ctx.ellipse(cx, 108, 15, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = F.gold; ctx.beginPath(); ctx.ellipse(cx, 108, 14, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = F.goldDark; ctx.beginPath(); ctx.ellipse(cx + 1, 109, 12, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = F.navy; ctx.beginPath(); ctx.ellipse(cx, 108, 11, 16, 0, 0, Math.PI * 2); ctx.fill();
  HEART.forEach((row, y) => Array.from(row).forEach((ch, x) => { if (ch === "p") { r(cx - 4 + x, 104 + y + 1, 1, 1, F.line); } }));
  HEART.forEach((row, y) => Array.from(row).forEach((ch, x) => { if (ch === "p") r(cx - 4 + x, 104 + y, 1, 1, y > 2 ? F.pinkDark : F.pink); }));
  r(cx - 3, 105, 1, 1, "#ffffff");
  [[cx, 90], [cx, 126], [cx - 12, 108], [cx + 12, 108]].forEach(([px, py]) => { r(px - 1, py - 1, 3, 3, F.line); r(px, py, 1, 1, F.light); });

  /* 기둥 머리 (위) */
  band(4, 6, 5);
  band(12, 8, 2);
  volute(x0 - 2, 16); volute(x1 + 1, 16);
  band(22, 3, 0);
  r(cx - 2, 13, 5, 5, F.line); r(cx - 1, 14, 3, 3, F.gold);

  /* 받침 (아래) */
  band(191, 3, 0);
  band(196, 7, 2);
  band(205, 6, 5);
  for (let x = x0 - 1; x < x1 + 1; x += 5) { r(x, 198, 2, 2, F.line); r(x, 198, 1, 1, F.gold); }
}

function drawFrameArt(ctx: CanvasRenderingContext2D) {
  const W = 384, H = 216;
  ctx.fillStyle = F.bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = F.bgDot;
  for (let y = 0; y < H; y += 3) for (let x = (y / 3) % 2 ? 0 : 3; x < W; x += 6) ctx.fillRect(x, y, 1, 1);
  const pillar = document.createElement("canvas");
  pillar.width = 50; pillar.height = H;
  drawPillar(pillar.getContext("2d")!);
  ctx.drawImage(pillar, 0, 0);
  ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(pillar, 0, 0); ctx.restore();
}

function FrameArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current; if (c) drawFrameArt(c.getContext("2d")!); }, []);
  return <canvas ref={ref} className="vn-frame-art" width={384} height={216} aria-hidden />;
}

function RoomScene({ lightsOn }: { lightsOn: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current; if (c) drawRoom(c.getContext("2d")!, lightsOn); }, [lightsOn]);
  return <canvas ref={ref} className="vn-room" width={SW} height={SH} aria-hidden />;
}

function IntroScreen({ T, frameRef, Portrait, onTone, onDone }: IntroProps) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const beat = BEATS[index];
  const chars = Array.from(beat.text);
  const typingSeconds = chars.length / T.tutorial.introCharsPerSecond;
  const holdSeconds = beat.kind === "finale" ? T.tutorial.introFinaleSeconds : T.tutorial.introHoldSeconds;
  const shownCount = Math.min(chars.length, Math.floor(elapsed * T.tutorial.introCharsPerSecond));
  const done = shownCount >= chars.length;
  const speaker = beat.character ? opponentName(beat.character, 0) : beat.kind === "finale" ? Text.intro.me : "";

  const nextBeat = () => {
    if (index + 1 >= BEATS.length) { onDone(); return; }
    setIndex(index + 1);
    setElapsed(0);
  };
  /* 글자가 나오는 중이면 문장을 끝까지 보여 주고, 다 나왔으면 다음 장면으로 */
  const advance = () => {
    onTone(440, 0.05);
    if (!done) setElapsed(typingSeconds);
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
    <section className={`vn-screen vn-${beat.kind}`} onClick={advance}>
      <FrameArt />

      <div className="vn-window">
        <div className="vn-scene" key={beat.character ?? beat.kind}>
          {beat.character
            ? <><MapCloseup mapId={beat.character} /><div className={`vn-portrait${done ? "" : " talking"}`}><Portrait kind={beat.character} face={beat.face} /></div></>
            : <RoomScene lightsOn={beat.kind !== "finale"} />}
        </div>
      </div>

      <div className="vn-dialog">
        <p aria-label={beat.text}>
          {speaker && <b>【{speaker}】</b>}
          <span>{chars.slice(0, shownCount).join("")}</span><span className="vn-ghost">{chars.slice(shownCount).join("")}</span>
          {done && <i className="vn-next">▼</i>}
        </p>
      </div>

      <button className="vn-skip" onClick={(event) => { event.stopPropagation(); onDone(); }}>{Text.intro.skip}</button>
    </section>
  );
}

export default IntroScreen;
