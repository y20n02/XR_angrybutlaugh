import test from 'node:test';
import assert from 'node:assert/strict';
import { canClear, editDistance, evaluateSemantic, hasProfanity, normalize, paceMultiplier, scriptEvaluation } from '../src/game/evaluation.ts';
const patterns = [{ from: '했자나', to: '했잖아', reaction: 'slurred' }, { from: '하겠슴니다', to: '하겠습니다', reaction: 'slurred' }];
test('normalization tolerates spacing, punctuation and decomposed Korean', () => {
  assert.equal(normalize('확인 하겠습니다!'), normalize('확인하겠습니다.'.normalize('NFD')));
});
test('insertion, omission, transposition each count as one error', () => {
  assert.equal(editDistance('확인하겠습니다', '확인겠습니다'), 1);
  assert.equal(editDistance('확인하겠습니다', '확인하겠습니이다'), 1);
  assert.equal(editDistance('확인하겠습니다', '인확하겠습니다'), 1);
});
test('near copy uses script; unrelated original uses semantics', () => {
  assert.equal(scriptEvaluation('기록을 확인하겠습니다', '기록을 확인하겠습다', 1, patterns)?.accepted, true);
  assert.equal(scriptEvaluation('기록을 확인하겠습니다', '언제 전달하셨는지 메일로 알려 주세요', 1, patterns), null);
});
test('authored slip preserves meaning and triggers its fixed reaction', () => {
  const result = scriptEvaluation('제가 했잖아.', '제가 했자나!', 0, patterns);
  assert.equal(result?.reaction, 'slurred'); assert.equal(result?.accepted, true);
  assert.equal(scriptEvaluation('확인하겠습니다', '확인하겠슴니다', 0, patterns)?.accepted, true);
  assert.equal(scriptEvaluation('자료를 보내 주세요', '제가 했자나', 0, patterns), null);
});
test('near-copy negation changes require semantic review', () => {
  assert.equal(scriptEvaluation('규정을 확인하겠습니다', '규정을 확인하지 않겠습니다', 3, patterns), null);
  assert.equal(scriptEvaluation('확인이 필요합니다', '확인이 필요없습니다', 3, patterns), null);
});
test('difficulty tolerance does not accept empty or very short answers', () => {
  assert.equal(scriptEvaluation('확인하겠습니다', '', 8, patterns), null);
  assert.equal(scriptEvaluation('확인하겠습니다', '확인', 8, patterns), null);
  assert.equal(scriptEvaluation('기록을 확인하겠습니다', '기록을 확인허겠습니다', 0, patterns)?.accepted, false);
});
test('profanity ignores common false positive and catches separated abuse', () => {
  assert.equal(hasProfanity('이 일이 시발점이었습니다'), false);
  assert.equal(hasProfanity('씨. 발'), true); assert.equal(hasProfanity('ㅅㅂ'), true);
});
test('pace is bounded, rewards a broad natural rhythm, never increases without bound', () => {
  assert.equal(paceMultiplier(30, 8000, [1000, 1300, 1700, 2600], 60, 900), 1);
  assert.equal(paceMultiplier(30, 600, [500], 60, 900), 0.9);
  assert.equal(paceMultiplier(30, 8000, [500], 60, 900), 0.95);
});
test('completion alone cannot award a win', () => {
  assert.equal(canClear(3, 3, 0, 0), false); assert.equal(canClear(3, 3, 3, 1), false);
  assert.equal(canClear(2, 3, 2, 0), false); assert.equal(canClear(3, 3, 2, 0), true);
});
test('semantic client rejects malformed and inconsistent responses', async () => {
  const oldFetch = globalThis.fetch;
  const req = { scenario: 'office', level: 0, round: 0, answer: '메일로 알려 주세요' };
  try {
    for (const data of [{ score: 2, accepted: true }, { score: 0.1, accepted: true }, { score: '1', accepted: true }]) {
      globalThis.fetch = async () => new Response(JSON.stringify(data));
      await assert.rejects(evaluateSemantic(req, new AbortController().signal, 100));
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ score: 0.9, accepted: true }));
    assert.equal((await evaluateSemantic(req, new AbortController().signal, 100)).accepted, true);
    globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    await assert.rejects(evaluateSemantic(req, new AbortController().signal, 10));
  } finally { globalThis.fetch = oldFetch; }
});
