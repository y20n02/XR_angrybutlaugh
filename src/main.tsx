import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// [수정 김홍경 11/03] 픽셀 폰트(Galmuri) 불러오기
import "./game/fonts.css";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
