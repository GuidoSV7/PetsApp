const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const {createRequire}=require('node:module');
const repo=process.cwd(),req=createRequire(path.join(repo,'frontend/package.json')),ts=req('typescript');
const copy=o=>JSON.parse(JSON.stringify(o)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const colors={primary:'#6b7280',secondary:'#9ca3af',accent:'#c9a0a8'};
async function probe(root){
  const React=req('react'),{renderToStaticMarkup}=req('react-dom/server'),{JSDOM}=req('jsdom');
  const three=await import(req.resolve('three').replace(/three\.cjs$/,'three.module.js'));let server,requests,counter;
  const api={get:async(...a)=>request('GET',...a),post:async(...a)=>request('POST',...a)};
  async function request(method,url,payload,options){if(method==='GET'){options=payload;payload=undefined;}requests.push({method,url,payload,headers:options.headers});
    if(url==='/pet/coat') {if(Object.hasOwn(payload,'pattern')&&!['solid','tabby','tuxedo','calico','pointed'].includes(payload.pattern)){const error=new Error('Fixture HTTP400 invalid pattern');error.status=400;throw error;}server.coat={...server.coat,...payload};counter++;}
    if(url==='/pet/name'){server.name=payload.name;counter++;}if(url.startsWith('/pet/actions/'))counter++;
    return {data:copy(server)};
  }
  const cache=new Map(),context=vm.createContext({console,process,crypto,Uint32Array,Map,Set,window:{localStorage:{getItem:()=> '11111111-1111-4111-8111-111111111111',setItem(){}}}});
  function load(file){if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);
    const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    function localRequire(id){if(id==='@/lib/axios')return {__esModule:true,default:api};if(id==='@react-three/fiber')return {useFrame(){}};if(id==='three')return three;if(id.startsWith('@/')){const base=path.join(root,'src',id.slice(2));return load([base+'.ts',base+'.tsx',path.join(base,'index.ts')].find(fs.existsSync));}return req(id);}
    vm.runInContext('(function(require,module,exports){'+js+'\n})',context,{filename:file})(localRequire,module,module.exports);return module.exports;
  }
  const service=load(path.join(root,'src/features/pet-home/api/pet.service.ts')),rows=[];
  for(const [kind,pattern]of[['missing',undefined],['calico','calico'],['future','future']])for(const [name,args]of[['fetchPetState',[]],['applyPetAction',['pet']],['renamePet',['Luna']],['applyPetCoat',[colors]]]){
    server={coins:5,needs:{hunger:80,fun:80,energy:80,hygiene:80},coat:{...colors,...(pattern===undefined?{}:{pattern})},statusKey:'idle',mood:'Feliz',name:'Michi',renameCount:0,unrelated:'preserve'};requests=[];counter=0;
    const result=await service[name](...args);rows.push({id:name+'/'+kind,type:'api',result,requests,stored:copy(server),counter});
  }
  for(const pattern of['future',null]){server={coat:{...colors,pattern:'calico'}};requests=[];counter=0;let error;try{await service.applyPetCoat({...colors,pattern});}catch(e){error={message:e.message,status:e.status};}rows.push({id:'invalid-write/'+String(pattern),type:'api',error,requests,stored:copy(server),counter});}
  delete context.window;
  const {Cat3DModel}=load(path.join(root,'src/features/pet-home/components/Cat3DModel.tsx'));
  for(const pattern of[undefined,'solid','tabby','tuxedo','calico','pointed','future'])for(const need of[100,0]){
    const markup=renderToStaticMarkup(React.createElement(Cat3DModel,{colors:{...colors,...(pattern===undefined?{}:{pattern})},needs:{hunger:need,fun:need,energy:need,hygiene:need}}));
    const dom=new JSDOM(markup),body=dom.window.document.body,patches=[...body.querySelectorAll('mesh')].filter(m=>/^(tabby|tuxedo|calico|pointed)-/.test(m.getAttribute('name')??''));const patchCount=patches.length;patches.forEach(m=>m.remove());
    rows.push({id:'model/'+String(pattern)+'/'+need,type:'model',patchCount,baseMarkup:body.innerHTML,fullMarkupSha256:hash(markup)});dom.window.close();
  }
  process.stdout.write(JSON.stringify(rows));
}
if(process.argv[2]==='--probe'){probe(process.argv[3]).catch(e=>{console.error(e.stack);process.exitCode=1;});}
else{
  const archive=path.join(repo,'.git/agent-evidence'),scratch=fs.mkdtempSync(path.join(archive,'coat-differential-'));let report;
  try{
    const tar=path.join(scratch,'base.tar');execFileSync('git',['archive','HEAD','--format=tar','-o',tar,'frontend'],{cwd:repo});execFileSync('tar',['-xf',tar,'-C',scratch]);const base=path.join(scratch,'frontend');fs.symlinkSync(path.join(repo,'frontend/node_modules'),path.join(base,'node_modules'),'dir');
    const outputs=[];
    for(const [label,root]of[['base',base],['candidate',path.join(repo,'frontend')]]){const p=spawnSync(process.execPath,[__filename,'--probe',root],{cwd:repo,encoding:'utf8',maxBuffer:8e6,env:{...process.env,NODE_ENV:'production'}});for(const ext of['stdout','stderr'])fs.writeFileSync(path.join(archive,'coat-pattern-differential-'+label+'.'+ext),p[ext]);fs.writeFileSync(path.join(archive,'coat-pattern-differential-'+label+'.exit-code'),String(p.status)+'\n');assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');outputs.push(JSON.parse(p.stdout));}
    const [a,b]=outputs;assert.equal(a.length,b.length);const observations=[];
    for(let i=0;i<a.length;i++){assert.equal(a[i].id,b[i].id);let expected='unchanged';
      if(a[i].type==='api'){
        const old=copy(a[i]),now=copy(b[i]);if(old.result){const raw=old.result.coat.pattern;old.result.coat.pattern=['solid','tabby','tuxedo','calico','pointed'].includes(raw)?raw:'solid';if(JSON.stringify(a[i])!==JSON.stringify(old))expected='requested read normalization only';}assert.deepEqual(now,old,a[i].id);
      }else{assert.equal(a[i].patchCount,0);assert.equal(b[i].baseMarkup,a[i].baseMarkup,a[i].id+' base33 changed');const p=a[i].id.split('/')[1],n={tabby:8,tuxedo:8,calico:5,pointed:12}[p]??0;assert.equal(b[i].patchCount,n);if(n)expected='requested child meshes only';else assert.equal(b[i].fullMarkupSha256,a[i].fullMarkupSha256);}
      observations.push({id:a[i].id,classification:expected,pass:true});
    }
    report={status:'passed',baseline:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),observations,total:observations.length,unchanged:observations.filter(r=>r.classification==='unchanged').length,requested:observations.filter(r=>r.classification!=='unchanged').length,unexpected:0,limits:'Public frontend service with deterministic Axios/backend stub and actual-model SSR; not real HTTP/backend/WebGL proof. stdout/stderr/exit codes preserved for both isolated baseline and current source. No committed test reads git history.',cleanup:'Owned baseline copy and symlink removed; HOME unchanged'};
    fs.writeFileSync(path.join(archive,'coat-pattern-differential.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
}
