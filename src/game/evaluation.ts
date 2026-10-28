// Pure rules shared by gameplay and regression tests. No model keys belong here.
export type TypoPattern = { from: string; to: string; reaction: string };
export type ScriptResult = { route: 'script'; score: number; accepted: boolean; errors: number; reaction?: string };
export type Evaluation = ScriptResult | { route: 'semantic'; score: number; accepted: boolean };
export const MAX_ANSWER_LENGTH = 600;

export function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{Z}]/gu, '');
}

// Insertions/deletions no longer turn the entire remaining sentence into errors.
export function editDistance(expected: string, actual: string) {
  const a = Array.from(expected), b = Array.from(actual);
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], beforePrevious[j - 2] + 1);
    }
    beforePrevious = previous;
    previous = row;
  }
  return previous[b.length];
}

function polarity(text: string) {
  // A near copy with a changed refusal/obligation must be read for meaning.
  return (normalize(text).match(/않|안[가-힣]|못[가-힣]|없|불가|불가능|필요없|거절|중단|지켜|말아|마세요|할수있|할수없/g) ?? []).join('|');
}

export function scriptEvaluation(expected: string, answer: string, tolerance: number, patterns: TypoPattern[], nearThreshold = 0.75): ScriptResult | null {
  const target = normalize(expected);
  let actual = normalize(answer);
  let reaction: string | undefined;
  // Apply only explicitly authored slips whose corrected form exists in this target.
  for (const pattern of patterns) {
    const from = normalize(pattern.from), to = normalize(pattern.to);
    if (target.includes(to) && !target.includes(from) && actual.includes(from)) {
      actual = actual.split(from).join(to);
      reaction ??= pattern.reaction;
    }
  }
  if (polarity(target) !== polarity(actual)) return null;
  const errors = editDistance(target, actual);
  const score = Math.max(0, 1 - errors / Math.max(target.length, actual.length, 1));
  if (score < nearThreshold) return null;
  return { route: 'script', errors, score, accepted: errors <= tolerance && score >= 0.8, reaction };
}

export function hasProfanity(answer: string) {
  const compact = normalize(answer).replace(/[\u200b-\u200d\ufeff]/g, '');
  // Avoid the common false positive "시발점".
  return /씨발|시발(?!점)|병신|개새끼|좆|꺼져/.test(compact) || ['ㅅㅂ', 'ㅂㅅ'].some(word => compact.includes(normalize(word)));
}

export function paceMultiplier(chars: number, elapsedMs: number, commits: number[], minCpm: number, maxCpm: number) {
  const cpm = chars * 60000 / Math.max(elapsedMs, 1);
  if (cpm > maxCpm || cpm < minCpm) return 0.9;
  // Broad tolerance: natural thinking pauses and Korean IME are not mistakes.
  if (commits.length < 3) return 0.95;
  const gaps = commits.slice(1).map((t, i) => t - commits[i]).filter(t => t > 0);
  const bursts = gaps.filter(t => t < 30).length;
  return bursts > gaps.length / 2 ? 0.95 : 1;
}

export function canClear(completed: number, rounds: number, successes: number, mental: number) {
  return completed >= rounds && successes >= Math.ceil(rounds / 2) && mental <= 0;
}

export type SemanticRequest = { scenario: string; level: number; round: number; answer: string };
export async function evaluateSemantic(request: SemanticRequest, signal: AbortSignal, timeoutMs: number): Promise<Evaluation> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const endpoint = import.meta.env?.VITE_EVALUATION_URL || '/api/evaluate';
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: controller.signal });
    if (!response.ok) throw new Error('Evaluation unavailable');
    const data = await response.json();
    if (typeof data.score !== 'number' || !Number.isFinite(data.score) || data.score < 0 || data.score > 1 || typeof data.accepted !== 'boolean' || (data.accepted ? data.score < 0.6 : data.score >= 0.6)) throw new Error('Invalid evaluation');
    return { route: 'semantic', score: data.score, accepted: data.accepted };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}
