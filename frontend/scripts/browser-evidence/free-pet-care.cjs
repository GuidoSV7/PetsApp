// Real local API + isolated PostgreSQL acceptance; never mocks care or edits A1.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');

const repo = path.resolve(__dirname, '../../..');
const archive = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'agent-evidence'], { cwd: repo, encoding: 'utf8' }).trim();
fs.mkdirSync(archive, { recursive: true });
const run = fs.mkdtempSync(path.join(archive, 'free-care-browser-'));
const workspace = path.join(run, 'workspace');
const fixture = path.join(workspace, 'frontend');
const servers = [], descriptors = [], rows = [];
let databaseUrl, client, browser;
const exec = (command, args, options = {}) => execFileSync(command, args, { cwd: repo, encoding: 'utf8', ...options });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  assert(![3000, 3001].includes(port));
  return port;
}
function start(label, command, args, cwd, env) {
  const fd = fs.openSync(path.join(run, label + '.log'), 'w');
  descriptors.push(fd);
  const child = spawn(command, args, { cwd, detached: true, stdio: ['ignore', fd, fd], env });
  servers.push(child);
  return child;
}
async function ready(child, url, accepts) {
  const end = Date.now() + 90000;
  while (Date.now() < end) {
    if (child.exitCode !== null || child.signalCode !== null) throw Error('Owned server exited: ' + url);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok && accepts(await response.text())) return;
    } catch {}
    await wait(300);
  }
  throw Error('Owned readiness timeout: ' + url);
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const ended = once(child, 'exit');
  process.kill(-child.pid, 'SIGTERM');
  let timer;
  const graceful = await Promise.race([ended.then(() => true), new Promise(resolve => { timer = setTimeout(() => resolve(false), 5000); })]);
  clearTimeout(timer);
  if (!graceful) { process.kill(-child.pid, 'SIGKILL'); await ended; }
}
async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
}
async function canvasProof(page, label) {
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    return gl && !gl.isContextLost() && canvas.width > 0 && canvas.height > 0;
  });
  await frames(page);
  const png = await canvas.screenshot({ path: path.join(run, label + '-canvas.png') });
  const colors = await page.evaluate(async b64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + b64;
    await image.decode();
    const copy = document.createElement('canvas');
    copy.width = image.width; copy.height = image.height;
    const context = copy.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
    const unique = new Set();
    for (let i = 0; i < pixels.length; i += 4) unique.add(pixels.slice(i, i + 4).join(','));
    return { width: copy.width, height: copy.height, uniqueColors: unique.size };
  }, png.toString('base64'));
  assert(colors.uniqueColors > 1, 'Blank WebGL canvas');
  return colors;
}
async function assertHome(page) {
  const header = page.locator('header');
  assert(await header.getByRole('img', { name: 'PetsApp', exact: true }).isVisible());
  assert(await header.getByRole('button', { name: /Cerrar sesión/ }).isVisible());
  assert(!/monedas|saldo|\+/i.test(await header.innerText()), 'Coin counter or plus remains');
  assert(!/Necesitás más monedas|sin monedas|5 monedas/i.test(await page.locator('body').innerText()), 'Obsolete economic message');
  // Next's route announcer is a standard live region, not an application error.
  const alerts = await page.getByRole('alert').evaluateAll(nodes =>
    nodes.filter(node => node.id !== '__next-route-announcer__').map(node => node.textContent));
  assert.deepEqual(alerts, [], 'Unexpected application alert');
  const layout = await page.evaluate(() => ({
    viewport: innerWidth, scroll: document.documentElement.scrollWidth,
    header: (() => { const r = document.querySelector('header').getBoundingClientRect(); return { left: r.left, right: r.right }; })(),
  }));
  assert(layout.scroll <= layout.viewport, 'Horizontal overflow');
  assert(layout.header.left >= 0 && layout.header.right <= layout.viewport, 'Clipped header');
  return layout;
}
(async () => {
  assert(process.env.HOME, 'Keep the normal HOME');
  assert(fs.existsSync(path.join(repo, 'backend/dist/main.js')), 'Build backend first');
  console.log('EVIDENCE_DIRECTORY ' + run);
  databaseUrl = exec('pgtest-db', ['create', 'petsapp_free_care_browser']).trim();
  const dbTarget = new URL(databaseUrl);
  assert.equal(dbTarget.hostname, '127.0.0.1');
  assert.equal(dbTarget.port, '55432');
  const apiPort = await freePort(), frontPort = await freePort();
  const apiOrigin = 'http://127.0.0.1:' + apiPort, origin = 'http://127.0.0.1:' + frontPort;
  const env = {
    ...process.env, NODE_ENV: 'development', PROD: 'false',
    DATABASE_URL: databaseUrl, DATABASE_SSL: 'false', DB_POOL_MAX: '1',
    JWT_SECRET: 'isolated-free-care-browser-fixture-only', CLIENT_SECRET: 'isolated-fixture-only',
    CORS_ORIGIN: origin, PORT: String(apiPort), NEXT_TELEMETRY_DISABLED: '1',
  };
  exec(process.execPath, ['dist/db/migrate.js'], { cwd: path.join(repo, 'backend'), env });
  const pg = require(path.join(repo, 'backend/node_modules/pg'));
  client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const guest = randomUUID();
  const stored = async () => (await client.query('SELECT * FROM pet_states WHERE guest_key=$1 LIMIT 1', [guest])).rows[0];
  const api = start('backend', process.execPath, ['dist/main.js'], path.join(repo, 'backend'), env);
  await ready(api, apiOrigin, text => JSON.parse(text).status === 'ok');
  const fresh = await fetch(apiOrigin + '/pet/state', { headers: { 'X-Pet-Guest-Key': randomUUID() } });
  assert.equal(fresh.status, 200);
  const created = await fresh.json();
  assert.equal(created.coins, 0);
  assert.deepEqual(created.needs, { hunger: 72, fun: 80, energy: 65, hygiene: 78 });
  console.log('API_NEW_PET_INITIAL_ZERO');

  fs.mkdirSync(workspace);
  const tar = path.join(workspace, 'source.tar');
  exec('git', ['archive', 'HEAD', '--format=tar', '-o', tar, 'frontend']);
  exec('tar', ['-xf', tar, '-C', workspace]);
  fs.cpSync(path.join(repo, 'frontend/src'), path.join(fixture, 'src'), { recursive: true, dereference: false });
  fs.symlinkSync(path.join(repo, 'frontend/node_modules'), path.join(fixture, 'node_modules'), 'dir');
  const frontend = start('frontend', process.execPath, [path.join(repo, 'frontend/node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(frontPort)], fixture, {
    ...env, NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY: '', NEXT_PUBLIC_PETSAPP_API_URL: '/petsapp-api', PETSAPP_API_INTERNAL_URL: apiOrigin,
  });
  await ready(frontend, origin, text => text.includes('PetsApp'));
  const { chromium } = require('playwright');
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const signup = await context.request.post(origin + '/petsapp-api/auth/register', {
      headers: { Origin: origin }, data: { name: 'Care fixture', email: 'care-' + randomUUID() + '@example.test', password: 'IsolatedCareFixture1!' },
    });
    assert.equal(signup.status(), 201);
    const session = await signup.json();
    assert(session.token && session.user.role === 'member');
    await context.addInitScript(({ session, guest }) => {
      localStorage.setItem('petsapp_session_v1', JSON.stringify(session));
      if (!localStorage.getItem('petsapp_pet_guest')) localStorage.setItem('petsapp_pet_guest', guest);
    }, { session, guest });
    const page = await context.newPage(), errors = [], failures = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('requestfailed', request => failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/petsapp-api/pet/')) network.push({ method: response.request().method(), path: url.pathname, status: response.status(), guestMatches: response.request().headers()['x-pet-guest-key'] === guest });
    });
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'));
    // Create the low-hunger fixture after compilation/signup so setup time is not decay time.
    await client.query('INSERT INTO pet_states (guest_key, hunger, status_key) VALUES ($1, 10, $2)', [guest, 'broke']);
    const before = await stored();
    assert.equal(before.coins, 0);
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle', timeout: 90000 })).status(), 200);
    await page.locator('[data-ready="true"]').waitFor();
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    await assertHome(page);
    assert.deepEqual(await stored(), before, 'Reading legacy broke wrote a row');
    assert.equal((await (await page.request.get(origin + '/petsapp-api/pet/state', { headers: { 'X-Pet-Guest-Key': guest } })).json()).statusKey, 'idle');
    for (const hunger of [28, 46, 64]) {
      const pending = page.waitForResponse(r => r.url().endsWith('/petsapp-api/pet/actions/feed') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Alimentar', exact: true }).click();
      const response = await pending, state = await response.json();
      assert.equal(response.status(), 201);
      assert.equal(state.coins, 0);
      assert.equal(state.needs.hunger, hunger);
      assert.equal(state.statusKey, 'fed');
      rows.push({ action: 'feed', status: response.status(), state });
      const row = await stored();
      assert.equal(row.coins, 0); assert.equal(row.hunger, hunger);
      console.log('FEED_ZERO hunger=' + hunger);
    }
    for (const [index, name] of ['Luna', 'Nube', 'Mora'].entries()) {
      await page.getByRole('button', { name: /^Editar nombre:/ }).click();
      await page.getByRole('textbox', { name: 'Nombre', exact: true }).fill(name);
      assert(/gratis/i.test(await page.locator('#pet-rename-hint').innerText()));
      const pending = page.waitForResponse(r => r.url().endsWith('/petsapp-api/pet/name') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      const response = await pending, state = await response.json();
      assert.equal(response.status(), 201);
      assert.equal(state.coins, 0); assert.equal(state.name, name); assert.equal(state.renameCount, index + 1);
      rows.push({ action: 'rename', status: response.status(), state });
      await page.getByRole('button', { name: 'Editar nombre: ' + name, exact: true }).waitFor();
      const row = await stored();
      assert.equal(row.coins, 0); assert.equal(row.name, name); assert.equal(row.rename_count, index + 1);
      console.log('RENAME_ZERO count=' + (index + 1));
    }
    const reloadResponse = page.waitForResponse(r => r.url().endsWith('/petsapp-api/pet/state') && r.request().method() === 'GET');
    await page.reload({ waitUntil: 'networkidle' });
    const persisted = await (await reloadResponse).json();
    assert.equal(persisted.coins, 0); assert.equal(persisted.name, 'Mora');
    assert.equal(persisted.renameCount, 3); assert.equal(persisted.needs.hunger, 64);
    await page.locator('[data-ready="true"]').waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('petsapp_pet_guest')), guest);
    await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
    const screenshots = [];
    for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
      await page.setViewportSize(viewport);
      const canvas = await canvasProof(page, label);
      const layout = await assertHome(page);
      await page.screenshot({ path: path.join(run, label + '-home.png'), fullPage: true });
      screenshots.push({ label, viewport, canvas, layout, file: label + '-home.png' });
    }
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    assert(network.every(row => row.status >= 200 && row.status < 300 && row.guestMatches));
    assert.equal(network.filter(row => row.method === 'POST' && row.path.endsWith('/actions/feed')).length, 3);
    assert.equal(network.filter(row => row.method === 'POST' && row.path.endsWith('/name')).length, 3);
    const report = {
      status: 'PASS', base: exec('git', ['rev-parse', 'HEAD']).trim(),
      browser: browser.version(), renderer: 'Chromium SwiftShader; not physical phone/GPU performance',
      api: 'Real NestJS + same-origin proxy; no mocked care responses',
      postgres: (await client.query('SHOW server_version')).rows[0],
      newlyCreated: created, legacyReadLeftRowUnchanged: true,
      actions: rows, reloaded: persisted, network, screenshots, errors, failures,
      cleanup: 'finally closes owned browser/servers/client, drops isolated database, removes workspace',
    };
    fs.writeFileSync(path.join(run, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('FREE_CARE_BROWSER_PASS; MOBILE_AND_DESKTOP_CAPTURED');
  } finally { await context.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  const cleanupErrors = [];
  for (const cleanup of [
    async () => { if (browser) await browser.close(); },
    async () => { for (const server of servers.reverse()) await stop(server); },
    async () => { if (client) await client.end(); },
    async () => { if (databaseUrl) exec('pgtest-db', ['drop', databaseUrl]); },
    async () => { descriptors.forEach(fd => fs.closeSync(fd)); fs.rmSync(workspace, { recursive: true, force: true }); },
  ]) { try { await cleanup(); } catch (error) { cleanupErrors.push(error.message); } }
  fs.writeFileSync(path.join(run, 'cleanup.json'), JSON.stringify({ status: cleanupErrors.length ? 'FAIL' : 'PASS', errors: cleanupErrors }) + '\n');
  if (cleanupErrors.length) { console.error(cleanupErrors); process.exitCode = 1; }
  console.log('OWNED_RESOURCES_CLEANED ' + (cleanupErrors.length ? 'FAIL' : 'PASS'));
});
