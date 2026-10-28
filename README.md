# 그때 그렇게 말할걸! — Verse8 한국어 타이핑 게임

기존 React 게임 화면과 미니게임을 유지하면서, 추천 답변의 오타 판정과 자유 답변의 AI 의미 판정을 자동으로 구분합니다.

- **변경 내용·설정·Verse8 적용:** [자동 답변 판정 안내](docs/answer-evaluation.md)
- **게임 화면:** `src/game/GameScreen.tsx`
- **내부 판정 규칙:** `src/game/evaluation.ts`
- **대본·오타 패턴·상대 반응:** `src/locales/ko.json`
- **서버 전용 AI 호출:** `server/`

Node 24 이상을 권장합니다.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser
```

브라우저 테스트는 설치된 Google Chrome과 테스트용 Verse8 하네스를 사용합니다. 실제 게임은 기존과 같이 Verse8이 주입하는 DebugPanel을 사용합니다.

**AI를 실제 사용하려면 신뢰된 서버에 모델 연결 정보를 설정해야 합니다.** 프런트엔드만 Verse8에 올려도 AI 서버가 자동 배포되지는 않습니다. 연결이 없거나 장애가 나면 자유 답변을 오답 처리하지 않고 다시 전송하도록 안내합니다. API 키는 서버 환경변수로만 공급하며 게임 코드와 배포 파일에 포함하지 않습니다.
