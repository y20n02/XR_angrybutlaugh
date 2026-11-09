import { useEffect, useRef, useState } from "react";
import Text from "../locales/ko.json";
import { COLS, ROWS, TILE, MAPS, playerLook, npcText } from "./maps";
import type { Dir, Look, MapDef, Palette, Prop } from "./maps";
import "./map-screen.css";

/* 픽셀 맵 화면: 방향키로 돌아다니다가 NPC 앞에서 Space로 말을 걸면 대결 시작.
   아직 잠긴 상대는 말풍선만 뜹니다. 맵 배치는 maps.ts, 문구는 ko.json의 map에서 고칩니다. */
type SaveInfo = { unlocked: Record<string, number>; certificates: Record<string, unknown> };
type MapProps = {
  mapId: string;
  save: SaveInfo;
  onChangeMap: (id: string) => void;
  onTalk: (mapId: string, level: number) => void;
  onTitle: () => void;
  onTone: (frequency: number, duration?: number) => void;
};

const W = COLS * TILE;          // 384
const TOP = 8;                  // 천장 띠 높이
const H = TOP + ROWS * TILE;    // 216
const STEP_MS = 150;            // 한 칸 이동 시간
const MAP_IDS = Object.keys(MAPS);
const DELTA: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEY_DIR: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };

/* 대결 다녀와도 서 있던 자리 그대로 */
const lastPosition: Record<string, { x: number; y: number; dir: Dir }> = {};

/* ---------- 그리기 도구 ---------- */
function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}
function seeded(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function drawStatic(ctx: CanvasRenderingContext2D, def: MapDef) {
  const P = def.palette;
  const rand = seeded(11);
  const r = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const box = (x: number, y: number, w: number, h: number, fill: string) => { r(x, y, w, h, P.line); r(x + 1, y + 1, w - 2, h - 2, fill); };

  /* 천장 */
  r(0, 0, W, TOP, P.ceiling);
  for (let x = 24; x < W; x += 72) { r(x, 2, 40, 4, P.light); r(x, 5, 40, 1, P.trim); }

  /* 바닥 (점무늬) */
  r(0, TOP, W, ROWS * TILE, P.floor);
  ctx.fillStyle = P.floorAlt;
  for (let y = TOP + 2 * TILE; y < H; y += 2) for (let x = (y / 2) % 2 ? 0 : 2; x < W; x += 4) ctx.fillRect(x, y, 1, 1);

  /* 위쪽 벽 (0~1번 줄) */
  r(0, TOP, W, TILE, P.wallTop);
  r(0, TOP + TILE, W, TILE, P.wall);
  for (let x = 0; x < W; x += 48) r(x, TOP, 1, 2 * TILE, P.trim);
  r(0, TOP + 2 * TILE - 3, W, 3, P.trim);
  r(0, TOP + 2 * TILE, W, 1, P.line);

  /* 왼쪽 벽 */
  r(0, TOP, 6, ROWS * TILE, P.wall); r(5, TOP + 2 * TILE, 1, ROWS * TILE, P.line);
  /* 오른쪽: 큰 창문 또는 벽 */
  if (def.rightWindow) {
    for (let y = TOP; y < H; y++) { const t = (y - TOP) / (H - TOP); r(W - 12, y, 12, 1, t < 0.5 ? P.sky1 : P.sky2); }
    for (let y = TOP; y < H; y += 24) r(W - 12, y, 12, 2, P.trim);
    r(W - 13, TOP, 1, H, P.line); r(W - 8, TOP, 1, H, P.trim);
  } else { r(W - 6, TOP, 6, H, P.wall); r(W - 6, TOP + 2 * TILE, 1, H, P.line); }
  /* 아래 낮은 벽 */
  r(0, H - 8, W, 8, P.wall); r(0, H - 9, W, 1, P.line); r(0, H - 8, W, 2, P.wallTop);

  const sorted = [...def.props].sort((a, b) => Number(!a.walk) - Number(!b.walk) || a.y - b.y);
  sorted.forEach((p) => drawProp(ctx, p, P, rand, r, box));
}

function drawProp(
  ctx: CanvasRenderingContext2D, p: Prop, P: Palette, rand: () => number,
  r: (x: number, y: number, w: number, h: number, c: string) => void,
  box: (x: number, y: number, w: number, h: number, fill: string) => void,
) {
  const X = p.x * TILE, Y = TOP + p.y * TILE, Wp = (p.w ?? 1) * TILE, Hp = (p.h ?? 1) * TILE;
  const leaves = (cx: number, cy: number) => {
    [[-4, -2], [4, -2], [0, -6], [-5, -7], [5, -7], [0, -1]].forEach(([dx, dy], i) => {
      r(cx + dx - 3, cy + dy - 2, 6, 4, P.line); r(cx + dx - 2, cy + dy - 1, 4, 2, i % 2 ? P.leafLight : P.leaf);
    });
  };
  switch (p.t) {
    case "rug":
      r(X + 2, Y + 2, Wp - 4, Hp - 4, P.rug);
      ctx.fillStyle = P.accent;
      for (let x = X + 4; x < X + Wp - 4; x += 3) { ctx.fillRect(x, Y + 3, 1, 1); ctx.fillRect(x, Y + Hp - 4, 1, 1); }
      break;
    case "door": {
      box(X + 1, Y - TILE + 4, Wp - 2, Hp + TILE - 4, P.trim);
      for (let i = 0; i < 2; i++) {
        const dx = X + 3 + i * (Wp / 2 - 2);
        box(dx, Y - TILE + 6, Wp / 2 - 4, Hp + TILE - 6, P.glass);
        r(dx + 3, Y - TILE + 9, 1, 8, "#ffffff"); r(dx + 5, Y - TILE + 9, 1, 4, "#ffffff");
      }
      box(X + 4, Y - TILE - 6, Wp - 8, 9, P.glow);
      r(X + Wp / 2 - 3, Y - TILE - 4, 6, 5, P.trim); r(X + Wp / 2 - 2, Y - TILE - 3, 1, 1, P.glow); r(X + Wp / 2 + 1, Y - TILE - 3, 1, 1, P.glow);
      r(X + 3, Y + Hp + 2, Wp - 6, 5, P.trim);
      break;
    }
    case "desk": {
      box(X, Y - 3, Wp, 7, P.metal);
      for (let i = 0; i < (p.w ?? 1); i++) {
        const mx = X + i * TILE;
        if (i % 2 === 0) { box(mx + 3, Y - 6, 11, 9, P.metal); r(mx + 4, Y - 5, 9, 6, i % 4 ? P.screen : P.glow); r(mx + 8, Y + 3, 2, 2, P.line); }
        else { r(mx + 4, Y - 7, 3, 4, P.glow); r(mx + 8, Y - 6, 4, 3, "#ffffff"); }
      }
      box(X, Y + 3, Wp, 16, P.wood);
      for (let i = 0; i < (p.w ?? 1); i++) { if (rand() > 0.5) r(X + i * TILE + 5, Y + 8, 6, 3, P.metalLight); }
      box(X, Y + 18, Wp, Hp - 18, P.woodShade);
      for (let x = X + 2; x < X + Wp - 10; x += 16) { box(x, Y + 20, 10, Hp - 22, P.metalLight); r(x + 3, Y + 23, 4, 1, P.line); }
      break;
    }
    case "plant":
      box(X + 4, Y + 8, 8, 7, P.pot);
      leaves(X + 8, Y + 6);
      break;
    case "glassroom": {
      box(X, Y, Wp, Hp, P.floorAlt);
      r(X + 1, Y + 1, Wp - 2, 10, P.wall);
      box(X + 10, Y + 2, 18, 9, P.glow); box(Wp + X - 30, Y + 2, 18, 9, P.glow);
      box(X + 20, Y + 20, Wp - 40, 14, P.wood);
      for (let x = X + 24; x < X + Wp - 24; x += 12) { box(x, Y + 15, 6, 6, P.metal); box(x, Y + 33, 6, 6, P.metal); }
      r(X + Wp / 2 - 3, Y + 12, 6, 3, P.metalLight);
      ctx.fillStyle = "#ffffff66";
      for (let i = 0; i < 4; i++) { const gx = X + 8 + i * (Wp / 4); for (let k = 0; k < 10; k++) ctx.fillRect(gx + k, Y + Hp - 4 - k, 1, 1); }
      r(X, Y + Hp - 2, Wp, 2, P.line);
      break;
    }
    case "vending":
      box(X + 1, Y - 2, Wp - 2, Hp + 2, P.metal);
      box(X + 3, Y + 1, Wp - 6, Hp - 12, P.glow);
      for (let y = Y + 3; y < Y + Hp - 12; y += 5) for (let x = X + 4; x < X + Wp - 4; x += 3) r(x, y, 2, 3, rand() > 0.5 ? P.accent : P.metal);
      r(X + 4, Y + Hp - 7, Wp - 8, 3, P.line);
      break;
    case "fridge":
      box(X, Y - 2, Wp, Hp + 2, P.metal);
      for (let i = 0; i < (p.w ?? 1); i += 2) {
        const fx = X + i * TILE + 2;
        box(fx, Y, 2 * TILE - 4, Hp - 4, P.glass);
        for (let y = Y + 3; y < Y + Hp - 6; y += 6) for (let x = fx + 2; x < fx + 2 * TILE - 6; x += 3) r(x, y, 2, 4, [P.accent, P.leafLight, P.glow, "#7fb3ff"][Math.floor(rand() * 4)]);
      }
      break;
    case "counter":
      box(X, Y, Wp, 8, P.wood);
      box(X, Y + 7, Wp, Hp - 7, P.metalLight);
      for (let x = X + 2; x < X + Wp - 2; x += 16) { r(x, Y + 9, 1, Hp - 11, P.line); r(x + 6, Y + 14, 4, 1, P.line); }
      if ((p.w ?? 1) >= 3) { box(X + 4, Y - 6, 12, 9, P.metalLight); r(X + 6, Y - 4, 6, 5, P.screen); box(X + Wp - 14, Y - 5, 8, 8, P.pot); }
      break;
    case "register":
      box(X + 2, Y - 5, 12, 9, P.metal); r(X + 4, Y - 3, 8, 4, P.screen); r(X + 5, Y - 2, 3, 1, P.leafLight);
      break;
    case "water":
      box(X + 4, Y + 4, 8, 11, P.pot);
      box(X + 5, Y - 5, 6, 10, "#9fd0ff"); r(X + 6, Y - 4, 1, 6, "#ffffff");
      break;
    case "copier":
      box(X + 1, Y, Wp - 2, Hp - 2, P.pot);
      box(X + 1, Y, Wp - 2, 8, P.metalLight);
      for (let y = Y + 12; y < Y + Hp - 4; y += 6) r(X + 3, y, Wp - 6, 1, P.line);
      r(X + 3, Y - 2, 8, 3, "#ffffff");
      break;
    case "cabinet":
      box(X + 1, Y, Wp - 2, Hp - 1, P.metal);
      for (let y = Y + 2; y < Y + Hp - 4; y += 7) for (let x = X + 3; x < X + Wp - 4; x += 16) { box(x, y, Math.min(12, Wp - 6), 6, P.metalLight); r(x + 4, y + 3, 4, 1, P.line); }
      break;
    case "shelf":
      box(X, Y - 4, Wp, Hp + 3, P.woodShade);
      for (let y = Y - 2; y < Y + Hp - 4; y += 8) {
        r(X + 1, y + 6, Wp - 2, 1, P.line);
        for (let x = X + 2; x < X + Wp - 3; x += 3) if (rand() > 0.2) r(x, y + 1 + Math.floor(rand() * 2), 2, 5 - Math.floor(rand() * 2), [P.glow, P.accent, P.metalLight, P.leafLight][Math.floor(rand() * 4)]);
      }
      break;
    case "stand":
      box(X, Y, Wp, Hp - 2, P.metalLight);
      for (let x = X + 2; x < X + Wp - 3; x += 4) { r(x, Y + 2, 3, 4, [P.accent, P.glow, P.leafLight, "#7fb3ff"][Math.floor(rand() * 4)]); r(x, Y + 8, 3, 4, [P.accent, P.glow, P.leafLight, "#ffb3d9"][Math.floor(rand() * 4)]); }
      break;
    case "sofa":
      box(X, Y - 2, Wp, Hp, P.metal);
      box(X + 3, Y + 2, Wp / 2 - 4, Hp - 7, P.metalLight); box(X + Wp / 2 + 1, Y + 2, Wp / 2 - 4, Hp - 7, P.metalLight);
      break;
    case "lamp":
      ctx.fillStyle = `${P.glow}55`; ctx.beginPath(); ctx.arc(X + 8, Y + 2, 14, 0, Math.PI * 2); ctx.fill();
      r(X + 7, Y - 2, 2, 16, P.line); box(X + 3, Y - 8, 10, 7, P.glow); r(X + 4, Y + 13, 8, 2, P.line);
      break;
    case "table":
      box(X + 1, Y + 1, Wp - 2, Hp - 3, P.wood);
      r(X + 3, Y + 3, Wp - 6, 2, P.woodShade);
      if ((p.h ?? 1) >= 2) for (let x = X + 6; x < X + Wp - 10; x += 14) { box(x, Y + 6, 10, 7, P.pot); r(x + 2, Y + 8, 6, 3, P.screen); }
      else box(X + Wp / 2 - 3, Y + 2, 6, 5, P.pot);
      break;
    case "chair":
      box(X + 3, Y + 1, 10, 10, P.metal); box(X + 5, Y + 3, 6, 6, P.metalLight); r(X + 7, Y + 11, 2, 3, P.line);
      break;
    case "board":
      box(X + 2, Y + 2, Wp - 4, Hp - 4, P.wood);
      for (let i = 0; i < (p.w ?? 1) * 3; i++) r(X + 4 + (i % ((p.w ?? 1) * 3)) * 5, Y + 4 + (i % 2) * 4, 4, 3, i % 3 ? P.glow : "#ffffff");
      break;
    case "window":
      box(X + 2, Y + 3, Wp - 4, Hp - 8, P.trim);
      for (let y = Y + 4; y < Y + Hp - 6; y++) r(X + 3, y, Wp - 6, 1, (y - Y) < Hp / 2 ? P.sky1 : P.sky2);
      r(X + Wp / 2, Y + 3, 1, Hp - 8, P.trim); r(X + 2, Y + Hp / 2, Wp - 4, 1, P.trim);
      r(X + 6, Y + 7, 6, 2, "#ffffff");
      break;
    case "whiteboard":
      box(X + 2, Y + 3, Wp - 4, Hp - 7, "#fbfbf6");
      ctx.fillStyle = "#5a7fd0";
      for (let i = 0; i < 4; i++) ctx.fillRect(X + 10 + i * 22, Y + 9 + (i % 2) * 6, 14 + (i % 3) * 3, 1);
      ctx.fillStyle = P.accent; ctx.fillRect(X + 18, Y + 20, 30, 1); ctx.fillRect(X + 70, Y + 8, 1, 10);
      r(X + 6, Y + Hp - 5, Wp - 12, 2, P.metal);
      break;
    case "locker":
      box(X, Y - 2, Wp, Hp + 2, P.metal);
      for (let x = X + 1; x < X + Wp - 1; x += 8) { r(x, Y, 1, Hp - 2, P.line); for (let y = Y + 3; y < Y + 12; y += 2) r(x + 2, y, 4, 1, P.metalLight); }
      break;
  }
}

/* ---------- 캐릭터 도트 (12×16, 부위별 조립) ----------
   머리(0~6줄) + 상체(7~11줄) + 하체(12~15줄)를 Look 설정에 맞게 골라 붙입니다.
   글자: h 머리 · s 피부 · e 눈 · g 안경 · c 셔츠 · t 넥타이 · j 재킷 · p 바지 · k 치마 · b 신발 */
type View = "down" | "up" | "side";
const HEADS: Record<string, Record<View, string[]>> = {
  short: {
    down: ["...hhhhhh...", "..hhhhhhhh..", "..hhhhhhhh..", "..hssssssh..", "..sesssses..", "..ssssssss..", "...ssssss..."],
    up: ["...hhhhhh...", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..shhhhhhs..", "...ssssss..."],
    side: ["...hhhhhh...", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhsssh..", "..hhhsssse..", "..hhssssss..", "...ssssss..."],
  },
  messy: {
    down: ["..h.hhhh.h..", "..hhhhhhhh..", ".hhhhhhhhhh.", "..hhsssshh..", "..sesssses..", "..ssssssss..", "...ssssss..."],
    up: ["..h.hhhh.h..", "..hhhhhhhh..", ".hhhhhhhhhh.", "..hhhhhhhh..", "..hhhhhhhh..", "..shhhhhhs..", "...ssssss..."],
    side: ["..h.hhhh.h..", "..hhhhhhhh..", ".hhhhhhhhhh.", "..hhhhhssh..", "..hhhsssse..", "..hhssssss..", "...ssssss..."],
  },
  spiky: {
    down: ["..h.hh.hh.h.", "..hhhhhhhh..", "..hhhhhhhh..", "..hssssssh..", "..sesssses..", "..ssssssss..", "...ssssss..."],
    up: ["..h.hh.hh.h.", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..shhhhhhs..", "...ssssss..."],
    side: ["..h.hh.hh.h.", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhsssh..", "..hhhsssse..", "..hhssssss..", "...ssssss..."],
  },
  bob: {
    down: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhsssssshh.", ".hsessssesh.", ".hssssssssh.", ".hhsssssshh."],
    up: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", "..hhhhhhhh.."],
    side: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhsssh..", ".hhhhsssse..", ".hhhhsssss..", ".hhh.ssss..."],
  },
  long: {
    down: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhsssssshh.", ".hsessssesh.", ".hssssssssh.", ".hhsssssshh."],
    up: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh."],
    side: ["...hhhhhh...", "..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhsssh..", ".hhhhsssse..", ".hhhhsssss..", ".hhhh.ssss.."],
  },
  bun: {
    down: ["....hhhh....", "..hhhhhhhh..", "..hhhhhhhh..", "..hssssssh..", "..sesssses..", "..ssssssss..", "...ssssss..."],
    up: ["....hhhh....", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhhhhh..", "..shhhhhhs..", "...ssssss..."],
    side: [".hhh........", "..hhhhhhhh..", "..hhhhhhhh..", "..hhhhsssh..", "..hhhsssse..", "..hhssssss..", "...ssssss..."],
  },
  curly: {
    down: ["..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhsssssshh.", ".hsessssesh.", ".hssssssssh.", "..hssssssh.."],
    up: ["..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhhhhh.", "..hssssssh.."],
    side: ["..hhhhhhhh..", ".hhhhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhssshh.", ".hhhhsssse..", ".hhhhsssss..", "..hh.ssss..."],
  },
};
/* 긴머리: 어깨 아래까지 머리카락을 덮어 그림 (상체 줄 위에 덧칠) */
const LONG_HAIR: Record<View, string[]> = {
  down: [".hh......hh.", ".hh......hh.", ".h........h."],
  up: [".hhhhhhhhhh.", ".hhhhhhhhhh.", "..hhhhhhhh.."],
  side: [".hhh........", ".hhh........", "..hh........"],
};
const TORSO: Record<View, string[]> = {
  down: ["..jjcttcjj..", ".jjjcttcjjj.", ".jjjjttjjjj.", ".sjjjjjjjjs.", "...jjjjjj..."],
  up: ["..jjjjjjjj..", ".jjjjjjjjjj.", ".jjjjjjjjjj.", ".sjjjjjjjjs.", "...jjjjjj..."],
  side: ["...jjjjcj...", "..jjjjjcj...", "..jjjsjjj...", "..jjjsjjj...", "...jjjjjj..."],
};
const LEGS: Record<string, Record<View, string[][]>> = {
  pants: {
    down: [["...pppppp...", "...pp..pp...", "...pp..pp...", "...bb..bb..."], ["...pppppp...", "...pp..pp...", "...pp...pp..", "...bb...bb.."]],
    up: [["...pppppp...", "...pp..pp...", "...pp..pp...", "...bb..bb..."], ["...pppppp...", "...pp..pp...", "..pp...pp...", "..bb...bb..."]],
    side: [["...pppppp...", "...pp.pp....", "...pp.pp....", "...bb.bb...."], ["...pppppp...", "..pp...pp...", ".pp.....pp..", ".bb.....bb.."]],
  },
  skirt: {
    down: [["...kkkkkk...", "...kkkkkk...", "....s..s....", "....b..b...."], ["...kkkkkk...", "...kkkkkk...", "...s....s...", "...b....b..."]],
    up: [["...kkkkkk...", "...kkkkkk...", "....s..s....", "....b..b...."], ["...kkkkkk...", "...kkkkkk...", "...s....s...", "...b....b..."]],
    side: [["...kkkkkk...", "...kkkkk....", "....s.s.....", "....b.b....."], ["...kkkkkk...", "...kkkkk....", "...s...s....", "...b...b...."]],
  },
  longskirt: {
    down: [["..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "...bb..bb..."], ["..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "..bb....bb.."]],
    up: [["..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "...bb..bb..."], ["..kkkkkkkk..", "..kkkkkkkk..", "..kkkkkkkk..", "..bb....bb.."]],
    side: [["..kkkkkkk...", "..kkkkkkk...", "..kkkkkkk...", "...bb.bb...."], ["..kkkkkkk...", "..kkkkkkk...", "..kkkkkkk...", "..bb...bb..."]],
  },
};

const spriteCache = new Map<string, HTMLCanvasElement>();
function sprite(look: Look, dir: Dir, frame: number, outline: string) {
  const key = `${JSON.stringify(look)}|${dir}|${frame}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;
  const view: View = dir === "left" || dir === "right" ? "side" : dir;
  const style = look.hairStyle ?? "short";
  const head = [...HEADS[style][view]];
  /* 안경: 눈 줄을 안경테로 바꿔 그림 (짧은머리·부스스 머리 기준) */
  if (look.glasses && view === "down") head[4] = "..gegssgeg..";
  if (look.glasses && view === "side") head[4] = "..hhhsssgeg.";
  const rows = [...head, ...TORSO[view], ...LEGS[look.bottom ?? "pants"][view][frame ? 1 : 0]];
  const colors: Record<string, string> = {
    h: look.hair, s: look.skin, e: "#2a2230", g: "#14122e", c: look.shirt, t: look.tie, j: look.jacket ?? look.shirt,
    p: look.pants, k: look.pants, b: look.shoes ?? "#2a2230",
  };
  const { canvas, ctx } = makeCanvas(14, 18);
  const put = (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect((dir === "left" ? 11 - x : x) + 1, y + 1, 1, 1); };
  rows.forEach((row, y) => Array.from(row).forEach((ch, x) => {
    if (ch === ".") return;
    let color = colors[ch];
    /* 무늬(호피 등): 셔츠 부분에 점점이 */
    if (look.pattern && (ch === "j" || ch === "c") && !look.jacket && (x * 3 + y * 2) % 5 === 0) color = look.pattern;
    put(x, y, color);
  }));
  if (style === "long" || style === "bob") {
    LONG_HAIR[view].slice(0, style === "long" ? 3 : 1).forEach((row, i) => Array.from(row).forEach((ch, x) => { if (ch === "h") put(x, 7 + i, look.hair); }));
  }
  /* 외곽선 */
  const img = ctx.getImageData(0, 0, 14, 18);
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < 14 && y < 18 && img.data[(y * 14 + x) * 4 + 3] > 0;
  const edges: [number, number][] = [];
  for (let y = 0; y < 18; y++) for (let x = 0; x < 14; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edges.push([x, y]);
  ctx.fillStyle = outline;
  edges.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
  spriteCache.set(key, canvas);
  return canvas;
}

/* NPC 한 명(커플이면 두 명)을 그림 */
function drawPerson(ctx: CanvasRenderingContext2D, look: Look, dir: Dir, frame: number, px: number, py: number, bob: number, outline: string) {
  ctx.fillStyle = "#00000033"; ctx.fillRect(Math.round(px) + 3, TOP + Math.round(py) + 12, 10, 3);
  ctx.drawImage(sprite(look, dir, frame, outline), Math.round(px) + 1, TOP + Math.round(py) - 4 - bob);
}

/* ---------- 화면 ---------- */
type Actor = { x: number; y: number; px: number; py: number; dir: Dir; moving: boolean; from: [number, number]; t0: number };
/* NPC: 자기 자리(home) 근처 2칸 안에서 쉬엄쉬엄 돌아다님. w=2면 두 칸(커플) */
type Walker = Actor & { homeX: number; homeY: number; w: number; next: number };
const NPC_STEP_MS = 320;
const WANDER_RADIUS = 2;
const npcPositions: Record<string, { x: number; y: number; dir: Dir }[]> = {};

function makeWalkers(mapId: string): Walker[] {
  const saved = npcPositions[mapId];
  return MAPS[mapId].npcs.map((n, i) => {
    const s = saved?.[i] ?? n;
    return { x: s.x, y: s.y, px: s.x * TILE, py: s.y * TILE, dir: s.dir, moving: false, from: [s.x, s.y], t0: 0, homeX: n.x, homeY: n.y, w: n.partner ? 2 : 1, next: 800 + i * 700 };
  });
}

export default function MapScreen({ mapId, save, onChangeMap, onTalk, onTitle, onTone }: MapProps) {
  const def = MAPS[mapId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef<Actor | null>(null);
  const walkers = useRef<Walker[]>(makeWalkers(mapId));
  const tagRefs = useRef<(HTMLDivElement | null)[]>([]);
  const held = useRef<Dir[]>([]);
  const tapped = useRef<Dir | null>(null);
  const [near, setNear] = useState<number | null>(null);
  const [bubble, setBubble] = useState<{ npc: number; text: string; sub?: string } | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const ui = useRef({ menu, bubble, near });
  ui.current = { menu, bubble, near };

  const statusOf = (level: number) => {
    const unlocked = save.unlocked[mapId] ?? 0;
    if (level > unlocked) return "locked";
    if (level < unlocked || (level === 2 && save.certificates[mapId])) return "cleared";
    return "open";
  };

  /* 맵 그리기 + 이동 루프 */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const stat = makeCanvas(W, H); drawStatic(stat.ctx, def);
    walkers.current = makeWalkers(mapId);
    const start = lastPosition[mapId] ?? def.start;
    player.current = { x: start.x, y: start.y, px: start.x * TILE, py: start.y * TILE, dir: start.dir, moving: false, from: [start.x, start.y], t0: 0 };
    setNear(null); setBubble(null); setMenu(null);

    const blocked = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => y <= 1 || y >= ROWS - 1 || x === 0 || x === COLS - 1));
    const doors = new Set<string>();
    def.props.forEach((p) => {
      if (p.t === "door") { for (let i = 0; i < (p.w ?? 1); i++) doors.add(`${p.x + i},${p.y}`); return; }
      if (p.walk) return;
      for (let y = p.y; y < p.y + (p.h ?? 1); y++) for (let x = p.x; x < p.x + (p.w ?? 1); x++) if (blocked[y]) blocked[y][x] = true;
    });
    const free = (x: number, y: number) => !blocked[y]?.[x] && !doors.has(`${x},${y}`) && x >= 0 && x < COLS;
    /* (x,y) 칸에 서 있는(또는 그 칸으로 오가는 중인) NPC 번호, 없으면 -1 */
    const npcAt = (x: number, y: number, except = -1) => walkers.current.findIndex((n, i) => i !== except && y === n.y && x >= n.x && x < n.x + n.w
      || i !== except && n.moving && y === n.from[1] && x >= n.from[0] && x < n.from[0] + n.w);
    const playerOn = (x: number, y: number) => { const p = player.current!; return (p.x === x && p.y === y) || (p.moving && p.from[0] === x && p.from[1] === y); };

    let lastNear: number | null = null;
    const updateNear = () => {
      const p = player.current!;
      const [dx, dy] = DELTA[p.dir];
      const facing = npcAt(p.x + dx, p.y + dy);
      const value = facing >= 0 ? facing : null;
      if (value !== lastNear) { lastNear = value; setNear(value); }
    };
    updateNear();

    const stepWalker = (n: Walker, i: number, time: number) => {
      if (n.moving) {
        const k = Math.min(1, (time - n.t0) / NPC_STEP_MS);
        n.px = (n.from[0] + (n.x - n.from[0]) * k) * TILE;
        n.py = (n.from[1] + (n.y - n.from[1]) * k) * TILE;
        if (k >= 1) {
          n.moving = false; n.px = n.x * TILE; n.py = n.y * TILE;
          npcPositions[mapId] = walkers.current.map((w) => ({ x: w.x, y: w.y, dir: w.dir }));
          updateNear();
        }
        return;
      }
      if (time < n.next) return;
      n.next = time + 1400 + Math.random() * 2600;
      /* 말 거는 중·메뉴 열림·플레이어가 바로 옆이면 멈춰 있음 */
      const p = player.current!;
      const close = Math.abs(p.x - n.x) <= n.w && Math.abs(p.y - n.y) <= 1;
      if (ui.current.menu !== null || ui.current.bubble?.npc === i || close) return;
      const dirs: Dir[] = ["up", "down", "left", "right"];
      const dir = dirs[Math.floor(Math.random() * 4)];
      n.dir = dir;
      if (Math.random() < 0.3) return; /* 가끔은 고개만 돌림 */
      const [dx, dy] = DELTA[dir];
      const nx = n.x + dx, ny = n.y + dy;
      if (Math.abs(nx - n.homeX) > WANDER_RADIUS || Math.abs(ny - n.homeY) > WANDER_RADIUS) return;
      for (let k = 0; k < n.w; k++) if (!free(nx + k, ny) || npcAt(nx + k, ny, i) >= 0 || playerOn(nx + k, ny)) return;
      n.from = [n.x, n.y]; n.x = nx; n.y = ny; n.moving = true; n.t0 = time;
      if (lastNear === i) updateNear();
    };

    let raf = 0;
    const loop = (time: number) => {
      const p = player.current!;
      if (p.moving) {
        const k = Math.min(1, (time - p.t0) / STEP_MS);
        p.px = (p.from[0] + (p.x - p.from[0]) * k) * TILE;
        p.py = (p.from[1] + (p.y - p.from[1]) * k) * TILE;
        if (k >= 1) { p.moving = false; lastPosition[mapId] = { x: p.x, y: p.y, dir: p.dir }; updateNear(); }
      }
      /* 꾹 누르면 계속 걷고, 짧게 톡 누르면 한 칸 */
      const dir = held.current[held.current.length - 1] ?? tapped.current;
      if (!p.moving) tapped.current = null;
      if (!p.moving && dir && ui.current.menu === null && !ui.current.bubble) {
        const turned = p.dir !== dir;
        p.dir = dir;
        const [dx, dy] = DELTA[dir];
        const nx = p.x + dx, ny = p.y + dy;
        if (doors.has(`${nx},${ny}`)) { held.current = []; setMenu(Math.max(0, MAP_IDS.indexOf(mapId))); onTone(520, 0.06); }
        else if (!blocked[ny]?.[nx] && npcAt(nx, ny) < 0) { p.from = [p.x, p.y]; p.x = nx; p.y = ny; p.moving = true; p.t0 = time; lastNear = null; setNear(null); }
        else if (turned) { lastPosition[mapId] = { x: p.x, y: p.y, dir: p.dir }; updateNear(); }
      }
      walkers.current.forEach((n, i) => stepWalker(n, i, time));

      ctx.drawImage(stat.canvas, 0, 0);
      const line = def.palette.line;
      const drawList: { py: number; draw: () => void }[] = [];
      walkers.current.forEach((n, i) => {
        const frame = n.moving ? Math.floor(time / (NPC_STEP_MS / 2)) % 2 : 0;
        const npc = def.npcs[i];
        drawList.push({ py: n.py, draw: () => drawPerson(ctx, npc.look, n.dir, frame, n.px, n.py, 0, line) });
        if (npc.partner) drawList.push({ py: n.py + 0.1, draw: () => drawPerson(ctx, npc.partner!, n.dir, frame, n.px + TILE, n.py, 0, line) });
        const tag = tagRefs.current[i];
        if (tag) { tag.style.left = `${(n.px + n.w * TILE / 2) / W * 100}%`; tag.style.top = `${(TOP + n.py - 5) / H * 100}%`; }
      });
      const walkFrame = p.moving ? Math.floor(time / (STEP_MS / 2)) % 2 : 0;
      drawList.push({ py: p.py, draw: () => drawPerson(ctx, playerLook(), p.dir, walkFrame, p.px, p.py, walkFrame, line) });
      drawList.sort((a, b) => a.py - b.py).forEach((d) => d.draw());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mapId]);

  /* 키 입력 */
  useEffect(() => {
    const talk = (index: number) => {
      const p = player.current!;
      const opposite: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
      walkers.current[index].dir = opposite[p.dir];
      walkers.current[index].next = performance.now() + 4000;
      if (statusOf(index) === "locked") {
        onTone(200, 0.08);
        setBubble({ npc: index, text: npcText(mapId, index).locked, sub: Text.map.lockedHint.replace("{level}", Text.ui.difficultyShort[index - 1]) });
      } else { onTone(760, 0.1); onTalk(mapId, index); }
    };
    const menuItems = [...MAP_IDS, "title"];
    const choose = (index: number) => {
      const item = menuItems[index];
      setMenu(null);
      if (item === "title") onTitle();
      else if (item !== mapId) { onTone(660, 0.08); onChangeMap(item); }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const { menu: openMenu, bubble: openBubble, near: facing } = ui.current;
      const dir = KEY_DIR[event.code];
      if (openMenu !== null) {
        if (event.repeat) return;
        if (dir === "up" || dir === "down") { event.preventDefault(); setMenu((openMenu + (dir === "down" ? 1 : menuItems.length - 1)) % menuItems.length); onTone(520, 0.04); }
        else if (event.code === "Enter" || event.code === "Space") { event.preventDefault(); choose(openMenu); }
        else if (event.code === "Escape") { event.preventDefault(); setMenu(null); }
        return;
      }
      if (dir) { event.preventDefault(); held.current = [...held.current.filter((d) => d !== dir), dir]; if (!event.repeat) tapped.current = dir; if (openBubble) setBubble(null); return; }
      if (event.repeat) return;
      if (event.code === "Escape") { event.preventDefault(); held.current = []; setBubble(null); setMenu(Math.max(0, MAP_IDS.indexOf(mapId))); return; }
      if (event.code === "Space" || event.code === "Enter") {
        event.preventDefault();
        if (openBubble) setBubble(null);
        else if (facing !== null) talk(facing);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => { const dir = KEY_DIR[event.code]; if (dir) held.current = held.current.filter((d) => d !== dir); };
    const onBlur = () => { held.current = []; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur); };
  });

  const at = (x: number, y: number, w = 1, lift = 0) => ({ left: `${((x + w / 2) * TILE) / W * 100}%`, top: `${(TOP + y * TILE - lift) / H * 100}%` });
  const scenario = (Text.scenarios as any)[mapId];
  const bubbleNpc = bubble ? walkers.current[bubble.npc] : null;

  return (
    <section className="map-scene">
      <canvas ref={canvasRef} className="map-canvas" width={W} height={H} aria-label={scenario.name} />

      {def.npcs.map((n, i) => {
        const state = statusOf(i);
        const isNear = near === i && !bubble;
        const w = walkers.current[i] ?? { x: n.x, y: n.y, w: 1 };
        return (
          <div key={i} ref={(el) => { tagRefs.current[i] = el; }} className={`npc-tag ${state}${isNear ? " near" : ""}`} style={at(w.x, w.y, w.w, 5)}>
            {isNear
              ? <span className="npc-plate"><b>{npcText(mapId, i).name}</b><i>{Text.ui.difficultyShort[i]}</i>{state !== "locked" && <kbd>{Text.map.talk}</kbd>}</span>
              : <span className="npc-mark">{state === "locked" ? <LockIcon /> : state === "cleared" ? "✓" : "!"}</span>}
          </div>
        );
      })}

      {bubble && bubbleNpc && (
        <div className="npc-bubble" style={at(bubbleNpc.x, bubbleNpc.y, bubbleNpc.w, 6)}>
          <b>{npcText(mapId, bubble.npc).name}</b>
          <p>{bubble.text}</p>
          {bubble.sub && <small>🔒 {bubble.sub}</small>}
        </div>
      )}

      <div className="map-hud">
        <div className="map-place"><b>{scenario.name}</b><span>{scenario.setting}</span></div>
        <div className="map-hint">{Text.map.hint}</div>
      </div>

      {menu !== null && (
        <div className="map-menu-backdrop" onClick={() => setMenu(null)}>
          <div className="map-menu" data-ui onClick={(e) => e.stopPropagation()}>
            <h3>{Text.map.menuTitle}</h3>
            {[...MAP_IDS, "title"].map((id, i) => (
              <button key={id} className={menu === i ? "selected" : ""} onMouseEnter={() => setMenu(i)} onClick={() => { setMenu(null); if (id === "title") onTitle(); else if (id !== mapId) onChangeMap(id); }}>
                <span className="map-menu-cursor">{menu === i ? "▶" : ""}</span>
                {id === "title" ? Text.map.toTitle : (Text.scenarios as any)[id].name}
                {id === mapId && <small>{Text.map.here}</small>}
              </button>
            ))}
            <p>{Text.map.menuHint}</p>
          </div>
        </div>
      )}
    </section>
  );
}

/* 타이틀 배경용: 맵과 사람들을 그대로 그리되 움직이지는 않음 (NPC만 가끔 들썩) */
export function MapBackdrop({ mapId, people = true }: { mapId: string; people?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const def = MAPS[mapId];
    if (!canvas || !def) return;
    const ctx = canvas.getContext("2d")!;
    const stat = makeCanvas(W, H); drawStatic(stat.ctx, def);
    const p = lastPosition[mapId] ?? def.start;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = -1;
    const draw = (time: number) => {
      const tick = still ? 0 : Math.floor(time / 600);
      if (tick !== last) {
        last = tick;
        ctx.drawImage(stat.canvas, 0, 0);
        if (people) {
          const saved = npcPositions[mapId];
          const list: { look: Look; dir: Dir; x: number; y: number; frame: number }[] = [];
          def.npcs.forEach((n, i) => {
            const s = saved?.[i] ?? n;
            const frame = (tick + i) % 4 === 0 ? 1 : 0;
            list.push({ look: n.look, dir: s.dir, x: s.x, y: s.y, frame });
            if (n.partner) list.push({ look: n.partner, dir: s.dir, x: s.x + 1, y: s.y + 0.01, frame });
          });
          list.push({ look: playerLook(), dir: p.dir, x: p.x, y: p.y, frame: 0 });
          list.sort((a, b) => a.y - b.y).forEach((a) => drawPerson(ctx, a.look, a.dir, a.frame, a.x * TILE, Math.round(a.y) * TILE, 0, def.palette.line));
        }
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mapId, people]);
  return <canvas ref={ref} className="map-canvas" width={W} height={H} aria-hidden />;
}

/* 상대(레벨별 NPC) 자리를 중심으로 맵을 확대 — 인트로·대결 화면 배경 */
export function MapCloseup({ mapId, level = 0 }: { mapId: string; level?: number }) {
  const npc = MAPS[mapId].npcs[level] ?? MAPS[mapId].npcs[0];
  const px = ((npc.x + 0.5) * TILE) / W * 100;
  const py = (TOP + npc.y * TILE) / H * 100;
  return <div className="map-closeup" style={{ transform: `translate(-${px}%, -${py}%)` }}><MapBackdrop mapId={mapId} people={false} /></div>;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 7 8" width="10" height="12" shapeRendering="crispEdges" aria-hidden>
      <rect x="1" y="0" width="5" height="1" fill="currentColor" /><rect x="1" y="0" width="1" height="4" fill="currentColor" /><rect x="5" y="0" width="1" height="4" fill="currentColor" />
      <rect x="0" y="3" width="7" height="5" fill="currentColor" /><rect x="3" y="5" width="1" height="2" fill="#2a2230" />
    </svg>
  );
}
