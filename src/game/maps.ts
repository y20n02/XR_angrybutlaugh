import Text from "../locales/ko.json";

/* 픽셀 맵 데이터. 맵 하나 = 가로 24칸 × 세로 13칸 (한 칸 16px).
   - 0~1번 줄은 벽, 0·23번 칸과 12번 줄은 테두리라 못 지나갑니다.
   - props: 가구. walk: true 인 것(러그 등)만 밟고 지나갈 수 있습니다.
   - npcs: 순서대로 하·중·상 상대. 이름과 대사는 ko.json의 map.maps에서 고칩니다. */
export type Dir = "down" | "up" | "left" | "right";
export type PropType =
  | "door" | "desk" | "plant" | "glassroom" | "vending" | "counter" | "water" | "copier" | "cabinet"
  | "shelf" | "sofa" | "rug" | "lamp" | "table" | "board" | "window" | "whiteboard" | "locker"
  | "fridge" | "register" | "stand" | "chair";
export type Prop = { t: PropType; x: number; y: number; w?: number; h?: number; walk?: boolean };
/* 도트 캐릭터 외형 (MapScreen의 sprite()가 부위별로 조립)
   hairStyle: short 짧은머리 · messy 부스스 · spiky 삐죽 · bob 단발 · long 긴머리 · bun 올림머리 · curly 파마
   jacket: 재킷/겉옷 색(없으면 셔츠만) · bottom: pants 바지 · skirt 치마 · longskirt 롱스커트 · pattern: 상의 무늬 색 */
export type Look = {
  hair: string; skin: string; shirt: string; tie: string; pants: string;
  hairStyle?: "short" | "messy" | "spiky" | "bob" | "long" | "bun" | "curly";
  glasses?: boolean; jacket?: string; bottom?: "pants" | "skirt" | "longskirt"; shoes?: string; pattern?: string;
};
export type Palette = {
  ceiling: string; light: string; wallTop: string; wall: string; trim: string; floor: string; floorAlt: string;
  line: string; wood: string; woodShade: string; metal: string; metalLight: string; screen: string; glow: string;
  leaf: string; leafLight: string; pot: string; glass: string; rug: string; accent: string; sky1: string; sky2: string;
};
export type MapDef = {
  palette: Palette;
  rightWindow: boolean;
  props: Prop[];
  /* partner: 옆 칸에 함께 서 있는 사람(커플 진상). 두 칸을 같이 차지하고 함께 움직임 */
  npcs: { x: number; y: number; dir: Dir; look: Look; partner?: Look }[];
  start: { x: number; y: number; dir: Dir };
};

export const COLS = 24;
export const ROWS = 13;
export const TILE = 16;

/* 주인공 도트 색: 고른 주인공(f/m) 그림에 맞춤 */
export type Gender = "f" | "m";
const PLAYER_LOOKS: Record<Gender, Look> = {
  f: { hairStyle: "bob", hair: "#3a2a24", skin: "#f1c39c", shirt: "#9ea6dc", tie: "#9ea6dc", pants: "#2a2d4a", shoes: "#ece6dc" },
  m: { hairStyle: "short", hair: "#3a2a24", skin: "#f1c39c", shirt: "#ece6e6", tie: "#ece6e6", pants: "#b39c7c", shoes: "#ece6dc" },
};
let currentLook: Look = PLAYER_LOOKS.f;
export function setPlayerGender(gender: Gender) { currentLook = PLAYER_LOOKS[gender]; }
export function playerLook(): Look { return currentLook; }

const OFFICE: Palette = {
  ceiling: "#3b3c86", light: "#fff1c9", wallTop: "#6c6ec2", wall: "#8284d2", trim: "#4a4b98", floor: "#a2a4e2", floorAlt: "#9395d8",
  line: "#2b2a5a", wood: "#f3e5c3", woodShade: "#d6c39b", metal: "#6f71c2", metalLight: "#a3a5ea", screen: "#2e3466", glow: "#f7e7b5",
  leaf: "#5f9a6a", leafLight: "#8cc490", pot: "#eceaf7", glass: "#c9cdf6", rug: "#eadba9", accent: "#f2b56b", sky1: "#f6c27e", sky2: "#a77fc9",
};
const SCHOOL: Palette = {
  ceiling: "#5a4636", light: "#fff4d6", wallTop: "#8fb59a", wall: "#a9cdb0", trim: "#5d7f66", floor: "#d9b98a", floorAlt: "#cba978",
  line: "#3a2a22", wood: "#c98f5a", woodShade: "#a8703f", metal: "#7d8fa8", metalLight: "#b5c4d6", screen: "#2f3b4f", glow: "#fff0c4",
  leaf: "#4f9a52", leafLight: "#86c67a", pot: "#f1e9dc", glass: "#d6ecf2", rug: "#e9c6a0", accent: "#ef8a5b", sky1: "#9fd3f5", sky2: "#d9f0fb",
};
const SHOP: Palette = {
  ceiling: "#2f5c63", light: "#f4fff9", wallTop: "#e9e3d3", wall: "#f5f0e3", trim: "#7aa9a5", floor: "#d4e6e3", floorAlt: "#c3dad6",
  line: "#22393d", wood: "#e8c99a", woodShade: "#c9a46f", metal: "#5f9c98", metalLight: "#a8d6cf", screen: "#23353a", glow: "#fff4cf",
  leaf: "#4f9a6a", leafLight: "#8ccc98", pot: "#ffffff", glass: "#d7f3f6", rug: "#f1d8a6", accent: "#ff7a7a", sky1: "#3a4a7a", sky2: "#e98a6b",
};

export const MAPS: Record<string, MapDef> = {
  office: {
    palette: OFFICE,
    rightWindow: true,
    start: { x: 4, y: 2, dir: "down" },
    props: [
      { t: "rug", x: 18, y: 5, w: 4, h: 5, walk: true },
      { t: "door", x: 3, y: 1, w: 2, h: 1 },
      { t: "plant", x: 1, y: 2 }, { t: "plant", x: 6, y: 2 },
      { t: "glassroom", x: 8, y: 1, w: 6, h: 3 },
      { t: "vending", x: 15, y: 1, w: 1, h: 2 }, { t: "plant", x: 16, y: 2 },
      { t: "counter", x: 17, y: 1, w: 3, h: 2 }, { t: "board", x: 20, y: 0, w: 2, h: 1 }, { t: "water", x: 21, y: 2 },
      { t: "board", x: 1, y: 4, w: 1, h: 1 }, { t: "copier", x: 1, y: 6, w: 1, h: 2 }, { t: "cabinet", x: 1, y: 8 },
      { t: "desk", x: 4, y: 5, w: 5, h: 2 }, { t: "desk", x: 11, y: 5, w: 5, h: 2 },
      { t: "desk", x: 4, y: 9, w: 5, h: 2 }, { t: "desk", x: 11, y: 9, w: 5, h: 2 },
      { t: "plant", x: 9, y: 6 }, { t: "plant", x: 9, y: 10 },
      { t: "sofa", x: 19, y: 6, w: 2, h: 1 }, { t: "lamp", x: 21, y: 6 }, { t: "table", x: 19, y: 8, w: 2, h: 1 },
      { t: "shelf", x: 1, y: 11, w: 2, h: 2 }, { t: "shelf", x: 7, y: 12, w: 3, h: 1 }, { t: "cabinet", x: 10, y: 12, w: 3, h: 1 },
      { t: "shelf", x: 13, y: 12, w: 2, h: 1 }, { t: "cabinet", x: 20, y: 11, w: 2, h: 2 },
    ],
    npcs: [
      { x: 6, y: 7, dir: "down", look: { hairStyle: "short", hair: "#1f1a24", skin: "#f1c39c", shirt: "#ece8ee", tie: "#26305a", pants: "#5a5a62" } },
      { x: 14, y: 8, dir: "left", look: { hairStyle: "short", glasses: true, hair: "#1f1a24", skin: "#f1c39c", jacket: "#2a2830", shirt: "#ece8ee", tie: "#1a1820", pants: "#2a2830" } },
      { x: 20, y: 9, dir: "left", look: { hairStyle: "bun", hair: "#3a2a24", skin: "#f1c39c", jacket: "#2a2428", shirt: "#cdb69a", tie: "#cdb69a", pants: "#2a2428", bottom: "skirt" } },
    ],
  },
  team: {
    palette: SCHOOL,
    rightWindow: false,
    start: { x: 3, y: 2, dir: "down" },
    props: [
      { t: "door", x: 2, y: 1, w: 2, h: 1 },
      { t: "window", x: 5, y: 0, w: 2, h: 2 }, { t: "whiteboard", x: 8, y: 0, w: 8, h: 2 }, { t: "window", x: 17, y: 0, w: 2, h: 2 },
      { t: "plant", x: 20, y: 2 }, { t: "locker", x: 21, y: 1, w: 2, h: 3 },
      { t: "shelf", x: 1, y: 3, w: 1, h: 3 }, { t: "plant", x: 1, y: 7 },
      { t: "rug", x: 4, y: 4, w: 16, h: 8, walk: true },
      { t: "table", x: 5, y: 5, w: 5, h: 2 }, { t: "table", x: 14, y: 5, w: 5, h: 2 },
      { t: "table", x: 5, y: 9, w: 5, h: 2 }, { t: "table", x: 14, y: 9, w: 5, h: 2 },
      { t: "chair", x: 4, y: 5 }, { t: "chair", x: 4, y: 9 }, { t: "chair", x: 19, y: 6 }, { t: "chair", x: 19, y: 10 },
      { t: "cabinet", x: 21, y: 6, w: 2, h: 2 }, { t: "plant", x: 22, y: 9 },
      { t: "shelf", x: 1, y: 11, w: 3, h: 2 }, { t: "shelf", x: 9, y: 12, w: 6, h: 1 }, { t: "cabinet", x: 19, y: 11, w: 3, h: 2 },
    ],
    npcs: [
      { x: 7, y: 7, dir: "down", look: { hairStyle: "messy", hair: "#8a6a44", skin: "#f1c39c", jacket: "#2e2c34", shirt: "#8e8c94", tie: "#8e8c94", pants: "#5a6a86", shoes: "#e6e2dc" } },
      { x: 16, y: 8, dir: "left", look: { hairStyle: "bun", hair: "#d9bf7a", skin: "#f1c39c", shirt: "#cdb08e", tie: "#cdb08e", pants: "#8ea0bc", shoes: "#ece8e2" } },
      { x: 12, y: 3, dir: "down", look: { hairStyle: "messy", glasses: true, hair: "#1f1a24", skin: "#f1c39c", shirt: "#8a8488", tie: "#8a8488", pants: "#25232a", shoes: "#e6e2dc" } },
    ],
  },
  shop: {
    palette: SHOP,
    rightWindow: true,
    start: { x: 18, y: 4, dir: "down" },
    props: [
      { t: "door", x: 3, y: 1, w: 2, h: 1 },
      { t: "fridge", x: 7, y: 1, w: 8, h: 2 }, { t: "plant", x: 16, y: 2 },
      { t: "shelf", x: 1, y: 3, w: 1, h: 4 },
      { t: "stand", x: 4, y: 5, w: 6, h: 1 }, { t: "stand", x: 4, y: 8, w: 6, h: 1 }, { t: "stand", x: 4, y: 11, w: 6, h: 1 },
      { t: "counter", x: 16, y: 6, w: 5, h: 2 }, { t: "register", x: 17, y: 6 }, { t: "cabinet", x: 21, y: 3, w: 1, h: 3 },
      { t: "rug", x: 15, y: 9, w: 7, h: 2, walk: true },
      { t: "water", x: 12, y: 6 }, { t: "plant", x: 12, y: 11 }, { t: "stand", x: 16, y: 12, w: 4, h: 1 },
    ],
    npcs: [
      { x: 11, y: 4, dir: "down", look: { hairStyle: "long", hair: "#3a2a24", skin: "#f1c39c", shirt: "#e6d7bc", tie: "#e6d7bc", pants: "#5a4434", bottom: "longskirt", shoes: "#5a4a44" }, partner: { hairStyle: "messy", hair: "#1f1a24", skin: "#f1c39c", shirt: "#2a2428", tie: "#2a2428", pants: "#6a7690", shoes: "#e6e2dc" } },
      { x: 11, y: 9, dir: "left", look: { hairStyle: "curly", hair: "#5a3a26", skin: "#e9b88f", shirt: "#b0844a", pattern: "#4a2e1a", tie: "#8a2a34", pants: "#25232a" } },
      { x: 18, y: 9, dir: "up", look: { hairStyle: "spiky", hair: "#1f1a24", skin: "#d9a07a", jacket: "#2a2428", shirt: "#9a8678", tie: "#9a8678", pants: "#6a5240", shoes: "#4a3024" } },
    ],
  },
};

type NpcText = { name: string; locked: string; role?: string; profile?: string; habit?: string; tip?: string };
export function npcText(mapId: string, level: number): NpcText {
  return (Text.map.maps as Record<string, { npcs: NpcText[] }>)[mapId].npcs[level];
}

/* 대결·소개 화면에 나오는 상대 이름: 맵 NPC 이름을 따름 */
export function opponentName(mapId: string, level: number): string {
  return npcText(mapId, level)?.name ?? (Text.scenarios as any)[mapId].opponent;
}
