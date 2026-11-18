import { test, expect } from '@playwright/test';

async function boot(page) {
  await page.addInitScript(() => {
    // Test-only platform harness; the shipped game still uses Verse8's DebugPanel.
    window.DebugPanel = {
      define(schema) {
        const result = Object.fromEntries(Object.entries(schema).map(([group, entries]) => [group, Object.fromEntries(Object.entries(entries).filter(([k]) => k !== '_label').map(([key, spec]) => [key, spec.value]))]));
        result.advanced.minimumSendMs = 0;
        result.minigame.stareGoal = 1;
        result.minigame.feverSpeed = 1;
        window.__tunables = result;
        return result;
      }, frame: dt => dt, stat() {},
    };
    localStorage.setItem('time-to-get-mad-save-v1', JSON.stringify({ unlocked: { office: 2, team: 2, shop: 2 }, certificates: {} }));
  });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
async function start(page, scenario = 0, level = 0) {
  await page.getByRole('button', { name: /GAME START/ }).click();
  await page.locator('.scenario-row').nth(scenario).click();
  await page.locator('.difficulty-option').nth(level).click();
  await expect(page.locator('.typing-form input')).toBeVisible();
}
async function send(page, value) {
  const input = page.locator('.typing-form input');
  await input.fill(value);
  await input.press('Enter');
}
async function next(page) {
  await page.locator('.reaction-controls button').click();
  if (await page.locator('.stare-card').isVisible()) {
    await page.locator('.stare-card button').click();
    await page.locator('.reaction-controls button').click();
  }
  if (await page.locator('.fever-form').isVisible()) {
    for (let i = 0; i < 3; i++) {
      const value = await page.locator('.falling-sentence').innerText();
      await page.locator('.fever-form input').fill(value);
      await page.locator('.fever-form input').press('Enter');
    }
    await page.locator('.reaction-controls button').click();
  }
}
for (let scenario = 0; scenario < 3; scenario++) for (let level = 0; level < 3; level++) {
  test(`authored game flow clears scenario ${scenario}, level ${level}`, async ({ page }) => {
    await boot(page); await start(page, scenario, level);
    for (let i = 0; i < 3 + level; i++) {
      await send(page, await page.locator('.prompt-sentence').innerText());
      await expect(page.locator('.reaction-panel')).toBeVisible();
      await next(page);
    }
    await expect(page.locator('.win-content')).toBeVisible();
    if (level === 2) await expect(page.locator('.certificate-toast')).toBeVisible();
  });
}
test('authored typo triggers opponent speech reaction without a network request', async ({ page }) => {
  await boot(page); await start(page);
  let calls = 0;
  await page.route('**/api/evaluate', route => { calls++; return route.abort(); });
  const target = await page.locator('.prompt-sentence').innerText();
  await send(page, target.replace('하겠습니다', '하겠슴니다'));
  await expect(page.locator('.reaction-text')).toContainText('어눌');
  expect(calls).toBe(0);
});
test('IME composition blocks both Enter and form submission until committed', async ({ page }) => {
  await boot(page); await start(page);
  const input = page.locator('.typing-form input');
  await input.dispatchEvent('compositionstart');
  await input.fill(await page.locator('.prompt-sentence').innerText());
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true });
  await page.locator('.typing-form').dispatchEvent('submit');
  await expect(page.locator('.typing-form button')).toBeDisabled();
  await expect(page.locator('.reaction-panel')).toHaveCount(0);
  await input.dispatchEvent('compositionend');
  await expect(page.locator('.typing-form button')).toBeEnabled();
  await page.waitForTimeout(40);
  await input.press('Enter');
  await expect(page.locator('.reaction-panel')).toBeVisible();
});
test('one semantic request, frozen timer, one result despite repeated submissions', async ({ page }) => {
  await boot(page); await start(page);
  let calls = 0;
  await page.route('**/api/evaluate', async route => {
    calls++; await new Promise(resolve => setTimeout(resolve, 800));
    await route.fulfill({ json: { score: 0.9, accepted: true } });
  });
  await send(page, '지금 맡은 일이 있으니 어떤 일부터 할지 함께 정해 주세요');
  await expect(page.locator('.typing-form')).toHaveAttribute('aria-busy', 'true');
  const remaining = await page.locator('.timer-block b').innerText();
  await page.locator('.typing-form').dispatchEvent('submit');
  await page.locator('.typing-form').dispatchEvent('submit');
  await page.waitForTimeout(400);
  expect(await page.locator('.timer-block b').innerText()).toBe(remaining);
  await expect(page.locator('.reaction-panel')).toBeVisible();
  expect(calls).toBe(1);
});
test('outage preserves answer and gauges, then supports retry', async ({ page }) => {
  await boot(page); await start(page);
  await page.route('**/api/evaluate', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  const gauges = await page.locator('.hud-bars').innerText();
  const answer = '현재 하는 일과 새 업무를 어떤 순서로 할지 정해 주세요';
  await send(page, answer);
  await expect(page.locator('.typing-footer')).toContainText('감점 없이');
  expect(await page.locator('.hud-bars').innerText()).toBe(gauges);
  await expect(page.locator('.typing-form input')).toHaveValue(answer);
  await page.route('**/api/evaluate', route => route.fulfill({ json: { score: 0.88, accepted: true } }));
  await page.locator('.typing-form input').press('Enter');
  await expect(page.locator('.reaction-panel')).toBeVisible();
});
test('late semantic response cannot change another playthrough after Escape', async ({ page }) => {
  await boot(page); await start(page);
  await page.route('**/api/evaluate', async route => {
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.fulfill({ json: { score: 1, accepted: true } }).catch(() => {});
  });
  await send(page, '일정을 다시 논의하고 싶어요');
  await expect(page.locator('.typing-form')).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Escape');
  await page.locator('.scenario-row').nth(1).click();
  await page.locator('.difficulty-option').first().click();
  await page.waitForTimeout(900);
  await expect(page.locator('.typing-form')).toBeVisible();
  await expect(page.locator('.meter-mental b')).toContainText('100');
});
test('all rejected replies cannot unlock a win even after winning mini-games', async ({ page }) => {
  await boot(page); await start(page);
  await page.route('**/api/evaluate', route => route.fulfill({ json: { score: 0.2, accepted: false } }));
  let lastTarget;
  for (let i = 0; i < 3; i++) {
    lastTarget = await page.locator('.prompt-sentence').innerText();
    await send(page, '그냥 전부 제 잘못입니다');
    await expect(page.locator('.reaction-panel')).toBeVisible();
    await next(page);
  }
  await expect(page.locator('.over-content')).toBeVisible();
  await expect(page.locator('.over-reason')).toContainText('충분히 전달');
  await page.locator('.over-content button').click();
  await page.locator('.night-narrative button').click();
  // Original behavior: ordinary misses are not stored; no stored misses falls back to the last target.
  await expect(page.locator('.blanket-memory')).toHaveText(`“${lastTarget}”`);
});
test('curse limit loses exactly once and blanket practice remains playable', async ({ page }) => {
  await boot(page); await start(page);
  for (let i = 0; i < 3; i++) {
    await send(page, '씨발');
    if (i < 2) await next(page);
  }
  await expect(page.locator('.over-content')).toBeVisible();
  await page.locator('.over-content button').click();
  await page.locator('.night-narrative button').click();
  await expect(page.locator('.blanket-form')).toBeVisible();
  for (let i = 0; i < 3; i++) {
    const target = (await page.locator('.blanket-memory').innerText()).replace(/^“|”$/g, '');
    await page.locator('.blanket-form input').fill(target);
    await page.locator('.blanket-form input').press('Enter');
  }
  await expect(page.locator('.done-content')).toBeVisible();
});
test('typing timeout is applied once, without awarding an unsubmitted reply', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__tunables.game.easyTime = 0.3; });
  await start(page);
  await expect(page.locator('.reaction-panel')).toBeVisible();
  await expect(page.locator('.meter-anger b')).toHaveText('25/ 100');
  await expect(page.locator('.meter-mental b')).toHaveText('100/ 100');
  await page.waitForTimeout(400);
  await expect(page.locator('.meter-anger b')).toHaveText('25/ 100');
});
test('semantic request deadline restores the same reply and ignores late results', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__tunables.evaluation.timeoutMs = 100; });
  await start(page);
  await page.route('**/api/evaluate', async route => {
    await new Promise(resolve => setTimeout(resolve, 400));
    await route.fulfill({ json: { score: 1, accepted: true } }).catch(() => {});
  });
  const answer = '제가 현재 맡고 있는 업무량부터 함께 검토해 주세요';
  await send(page, answer);
  await expect(page.locator('.typing-footer')).toContainText('감점 없이');
  await page.waitForTimeout(500);
  await expect(page.locator('.typing-form input')).toHaveValue(answer);
  await expect(page.locator('.meter-mental b')).toHaveText('100/ 100');
});
test('paused platform time cannot bypass minimum thinking time', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.__tunables.advanced.minimumSendMs = 500;
    window.DebugPanel.frame = () => 0;
  });
  await start(page);
  const target = await page.locator('.prompt-sentence').innerText();
  await page.waitForTimeout(600);
  await send(page, target);
  await expect(page.locator('.typing-footer')).toContainText('너무 빨리');
  await page.evaluate(() => { window.DebugPanel.frame = dt => dt; });
  await page.waitForTimeout(600);
  await page.locator('.typing-form input').press('Enter');
  await expect(page.locator('.reaction-panel')).toBeVisible();
});
test('fever deadline clears IME state before the next falling phrase', async ({ page }) => {
  await boot(page); await start(page);
  for (let i = 0; i < 2; i++) {
    await send(page, await page.locator('.prompt-sentence').innerText());
    await page.locator('.reaction-controls button').click();
  }
  await page.locator('.stare-card button').click();
  await page.locator('.reaction-controls button').click();
  const first = await page.locator('.falling-sentence').innerText();
  await page.locator('.fever-form input').dispatchEvent('compositionstart');
  await page.evaluate(() => { window.__tunables.minigame.feverSpeed = 1000; });
  await expect(page.locator('.falling-sentence')).not.toHaveText(first);
  await page.evaluate(() => { window.__tunables.minigame.feverSpeed = 1; });
  await expect(page.locator('.fever-form button')).toBeEnabled();
});
