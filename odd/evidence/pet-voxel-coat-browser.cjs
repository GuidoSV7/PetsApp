const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const repo = process.cwd();
const archive = path.join(repo, '.git/agent-evidence');
const evidence = path.join(repo, 'frontend/openspec/changes/pet-voxel-coat-patterns/evidence', process.env.PET_COAT_EVIDENCE_LABEL || '');
const scratch = fs.mkdtempSync(path.join(archive, 'coat-browser-'));
const fixture = path.join(scratch, 'frontend');
const serverLog = path.join(archive, 'coat-pattern-browser-server.log');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
let server, browser, fd, port;
const cases = [];
const presets = [
  ['tabby','Atigrado',12,{primary:'#6b7280',secondary:'#9ca3af',accent:'#c9a0a8'}],
  ['tuxedo','Esmoquin',8,{primary:'#1f1f22',secondary:'#f2f0ec',accent:'#c9a0a8'}],
  ['calico','Calicó',4,{primary:'#c4a574',secondary:'#f0ebe3',accent:'#8b5a2b'}],
  ['pointed','Siamés',12,{primary:'#efe3cf',secondary:'#f7efe2',accent:'#5a4032'}],
].filter(([pattern]) => (process.env.PET_COAT_PATTERNS || 'tabby,tuxedo,calico,pointed').split(',').includes(pattern));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function freePort() { const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p; }
async function ready(origin) {
  const deadline=Date.now()+90000;
  while(Date.now()<deadline) {
    if(server.exitCode!==null) throw Error('Owned Next server exited');
    try { const r=await fetch(origin,{signal:AbortSignal.timeout(2000)});if(r.status===200&&(await r.text()).includes('PetsApp')) return; } catch {}
    await pause(300);
  }
  throw Error('Owned server readiness timeout');
}
async function stopServer() {
  if(!server||server.exitCode!==null||server.signalCode!==null)return;
  const exited=once(server,'exit');process.kill(-server.pid,'SIGTERM');let timer;
  const stopped=await Promise.race([exited.then(()=>true),new Promise(r=>{timer=setTimeout(()=>r(false),5000);})]);clearTimeout(timer);
  if(!stopped){process.kill(-server.pid,'SIGKILL');await exited;}
}
async function frames(page) {await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function snapshot(page) {
  return page.evaluate(()=>{
    const p=window.__petCoatProbe,s=p.state,canvas=s.gl.domElement,boxes=[],shadows=[];
    s.scene.traverse(o=>{if(o.isMesh&&o.geometry?.type==='BoxGeometry')boxes.push({name:o.name,uuid:o.uuid,parent:o.parent.name,matrix:[...o.matrixWorld.elements]});if(o.isMesh&&o.material?.map?.isRenderTargetTexture)shadows.push([o.material.map.image.width,o.material.map.image.height]);});
    const root=s.scene.getObjectByName('body').parent;
    const gl=s.gl.getContext(),rect=canvas.getBoundingClientRect();
    return {boxes,rootUuid:root.uuid,rootYaw:root.rotation.y,rootPosition:root.position.toArray(),rootScale:root.scale.toArray(),clock:s.clock.getElapsedTime(),camera:{position:s.camera.position.toArray(),quaternion:s.camera.quaternion.toArray(),projection:[...s.camera.projectionMatrix.elements]},dpr:s.gl.getPixelRatio(),buffer:[canvas.width,canvas.height],css:[rect.width,rect.height],webgl:!!gl,contextLost:gl.isContextLost(),glError:gl.getError(),shadows,passes:p.rows.map(r=>({...r})),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  });
}
async function framebuffer(page,file) {
  const data=await page.evaluate(()=>window.__petCoatProbe.capture());
  const png=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(path.join(evidence,file),png);return png;
}
async function matte(page,file) {
  const data=await page.evaluate(()=>window.__petCoatProbe.matte());
  const png=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(path.join(evidence,file),png);return png;
}
async function metrics(page,solid,pattern,solidMask,patternMask) {
  return page.evaluate(async encoded=>{
    async function pixels(data){const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);return {w:c.width,h:c.height,p:x.getImageData(0,0,c.width,c.height).data};}
    const [a,b,ma,mb]=await Promise.all(encoded.map(pixels));for(const p of[b,ma,mb])if(p.w!==a.w||p.h!==a.h)throw Error('Mask/capture dimensions differ');
    let catPixels=0,changedPixels=0;const colors=new Set();
    for(let i=0;i<a.p.length;i+=4){if(ma.p[i]<128&&mb.p[i]<128)continue;catPixels++;const delta=Math.max(...[0,1,2].map(c=>Math.abs(a.p[i+c]-b.p[i+c])));if(delta>=8)changedPixels++;colors.add([b.p[i],b.p[i+1],b.p[i+2]].join(','));}
    if(!catPixels||colors.size<30)throw Error('Blank canvas or empty mask');return {width:a.w,height:a.h,catPixels,changedPixels,changedPercent:100*changedPixels/catPixels,thresholdRgb:8,uniqueCatColors:colors.size,mask:'Union of same-camera white cat-only geometry mattes, 4-sample MSAA threshold128; background/floor/contact shadow hidden; not a canvas rectangle'};
  },[solid,pattern,solidMask,patternMask].map(b=>b.toString('base64')));
}
function costs(state,n) {
  assert.equal(state.passes.length,6,'Expected depth + four blur + main passes');
  const depth=state.passes.filter(p=>p.kind==='contact-depth'),main=state.passes.filter(p=>p.kind==='main'),blur=state.passes.filter(p=>p.kind==='contact-blur');
  assert.equal(depth.length,1);assert.equal(main.length,1);assert.equal(blur.length,4);
  assert.deepEqual(depth.map(p=>[p.calls,p.triangles]),[[33+n,396+12*n]]);
  assert.deepEqual(main.map(p=>[p.calls,p.triangles]),[[34+n,398+12*n]]);
  assert(blur.every(p=>p.calls===1&&p.triangles===2));
  return {passes:state.passes,drawCalls:state.passes.reduce((s,p)=>s+p.calls,0),triangles:state.passes.reduce((s,p)=>s+p.triangles,0),instrumentationMattePassesExcluded:true};
}
(async()=>{
  assert.equal(process.env.HOME,'/home/agent');fs.mkdirSync(evidence,{recursive:true});
  console.log('Current-source isolated browser fixture; no production API; HOME='+process.env.HOME+' Node='+process.version);
  const tar=path.join(scratch,'base.tar');execFileSync('git',['archive','HEAD','--format=tar','-o',tar,'frontend'],{cwd:repo});execFileSync('tar',['-xf',tar,'-C',scratch]);
  fs.cpSync(path.join(repo,'frontend/src'),path.join(fixture,'src'),{recursive:true,dereference:false});fs.symlinkSync(path.join(repo,'frontend/node_modules'),path.join(fixture,'node_modules'),'dir');
  const viewer=path.join(fixture,'src/features/pet-home/components/Cat3DViewer.tsx');let source=fs.readFileSync(viewer,'utf8');const originalViewerSha=sha(source);
  function replace(a,b){assert.equal(source.split(a).length,2,'Unique fixture insertion: '+a);source=source.replace(a,b);}
  replace('import { Canvas } from "@react-three/fiber";','import { Canvas, useFrame } from "@react-three/fiber";\nimport { MeshBasicMaterial, WebGLRenderTarget, Color } from "three";');
  replace('const performanceBounds',`function CoatBrowserProbe() {
  useFrame(state => {
    state.clock.getElapsedTime = () => 0;
    const w = window as any;
    if (!w.__petCoatProbe) {
      const renderer = state.gl, originalRender = renderer.render;
      const probe: any = { state, rows: [], disabled: false };
      renderer.info.autoReset = false;
      renderer.render = function(scene: any, camera: any) {
        const before = { ...renderer.info.render };
        const target = renderer.getRenderTarget();
        const result = originalRender.call(renderer, scene, camera);
        if (!probe.disabled) {
          probe.rows.push({kind: target === null ? "main" : scene.overrideMaterial?.type === "MeshDepthMaterial" ? "contact-depth" : "contact-blur", calls: renderer.info.render.calls - before.calls, triangles: renderer.info.render.triangles - before.triangles});
          if (target === null && probe.captureNext) {const done=probe.captureNext;probe.captureNext=null;done(renderer.domElement.toDataURL("image/png"));}
        }
        return result;
      };
      probe.capture = () => new Promise(resolve => {probe.captureNext=resolve;state.invalidate();});
      probe.matte = () => {
        const scene = state.scene, previousTarget = renderer.getRenderTarget(), override = scene.overrideMaterial, background = scene.background;
        const clear = renderer.getClearColor(new Color()).clone(), alpha = renderer.getClearAlpha();
        const material = new MeshBasicMaterial({color: 0xffffff, toneMapped: false});
        const target = new WebGLRenderTarget(renderer.domElement.width, renderer.domElement.height, {samples: 4});
        const hidden: any[] = [];
        probe.disabled = true;
        try {
          scene.traverse((o: any) => { if (o.isMesh && o.geometry?.type !== "BoxGeometry") {hidden.push([o,o.visible]);o.visible=false;} });
          scene.overrideMaterial = material;scene.background = null;
          renderer.setRenderTarget(target);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(scene,state.camera);
          const bytes = new Uint8Array(target.width*target.height*4);renderer.readRenderTargetPixels(target,0,0,target.width,target.height,bytes);
          const canvas = document.createElement("canvas");canvas.width=target.width;canvas.height=target.height;
          const ctx=canvas.getContext("2d")!,image=ctx.createImageData(canvas.width,canvas.height);
          for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const to=(y*canvas.width+x)*4,from=((canvas.height-1-y)*canvas.width+x)*4;const white=bytes[from+3]>=128?255:0;image.data[to]=image.data[to+1]=image.data[to+2]=white;image.data[to+3]=255;}
          ctx.putImageData(image,0,0);return canvas.toDataURL("image/png");
        } finally {for(const [o,visible] of hidden)o.visible=visible;scene.overrideMaterial=override;scene.background=background;renderer.setRenderTarget(previousTarget);renderer.setClearColor(clear,alpha);material.dispose();target.dispose();probe.disabled=false;}
      };
      w.__petCoatProbe=probe;
    }
    w.__petCoatProbe.state=state;w.__petCoatProbe.rows=[];state.gl.info.reset();
  },-100);
  return null;
}
const performanceBounds`);
  replace('        <PerformanceMonitor','        <CoatBrowserProbe />\n        <PerformanceMonitor');
  fs.writeFileSync(viewer,source);fs.writeFileSync(path.join(archive,'coat-pattern-browser-fixture-viewer.tsx'),source);
  port=await freePort();assert(![3000,3001].includes(port));const origin='http://127.0.0.1:'+port;fd=fs.openSync(serverLog,'w');
  server=spawn(process.execPath,[path.join(repo,'frontend/node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:fixture,detached:true,stdio:['ignore',fd,fd],env:{...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY:'',NEXT_PUBLIC_PETSAPP_API_URL:'/petsapp-api',PETSAPP_API_INTERNAL_URL:'http://127.0.0.1:9',FORCE_COLOR:'0'}});
  await ready(origin);
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  for(const [pattern,label,n,palette] of presets)for(const [pose,need] of [['normal',100],['zero',0]]){
    console.log('CAPTURE '+pattern+'/'+pose+': same-palette solid then real preset click');
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      const page=await context.newPage(),pageErrors=[],consoleErrors=[],requestFailures=[],requests=[];
      page.on('pageerror',e=>pageErrors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
      let state={coins:5,needs:{hunger:need,fun:need,energy:need,hygiene:need},coat:{...palette,pattern:'solid'},statusKey:'idle',mood:need?'Feliz':'Bajo',name:'Michi',renameCount:0};
      await page.addInitScript(()=>{localStorage.clear();localStorage.setItem('petsapp_session_v1',JSON.stringify({token:'isolated-browser-fixture',user:{id:'11111111-1111-4111-8111-111111111111',name:'Fixture',email:'fixture@example.test',role:'member',roles:['member'],country:null}}));});
      await page.route('**/*',async route=>{
        const request=route.request(),url=new URL(request.url());if(url.origin!==origin)return route.abort('blockedbyclient');
        if(url.pathname.startsWith('/petsapp-api/')){
          const body=request.postDataJSON(),row={method:request.method(),pathname:url.pathname,body};requests.push(row);
          if(row.method==='GET'&&row.pathname==='/petsapp-api/pet/state'){}
          else if(row.method==='POST'&&row.pathname==='/petsapp-api/pet/coat') {assert.equal(typeof body.primary,'string');assert.deepEqual(Object.keys(body).sort(),Object.hasOwn(body,'pattern')?['accent','pattern','primary','secondary']:['accent','primary','secondary']);state={...state,coat:{...state.coat,...body}};}
          else if(row.method==='POST'&&row.pathname==='/petsapp-api/pet/actions/pet')assert.deepEqual(body,{});
          else throw Error('Unexpected fixture API '+JSON.stringify(row));
          return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(state)});
        }return route.continue();
      });
      assert.equal((await page.goto(origin,{waitUntil:'networkidle',timeout:90000})).status(),200);
      await page.waitForFunction(()=>document.querySelector('[data-ready="true"]')&&window.__petCoatProbe?.rows.length===6&&window.__petCoatProbe.state.scene.getObjectByName('body'),undefined,{timeout:45000});await frames(page);
      const canvas=page.locator('canvas[data-engine^="three.js"]');assert.equal(await canvas.count(),1);
      const before=await snapshot(page);assert.equal(before.boxes.length,33);assert.equal(before.dpr,1);assert.equal(before.clock,0);assert.equal(before.rootYaw,0);assert(before.webgl&&!before.contextLost&&before.glError===0);assert.deepEqual(before.shadows,[[256,256]]);
      const solidFile=pattern+'-'+pose+'-solid.png',patternFile=pattern+'-'+pose+'.png';
      const solid=await canvas.screenshot({path:path.join(evidence,solidFile)}),solidBuffer=await framebuffer(page,pattern+'-'+pose+'-solid-buffer.png'),solidMask=await matte(page,pattern+'-'+pose+'-solid-mask.png');const solidCost=costs(before,0);
      await page.getByRole('button',{name:'Personalizar',exact:true}).click();
      const selected=page.getByRole('button',{name:'Pelaje '+label,exact:true});await selected.click();
      await page.waitForFunction(wanted=>{let count=0;window.__petCoatProbe.state.scene.traverse(o=>{if(o.isMesh&&o.geometry?.type==='BoxGeometry')count++;});return count===33+wanted;},n);
      await page.waitForFunction(text=>document.querySelector('[aria-label="Pelaje '+text+'"]')?.getAttribute('aria-pressed')==='true',label);await frames(page);
      assert.deepEqual(state.coat,{...palette,pattern});
      const after=await snapshot(page);assert.equal(after.rootYaw,0);assert.equal(after.clock,0);assert.equal(after.rootUuid,before.rootUuid);assert.deepEqual(after.boxes.filter(o=>!o.name.startsWith(pattern+'-')),before.boxes);assert.deepEqual(after.camera,before.camera);assert.equal(after.dpr,before.dpr);assert.deepEqual(after.buffer,before.buffer);assert.deepEqual(after.shadows,[[256,256]]);
      const image=await canvas.screenshot({path:path.join(evidence,patternFile)}),imageBuffer=await framebuffer(page,pattern+'-'+pose+'-buffer.png'),mask=await matte(page,pattern+'-'+pose+'-mask.png');const actualMetrics=await metrics(page,solidBuffer,imageBuffer,solidMask,mask),patternCost=costs(after,n);
      const rect=await canvas.boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.56,{steps:8});await page.mouse.up();await frames(page);
      const orbited=await snapshot(page);assert(orbited.camera.quaternion.some((v,i)=>Math.abs(v-after.camera.quaternion[i])>1e-5),'Orbit did not move camera');
      const target=await page.evaluate(()=>{const s=window.__petCoatProbe.state,p=s.camera.position.clone();s.scene.getObjectByName('body').getWorldPosition(p);p.project(s.camera);const r=s.gl.domElement.getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
      const response=page.waitForResponse(r=>r.url()===origin+'/petsapp-api/pet/actions/pet'&&r.request().method()==='POST'&&r.status()===200);await page.mouse.click(target.x,target.y);await response;
      let cameraControl=null;
      if(pattern==='calico'&&pose==='normal'){
        await page.getByRole('button',{name:'Colores de mi gato',exact:true}).click();await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.videoWidth>=2&&!v.hidden;});
        const saved=page.waitForResponse(r=>r.url()===origin+'/petsapp-api/pet/coat'&&r.request().method()==='POST'&&!Object.hasOwn(r.request().postDataJSON(),'pattern')&&r.status()===200);
        await page.getByRole('button',{name:'Capturar colores',exact:true}).click();await saved;assert.equal(state.coat.pattern,'calico');
        const cameraWrite=requests.filter(r=>r.pathname==='/petsapp-api/pet/coat').at(-1);assert.deepEqual(Object.keys(cameraWrite.body).sort(),['accent','primary','secondary']);
        await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__petCoatProbe&&window.__petCoatProbe.state.scene.getObjectByName('calico-head-0'));
        cameraControl={realSyntheticCamera:true,threeColorWriteOnly:true,serverAndReloadPattern:'calico',changedPalette:state.coat};
      }
      assert.deepEqual(pageErrors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(requestFailures,[]);assert.equal((await snapshot(page)).glError,0);
      const row={pattern,label,pose,needs:need,palette,patches:n,solid:{path:solidFile,sha256:sha(solid),measurementBuffer:pattern+'-'+pose+'-solid-buffer.png',mask:pattern+'-'+pose+'-solid-mask.png',cost:solidCost},patternCapture:{path:patternFile,sha256:sha(image),measurementBuffer:pattern+'-'+pose+'-buffer.png',mask:pattern+'-'+pose+'-mask.png',cost:patternCost},metrics:actualMetrics,floorPassed:actualMetrics.changedPercent>=3,view:{viewport:[390,844],dpr:before.dpr,buffer:before.buffer,camera:before.camera,rootPosition:before.rootPosition,rootScale:before.rootScale,rootYaw:0,clock:0,reducedMotion:true,shadow:256},same33BaseInstancesAndMatrices:true,orbitMovedCamera:true,realRaycastTap:true,cameraControl,pageErrors,consoleErrors,requestFailures,requests};cases.push(row);
      fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify({status:'in_progress',cases},null,2)+'\n');console.log('MEASURED '+pattern+'/'+pose+' '+actualMetrics.changedPercent.toFixed(4)+'%; '+patternCost.drawCalls+' draws/'+patternCost.triangles+' triangles; orbit/tap PASS; JS0');
    } finally {await context.close();}
  }
  const report={status:cases.every(c=>c.floorPassed)?'awaiting_human_visual_decision':'pixel_floor_failed_needs_human_decision',browser:browser.version(),renderer:'Chromium SwiftShader, not phone/GPU performance proof',baseline:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),originalViewerSha256:originalViewerSha,fixtureViewerSha256:sha(source),protocol:'Current src copied with symlinks preserved. Fixture-only observer freezes clock at0 and measures actual renderer counters (autoReset false/reset once per frame); model/palette/quality/camera/shadow rules unmodified. OS reduced-motion holds default rest yaw0. Physical device DPR1 naturally clamps adaptive DPR1 without bypassing its policy. Pattern is selected through real Personalizar UI/API stub on same mounted model and same preset palette as solid. Original CSS canvas screenshots are delivered unchanged (fractional layout can yield280x281 while the drawingbuffer is280x280). Metrics use unretouched PNGs read directly at the end of a requested real main render, aligned1:1 with actual280x280 cat mattes; masks are not resized or shifted. Offscreen matte passes are explicitly excluded from measured six-pass frames. No production requests.',cases,humanVisualDecision:'PENDING — mandatory stop before review.md/native RDD; >=3% is only a floor, never recognizability approval',independentVerifier:'UNEXECUTED by human exception; not approved',backendProductionPattern:'UNVERIFIED; hard merge prerequisite',cleanup:'Exit0 requires owned browser/server stopped, ephemeral port released and scratch copy removed'};
  fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log(cases.length+'_PATTERN_CAPTURES_READY; STOP FOR HUMAN; floors='+cases.every(c=>c.floorPassed));
})().catch(e=>{console.error(e.stack);if(fs.existsSync(serverLog))console.error(fs.readFileSync(serverLog,'utf8').split('\n').slice(-30).join('\n'));process.exitCode=1;}).finally(async()=>{
  try{if(browser)await browser.close();}finally{await stopServer();if(fd!==undefined)fs.closeSync(fd);fs.rmSync(scratch,{recursive:true,force:true});}
  if(port){const s=net.createServer();await new Promise((r,j)=>{s.once('error',j);s.listen(port,'127.0.0.1',r);});await new Promise(r=>s.close(r));}
  console.log('OWNED_RESOURCES_STOPPED; port released; temporary source removed; product worktree not instrumented');
});
