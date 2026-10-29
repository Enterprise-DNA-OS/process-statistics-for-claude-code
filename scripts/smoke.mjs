import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb,REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run,COMMANDS,READS,parseArgs } from './stats.mjs';
import { describe,individuals,capability } from './lib/statistics.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'process-statistics-'));
process.env.DATA_DIR=path.join(dir,'db');process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';process.env.OUTPUT_DIR=dir;
const db=await getDb(),seen=new Set();
const call=async(c,o={},p=[])=>{const out=await run(db,c,o,p);seen.add(c);return out;};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
try{
 assert.equal((await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).length,0,'Smoke test requires an empty disposable database');
 assert.equal((await migrate(db)).ran.length,1);assert.equal((await migrate(db)).ran.length,0);
 await seed(db);const count=(await db.query('SELECT count(*) AS n FROM measurements'))[0].n;await seed(db);assert.equal((await db.query('SELECT count(*) AS n FROM measurements'))[0].n,count);
 for(const c of Object.keys(READS))assert.ok(Array.isArray(await call(c)));
 assert.equal((await call('help')).length,COMMANDS.length);
 const rows=[1,2,3,4].map((value,i)=>({row_number:i+1,value,measured_at:`2026-10-01T0${i}:00:00Z`}));
 const d=describe(rows);close(d.mean,2.5);close(d.median,2.5);close(d.sample_sd,Math.sqrt(5/3));
 const lim=individuals(rows);close(lim.center,2.5);close(lim.mr_mean,1);close(lim.upper,2.5+3/1.128);
 const shifted=individuals(rows.map(r=>({...r,value:r.value+100})),lim);assert.equal(shifted.signals.length,4);
 const gapped=[{value:1},{value:null},{value:100},{value:101}];close(individuals(gapped).mr_mean,1);
 assert.throws(()=>individuals([{value:1},{value:null},{value:2}]),/adjacent/);
 assert.throws(()=>individuals([{value:2},{value:2}]),/Zero/);
 assert.throws(()=>capability([{value:2},{value:2}],{lower_limit:1,upper_limit:3}),/nonzero/);
 const cp=capability(rows,{lower_limit:0,upper_limit:5});close(cp.pp,5/(6*Math.sqrt(5/3)));close(cp.ppk,2.5/(3*Math.sqrt(5/3)));
 assert.ok(capability(rows,{lower_limit:10,upper_limit:20}).ppk<0);
 close(describe([{value:0},{value:null},{value:2}]).mean,1);
 assert.throws(()=>parseArgs(['--bogus']),/name=value/);
 await assert.rejects(()=>call('series-nope'),/Unknown command/);
 await assert.rejects(()=>call('describe',{series:'Fill week',madeup:'x'}),/Unknown option/);
 assert.throws(()=>describe([{value:1e308},{value:-1e308}]),/Numeric range/);
 await assert.rejects(()=>call('show',{series:'30000000'}),/Ambiguous/);
 assert.equal((await call('show',{series:'fill WEEK'})).measurements.length,12);
 assert.equal((await call('measurements',{series:'Fill week'})).length,12);
 assert.equal((await call('describe',{series:'Fill week'})).missing,1);
 assert.equal((await call('batches',{series:'Fill week'})).length,2);
 assert.ok((await call('control-chart',{series:'Fill week'})).signals.some(x=>x.value===512));
 assert.equal((await call('capability',{series:'Fill week'})).outside_spec,1);
 assert.ok((await call('weekly-review')).attention.length>=3);
 const actor='Test operator';
 const p=await call('add-process',{name:'Test diameter',unit:'mm',owner:'Test lead',purpose:'Fixture study','review-due':'2030-01-01',actor});
 await assert.rejects(()=>call('set-spec',{process:p.id,lower:'NaN',upper:'2',reason:'test',actor}),/numeric/);
 await call('set-spec',{process:p.id,lower:'0',upper:'10',reason:'Fixture specification',actor});
 const io={process:p.id,name:'Imported fixture',file:path.join(REPO_ROOT,'fixtures/minitab.csv'),map:path.join(REPO_ROOT,'fixtures/minitab-map.json'),'review-due':'2030-01-01',actor};
 const before=(await db.query('SELECT count(*) AS n FROM series'))[0].n;
 const dry=await call('import',{...io,'dry-run':true},['minitab']);assert.equal(dry.rows,4);assert.equal(dry.missing,1);assert.equal((await db.query('SELECT count(*) AS n FROM series'))[0].n,before);
 const imp=await call('import',io,['minitab']);assert.equal(imp.rows,4);assert.equal((await call('import',io,['minitab'])).duplicate,true);
 assert.equal((await db.query('SELECT raw FROM measurements WHERE series_id=$1 ORDER BY row_number',[imp.id]))[0].raw.Fill,'499');
 for(const [name,text] of [
 ['bad-number','Measured,Fill,Batch\n2026-10-01T08:00:00Z,3,A\n2026-10-01T09:00:00Z,nope,A'],
 ['bad-date','Measured,Fill,Batch\n2026-02-30T08:00:00Z,3,A'],
 ['duplicate-time','Measured,Fill,Batch\n2026-10-01T08:00:00Z,3,A\n2026-10-01T08:00:00Z,4,A'],
 ['bad-csv','Measured,Fill,Batch\n"never closed,3,A'],
 ['missing-column','Measured,Other\n2026-10-01T08:00:00Z,3']]){
 const file=path.join(dir,name+'.csv');fs.writeFileSync(file,text);const n=(await db.query('SELECT count(*) AS n FROM series'))[0].n;await assert.rejects(()=>call('import',{...io,file},['minitab']));assert.equal((await db.query('SELECT count(*) AS n FROM series'))[0].n,n);
 }
 const quoted=path.join(dir,'quoted.csv');fs.writeFileSync(quoted,'\uFEFFMeasured,Fill,Batch\r\n2026-10-02T08:00:00Z,1,"A, one"\r\n2026-10-02T09:00:00Z,2,"B\nline"\r\n');
 const q=await call('import',{...io,file:quoted,name:'Quotes'},['minitab']);assert.equal((await call('measurements',{series:q.id}))[1].batch,'B\nline');
 const base=await call('analyse',{series:'Fill baseline',method:'individuals',actor,evidence:'Fixture baseline, not production approval'});
 const baselineCheck=await call('control-chart',{series:'Fill week',baseline:base.id});assert.equal(baselineCheck.signals.length,1);
 const saved=await call('analyse',{series:'Fill week',method:'capability',actor,evidence:'Exploratory fictional study'});
 await call('analyse',{series:'Fill week',method:'describe',actor,evidence:'Missing value noted'});
 await call('analyse',{series:'Fill week',method:'individuals',baseline:base.id,actor,evidence:'Compare fictional baseline'});
 await assert.rejects(()=>call('control-chart',{series:q.id,baseline:base.id}),/same process/);
 await call('set-spec',{process:'Bottle fill',lower:'490',upper:'510',reason:'Changed fixture specification',actor});
 const historical=(await db.query('SELECT * FROM analyses WHERE id=$1',[saved.id]))[0];assert.equal(historical.result.upper_spec,505);assert.equal((await call('capability',{series:'Fill week'})).upper_spec,510);
 const a=await call('add-action',{series:'Fill week',text:'Inspect fixture sensor',owner:'Test lead',due:'2030-01-01',actor});
 await assert.rejects(()=>call('close-action',{action:a.id,actor}),/evidence/);
 assert.equal((await call('close-action',{action:a.id,actor,evidence:'Fixture check recorded'})).status,'closed');
 await assert.rejects(()=>call('close-action',{action:a.id,actor,evidence:'again'}),/already closed/);
 await call('log',{series:'Fill week',text:'<script>alert(1)</script> fixture note',actor});
 for(const c of ['draft-analysis','draft-review']){const out=await call(c,c==='draft-analysis'?{analysis:saved.id}:{});assert.ok(fs.readFileSync(out.file,'utf8').includes('<html'));}
 const archive=path.join(dir,'backup.json');await call('export',{out:archive});const json=JSON.parse(fs.readFileSync(archive));assert.equal(Object.keys(json.tables).length,8);assert.ok(json.tables.analyses.some(x=>x.id===saved.id));await assert.rejects(()=>call('export',{out:archive}),/EEXIST/);
 assert.ok((await call('activity')).length>=10);assert.deepEqual(COMMANDS.filter(c=>!seen.has(c)),[]);
 await db.close();
 const child=(script,args=[])=>{const r=spawnSync(process.execPath,[script,...args],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;};
 const cli=JSON.parse(child('scripts/stats.mjs',['describe','--series=Fill week','--json']));assert.equal(cli.n,11);
 const ambiguous=spawnSync(process.execPath,['scripts/stats.mjs','show','--series=30000000'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});assert.equal(ambiguous.status,1);assert.match(ambiguous.stderr,/Ambiguous/);
 child('scripts/view.mjs');child('scripts/docs.mjs');
 const invDir=path.join(dir,'docs-out/investigation');const docs=fs.readdirSync(invDir).map(f=>fs.readFileSync(path.join(invDir,f),'utf8')).join('');assert.ok(docs.includes('&lt;script&gt;'));assert.ok(!docs.includes('<script>'));
 assert.ok(fs.existsSync(path.join(dir,'views/week.html')));
 console.log(`PASS: ${COMMANDS.length} CLI operations; numeric references, fixed baselines, atomic imports, historical specifications, idempotent seed, drafts, exports, HTML escaping and CLI exit codes (${process.env.TEST_DATABASE_URL?'Postgres':'PGlite'}).`);
}finally{try{await db.close();}catch{}fs.rmSync(dir,{recursive:true,force:true});}
