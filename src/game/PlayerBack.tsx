import Assets from "../assets.json";

/* 대결 화면 앞쪽에 보이는 플레이어 뒷모습. 상황(kind)마다 옷만 달라집니다. */
const OUTLINE = "#16131c";
const CLOTHES: Record<string, { base: string; shade: string; light: string }> = {
  office: { base: "#3a4254", shade: "#262c3a", light: "#5a6680" },
  team: { base: "#39506b", shade: "#263a50", light: "#5f7c9c" },
  shop: { base: "#b9b2a3", shade: "#8a8476", light: "#dcd6c8" },
};

function PlayerBack({ kind, gender }: { kind: string; gender?: "f" | "m" | null }) {
  const cloth = CLOTHES[kind] ?? CLOTHES.office;
  /* 주인공을 골랐으면 그 주인공의 뒷모습 그림을 씀 */
  let picked = gender;
  if (picked === undefined) { try { picked = localStorage.getItem("time-to-get-mad-player-v1") as "f" | "m" | null; } catch { picked = null; } }
  const art = picked ? (Assets as any).players?.[picked]?.back : null;
  if (art) return <div className="player-back has-art" aria-hidden="true"><img src={art} alt="" draggable={false} /></div>;
  return (
    <div className="player-back" aria-hidden="true">
      <svg viewBox="0 0 400 720" xmlns="http://www.w3.org/2000/svg">
        <g stroke={OUTLINE} strokeWidth="5" strokeLinejoin="round">
          <path d="M28 720V520C34 372 92 296 152 278L248 278C308 296 366 372 372 520V720Z" fill={cloth.base} />
          <path d="M300 300C344 334 366 410 372 520V718H286V520C300 430 306 360 300 300Z" fill={cloth.shade} stroke="none" />
          <path d="M60 470C78 396 108 350 146 330C124 380 106 450 98 560C84 540 70 510 60 470Z" fill={cloth.shade} stroke="none" />
          <path d="M84 342C104 314 130 296 156 286L154 302C130 310 108 326 94 350Z" fill={cloth.light} stroke="none" />
          <path d="M240 372C262 420 268 500 258 600C276 540 280 440 240 372ZM150 420C138 480 136 560 146 640C126 570 128 480 150 420Z" fill={cloth.shade} stroke="none" />
          <path d="M163 205H237V292H163Z" fill="#d29372" />
          <path d="M163 205H237V246C216 272 184 272 163 246Z" fill="#a8654f" stroke="none" />
          {kind === "office" && <>
            <path d="M152 278 200 312 248 278 236 258H164Z" fill="#e6e0d0" />
            <path d="M136 286 200 340 264 286 272 300 200 366 128 300Z" fill={cloth.shade} />
            <path d="M200 366V720" fill="none" strokeWidth="3" />
          </>}
          {kind === "team" && <>
            <path d="M112 306C126 252 162 246 200 246C238 246 274 252 288 306C266 372 134 372 112 306Z" fill={cloth.shade} />
            <path d="M138 306C160 334 240 334 262 306" fill="none" strokeWidth="3" />
          </>}
          {kind === "shop" && <>
            <path d="M150 268H250L244 300H156Z" fill="#e8e2d2" />
            <path d="M128 306 272 470M272 306 128 470" fill="none" stroke="#5b3b2e" strokeWidth="18" />
            <path d="M92 462H308V486H92Z" fill="#5b3b2e" />
          </>}
          <ellipse cx="92" cy="152" rx="13" ry="25" fill="#d29372" />
          <ellipse cx="308" cy="152" rx="13" ry="25" fill="#d29372" />
          <path d="M200 26C118 26 84 88 90 150C94 186 106 214 124 232L142 218 152 250 176 226 200 258 224 226 248 250 258 218 276 232C294 214 306 186 310 150C316 88 282 26 200 26Z" fill="#33292b" />
        </g>
        <path d="M94 172C122 232 278 232 306 172C302 208 290 222 276 230L258 216 248 248 224 224 200 256 176 224 152 248 142 216 124 230C110 220 98 198 94 172Z" fill="#1c1619" />
        <path d="M298 116C312 160 304 200 278 228L262 206C286 182 296 150 298 116Z" fill="#1c1619" />
        <path d="M112 104C136 78 178 68 222 74L212 92 200 80 192 102 176 86 166 110 150 92 140 116 128 100 116 124Z" fill="#8a7470" />
        <path d="M236 80C254 88 268 102 276 120L262 112 258 128 246 106 238 116Z" fill="#65534f" />
        <path d="M200 30C178 70 168 130 176 222L184 218C176 140 184 76 206 32ZM252 44C278 90 284 150 266 214L272 212C292 150 288 86 258 42ZM146 46C118 86 112 150 132 214L126 212C104 150 108 84 140 44Z" fill="#17131a" />
      </svg>
    </div>
  );
}

export default PlayerBack;
