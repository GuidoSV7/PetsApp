const fs = require('node:fs'), path = require('node:path'), net = require('node:net'), assert = require('node:assert/strict'), crypto = require('node:crypto'), zlib = require('node:zlib');
const { spawn, execFileSync } = require('node:child_process'), { once } = require('node:events');
// Shared frontend runner: immutable A1 inputs, private output for every run.
const repo = path.resolve(__dirname, '../../..'), phase = process.env.PET_SKELETON_PHASE || 'after';
if (phase !== 'after') {
    process.stderr.write('A1 baseline is frozen; only PET_SKELETON_PHASE=after is supported.\n');
    process.exit(2);
}
const archive = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'agent-evidence'], { cwd: repo, encoding: 'utf8' }).trim();
fs.mkdirSync(archive, { recursive: true });
const run = fs.mkdtempSync(path.join(archive, 'skeleton-browser-run-'));
const out = path.join(run, 'evidence'), scratch = path.join(run, 'workspace'), fixture = path.join(scratch, 'frontend');
fs.mkdirSync(out);
fs.mkdirSync(scratch);
const baselineDir = path.join(repo, 'frontend/openspec/changes/pet-voxel-skeleton/evidence');
const worldFile = path.join(repo, 'frontend/test/fixtures/pet-skeleton/legacy-world.json.gz');
const cases = [], sha = b => crypto.createHash('sha256').update(b).digest('hex');
let server, browser, fd, port, worldMatrices = 0, maxWorldCoefficientError = 0;
const sourceSeal = () => Object.fromEntries(execFileSync('git', ['ls-files', 'frontend/src'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').map(p => [p, sha(fs.readFileSync(path.join(repo, p)))]));
const initialSeal = sourceSeal();
const wait = ms => new Promise(r => setTimeout(r, ms));
async function freePort() { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; }
async function ready(origin) { const end = Date.now() + 90000; while (Date.now() < end) {
    if (server.exitCode !== null)
        throw Error('Owned server exited');
    try {
        const r = await fetch(origin, { signal: AbortSignal.timeout(2000) });
        if (r.status === 200 && (await r.text()).includes('PetsApp'))
            return;
    }
    catch { }
    await wait(300);
} throw Error('Owned server readiness timeout'); }
async function stop() { if (!server || server.exitCode !== null || server.signalCode !== null)
    return; const ended = once(server, 'exit'); process.kill(-server.pid, 'SIGTERM'); let timer; const ok = await Promise.race([ended.then(() => true), new Promise(r => timer = setTimeout(() => r(false), 5000))]); clearTimeout(timer); if (!ok) {
    process.kill(-server.pid, 'SIGKILL');
    await ended;
} }
async function frames(page) { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); }
async function snapshot(page) { return page.evaluate(() => { const p = window.__petSkeletonProbe, s = p.state, boxes = [], joints = []; s.scene.updateMatrixWorld(true); s.scene.traverse(o => { if (o.isMesh && o.geometry?.type === 'BoxGeometry')
    boxes.push({ id: o.name, parent: o.parent.name, visible: o.visible, matrix: [...o.matrixWorld.elements], position: o.position.toArray(), scale: o.scale.toArray() }); if (o.name.startsWith('joint-') || o.name.startsWith('accessory-'))
    joints.push({ id: o.name, parent: o.parent.name, scale: o.scale.toArray(), children: o.children.length }); }); let root = s.scene.getObjectByName('body'); while (root.parent && !root.parent.isScene)
    root = root.parent; return { boxes, joints, root: { position: root.position.toArray(), rotation: root.rotation.toArray().slice(0, 3), scale: root.scale.toArray() }, camera: { position: s.camera.position.toArray(), quaternion: s.camera.quaternion.toArray(), projection: [...s.camera.projectionMatrix.elements] }, dpr: s.gl.getPixelRatio(), buffer: [s.gl.domElement.width, s.gl.domElement.height], passes: p.rows.map(r => ({ ...r })), webgl: !s.gl.getContext().isContextLost(), clock: s.clock.getElapsedTime() }; }); }
async function capture(page, file) { const encoded = await page.evaluate(() => window.__petSkeletonProbe.capture()); const png = Buffer.from(encoded.split(',')[1], 'base64'); fs.writeFileSync(file, png); return png; }
async function compare(page, before, after, diffFile) { const metric = await page.evaluate(async ([a, b]) => { async function pixels(b64) { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { c, x, data: x.getImageData(0, 0, c.width, c.height) }; } const [a0, b0] = await Promise.all([pixels(a), pixels(b)]); if (a0.c.width !== b0.c.width || a0.c.height !== b0.c.height)
    throw Error('Pixel dimensions differ; no resizing allowed'); const d = a0.x.createImageData(a0.c.width, a0.c.height); let changedPixels = 0, maxDelta = 0; const unique = new Set(); for (let i = 0; i < d.data.length; i += 4) {
    let delta = 0;
    for (let k = 0; k < 4; k++)
        delta = Math.max(delta, Math.abs(a0.data.data[i + k] - b0.data.data[i + k]));
    if (delta)
        changedPixels++;
    maxDelta = Math.max(maxDelta, delta);
    d.data[i] = delta ? 255 : 0;
    d.data[i + 1] = 0;
    d.data[i + 2] = delta ? 255 : 0;
    d.data[i + 3] = 255;
    unique.add(b0.data.data.slice(i, i + 4).join(','));
} a0.x.putImageData(d, 0, 0); return { width: a0.c.width, height: a0.c.height, changedPixels, maxDelta, uniqueColors: unique.size, diff: a0.c.toDataURL('image/png') }; }, [before.toString('base64'), after.toString('base64')]); if (metric.changedPixels)
    fs.writeFileSync(diffFile, Buffer.from(metric.diff.split(',')[1], 'base64')); delete metric.diff; assert(metric.uniqueColors > 30, 'Blank screenshot'); return metric; }
(async () => {
    assert(process.env.HOME, 'Run with your normal HOME; do not isolate it');
    const original = JSON.parse(zlib.gunzipSync(fs.readFileSync(worldFile)));
    const { chromium } = require('playwright');
    console.log('EVIDENCE_DIRECTORY ' + out);
    const originalIds = new Set(original.cases.find(c => c.pattern === 'solid').rest.boxes.map(b => b.id));
    function assertWorlds(actual, expected) {
        const boxes = new Map(actual.boxes.map(b => [b.id, b]));
        for (const before of expected.boxes) {
            const after = boxes.get(before.id);
            assert(after, before.id);
            assert.equal(after.visible, true, before.id);
            if (!originalIds.has(before.id))
                assert.equal(after.parent, before.parent, before.id + ' direct patch parent');
            assert.equal(after.matrix.length, 16);
            before.matrix.forEach((v, i) => { const delta = Math.abs(v - after.matrix[i]); assert(Number.isFinite(delta) && delta <= 1e-6, before.id + ' matrix[' + i + '] delta ' + delta); maxWorldCoefficientError = Math.max(maxWorldCoefficientError, delta); });
            worldMatrices++;
        }
        assert.equal(actual.boxes.filter(b => !b.visible).length, 6);
        assert.equal(actual.joints.filter(j => j.id.startsWith('joint-')).length, 22);
        const anchors = actual.joints.filter(j => j.id.startsWith('accessory-'));
        assert.equal(anchors.length, 3);
        anchors.forEach(a => assert.equal(a.children, 0));
        actual.joints.forEach(j => assert.deepEqual(j.scale, [1, 1, 1]));
    }
    console.log('SKELETON ' + phase + '; isolated actual home; no production APIs; HOME=' + process.env.HOME + ' Node=' + process.version);
    const tar = path.join(scratch, 'source.tar');
    execFileSync('git', ['archive', 'HEAD', '--format=tar', '-o', tar, 'frontend'], { cwd: repo });
    execFileSync('tar', ['-xf', tar, '-C', scratch]);
    fs.cpSync(path.join(repo, 'frontend/src'), path.join(fixture, 'src'), { recursive: true, dereference: false });
    fs.symlinkSync(path.join(repo, 'frontend/node_modules'), path.join(fixture, 'node_modules'), 'dir');
    const viewer = path.join(fixture, 'src/features/pet-home/components/Cat3DViewer.tsx');
    let source = fs.readFileSync(viewer, 'utf8');
    const originalViewerSha = sha(source);
    function replace(a, b) { assert.equal(source.split(a).length, 2, 'Unique observer insertion ' + a); source = source.replace(a, b); }
    replace('import { Canvas } from "@react-three/fiber";', 'import { Canvas, useFrame } from "@react-three/fiber";\nimport { sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";');
    replace('const performanceBounds', `function SkeletonBrowserProbe() {
  useFrame(state=>{
    const w=window as any;
    if(!w.__petSkeletonProbe){
      const renderer=state.gl,render=renderer.render;
      const p:any={state,rows:[],time:0};renderer.info.autoReset=false;
      renderer.render=function(scene:any,camera:any){const before={...renderer.info.render},target=renderer.getRenderTarget();const result=render.call(renderer,scene,camera);p.rows.push({kind:target===null?'main':scene.overrideMaterial?.type==='MeshDepthMaterial'?'contact-depth':'contact-blur',calls:renderer.info.render.calls-before.calls,triangles:renderer.info.render.triangles-before.triangles});if(target===null&&p.captureNext){const done=p.captureNext;p.captureNext=null;done(renderer.domElement.toDataURL('image/png'));}return result;};
      p.capture=()=>new Promise(resolve=>{p.captureNext=resolve;state.invalidate();});
      p.sampleTimes=()=>{const cues=needVisualCues(w.__petFixtureNeeds),found:any={};for(let t=0;t<24;t+=.005){const m=sampleCatIdleMotion(t,cues,{seed:13,reducedMotion:false});if(m.eyeL&&!found.blink)found.blink=t;if((m.earL||m.earR)&&!found.ear)found.ear=t;if(found.blink&&found.ear)break;}return [...new Set([0,.375,Math.PI/(4*cues.idleSpeed),(Math.PI/2+.6)/(2*cues.idleSpeed),found.blink,found.ear])].filter(t=>typeof t==='number');};
      w.__petSkeletonProbe=p;
    }
    const p=w.__petSkeletonProbe;p.state=state;state.clock.getElapsedTime=()=>p.time;p.rows=[];state.gl.info.reset();
  },-100);
  return null;
}
const performanceBounds`);
    replace('        <PerformanceMonitor', '        <SkeletonBrowserProbe />\n        <PerformanceMonitor');
    replace('            design={design}', '            design={(globalThis as any).__petFixtureDesign ?? design}');
    fs.writeFileSync(viewer, source);
    port = await freePort();
    assert(![3000, 3001].includes(port));
    const origin = 'http://127.0.0.1:' + port;
    fd = fs.openSync(path.join(run, 'server.log'), 'w');
    server = spawn(process.execPath, [path.join(repo, 'frontend/node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: fixture, detached: true, stdio: ['ignore', fd, fd], env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY: '', NEXT_PUBLIC_PETSAPP_API_URL: '/petsapp-api', PETSAPP_API_INTERNAL_URL: 'http://127.0.0.1:9', FORCE_COLOR: '0' } });
    await ready(origin);
    browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
    const patterns = [['solid', 0], ['tabby', 12], ['tuxedo', 8], ['calico', 4], ['pointed', 12]], definitions = patterns.flatMap(([pattern, n]) => [100, 0].map(need => ({ id: pattern + '-' + need, pattern, n, need, design: null, pixels: true })));
    definitions.push({ id: 'admin-tabby-0', pattern: 'tabby', n: 12, need: 0, design: { modelScale: .9, bodyDepth: 1.4, headHeight: .1, earSize: 1.6 }, pixels: false }, { id: 'admin-pointed-0', pattern: 'pointed', n: 12, need: 0, design: { modelScale: .9, bodyDepth: 1.4, headHeight: .1, earSize: 1.6 }, pixels: false });
    for (const def of definitions) {
        console.log('CASE ' + phase + ' ' + def.id);
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        try {
            const page = await context.newPage(), errors = [], failures = [];
            page.on('pageerror', e => errors.push(e.message));
            page.on('console', m => { if (m.type() === 'error')
                errors.push(m.text()); });
            page.on('requestfailed', r => failures.push({ url: r.url(), error: r.failure()?.errorText }));
            const needs = { hunger: def.need, fun: def.need, energy: def.need, hygiene: def.need };
            await page.addInitScript(({ needs, design }) => { localStorage.clear(); localStorage.setItem('petsapp_session_v1', JSON.stringify({ token: 'isolated-skeleton-fixture', user: { id: '11111111-1111-4111-8111-111111111111', name: 'Fixture', email: 'fixture@example.test', role: 'member', roles: ['member'], country: null } })); window.__petFixtureNeeds = needs; window.__petFixtureDesign = design; const original = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = (array) => array instanceof Uint32Array ? (array.fill(13), array) : original(array); }, { needs, design: def.design });
            await page.route('**/*', route => { const r = route.request(), u = new URL(r.url()); if (u.origin !== origin)
                return route.abort('blockedbyclient'); if (u.pathname.startsWith('/petsapp-api/')) {
                assert.equal(r.method(), 'GET');
                assert.equal(u.pathname, '/petsapp-api/pet/state');
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ coins: 5, needs, coat: { primary: '#6b7280', secondary: '#9ca3af', accent: '#c9a0a8', pattern: def.pattern }, statusKey: 'idle', mood: def.need ? 'Feliz' : 'Bajo', name: 'Michi', renameCount: 0 }) });
            } return route.continue(); });
            assert.equal((await page.goto(origin, { waitUntil: 'networkidle', timeout: 90000 })).status(), 200);
            await page.waitForFunction(() => document.querySelector('[data-ready="true"]') && window.__petSkeletonProbe?.rows.length === 6 && window.__petSkeletonProbe.state.scene.getObjectByName('body'), undefined, { timeout: 45000 });
            await page.addStyleTag({ content: 'nextjs-portal { display:none !important; }' });
            await frames(page);
            const rest = await snapshot(page), row = { ...def, needs, rest, idle: [], errors, failures };
            assert(rest.webgl);
            assert.equal(rest.dpr, 1);
            assert.equal(rest.clock, 0);
            if (def.pixels) {
                const canvasPath = path.join(out, phase + '-' + def.id + '-canvas.png'), homePath = path.join(out, phase + '-' + def.id + '-home.png');
                const canvas = await capture(page, canvasPath), home = await page.screenshot({ path: homePath });
                row.pixelFiles = { canvas: path.basename(canvasPath), home: path.basename(homePath) };
                if (phase === 'after') {
                    row.canvasDiff = await compare(page, fs.readFileSync(path.join(baselineDir, 'baseline-' + def.id + '-canvas.png')), canvas, path.join(out, def.id + '-canvas-diff.png'));
                    row.homeDiff = await compare(page, fs.readFileSync(path.join(baselineDir, 'baseline-' + def.id + '-home.png')), home, path.join(out, def.id + '-home-diff.png'));
                    if (row.canvasDiff.changedPixels || row.homeDiff.changedPixels) {
                        for (const kind of ['canvas', 'home'])
                            fs.copyFileSync(path.join(baselineDir, 'baseline-' + def.id + '-' + kind + '.png'), path.join(out, 'baseline-' + def.id + '-' + kind + '.png'));
                        cases.push(row);
                        fs.writeFileSync(path.join(out, 'after.json'), JSON.stringify({ status: 'STOPPED_ON_PIXEL_DIFFERENCE', baseline: original.base, cases, productionSourceUnchangedDuringRun: JSON.stringify(sourceSeal()) === JSON.stringify(initialSeal) }, null, 2) + '\n');
                        console.log('PIXEL_DIFFERENCE_STOP ' + JSON.stringify({ id: def.id, canvas: row.canvasDiff, home: row.homeDiff }));
                        process.exitCode = 2;
                        return;
                    }
                }
            }
            const frozen = original.cases.find(c => c.id === def.id);
            assertWorlds(rest, frozen.rest);
            const visible = rest.boxes.filter(b => b.visible);
            assert.equal(visible.length, 33 + def.n);
            assert.equal(rest.passes.length, 6);
            row.drawCalls = rest.passes.reduce((n, p) => n + p.calls, 0);
            assert.equal(row.drawCalls, 2 * (33 + def.n) + 5);
            if (phase === 'after') {
                assert.equal(rest.boxes.filter(b => !b.visible).length, 6);
                assert.equal(rest.joints.filter(j => j.id.startsWith('joint-')).length, 22);
                for (const j of rest.joints)
                    assert.deepEqual(j.scale, [1, 1, 1]);
            }
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await frames(page);
            const times = frozen.idle.map(c => c.time);
            for (const time of times) {
                await page.evaluate(t => window.__petSkeletonProbe.time = t, time);
                await frames(page);
                const state = await snapshot(page);
                assertWorlds(state, frozen.idle.find(s => s.time === time).state);
                row.idle.push({ time, state });
            }
            assert.deepEqual(errors, []);
            assert.deepEqual(failures, []);
            cases.push(row);
            fs.writeFileSync(path.join(out, phase + '-progress.json'), JSON.stringify({ phase, cases: cases.map(c => ({ id: c.id, drawCalls: c.drawCalls })) }, null, 2) + '\n');
            console.log('PASS ' + def.id + ' ' + row.drawCalls + ' draws; ' + row.idle.length + ' idle samples; JS0');
        }
        finally {
            await context.close();
        }
    }
    const report = { phase, status: 'PASS', worldMatrices, maxWorldCoefficientError, baseline: original.base, base: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), browser: browser.version(), renderer: 'Chromium SwiftShader; not mobile/GPU performance evidence', originalViewerSha256: originalViewerSha, sourceSeal: initialSeal, cases, protocol: 'Unmodified production source copied with symlinks preserved; fixture-only clock/seed/observer and admin forwarding. Original camera/DPR/shadow/home components. Same viewport390x844/DPR1/colors/API/reduced-motion. Pixel identity uses decoded RGBA including alpha, threshold0, no resizing. No production APIs. All renderer invocations counted; no debug/mask pass.' };
    assert.deepEqual(sourceSeal(), initialSeal);
    fs.writeFileSync(path.join(out, 'after.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('SKELETON_' + phase.toUpperCase() + '_PASS ' + cases.length + ' cases');
})().catch(e => { console.error(e.stack); process.exitCode = 1; }).finally(async () => { try {
    if (browser)
        await browser.close();
}
finally {
    await stop();
    if (fd !== undefined)
        fs.closeSync(fd);
    fs.rmSync(scratch, { recursive: true, force: true });
} console.log('OWNED_RESOURCES_STOPPED; no production-source instrumentation'); });
