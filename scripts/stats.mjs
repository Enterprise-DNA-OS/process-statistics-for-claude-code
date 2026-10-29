#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb } from './lib/db.mjs';
import { parseCsv } from './lib/csv.mjs';
import { describe, individuals, capability } from './lib/statistics.mjs';
import { page, table, record, writeOut } from './lib/render.mjs';
export const TABLES=['processes','specifications','series','measurements','analyses','actions','notes','audit_events'];
export const READS={
 processes:'SELECT * FROM processes ORDER BY name',
 series:'SELECT * FROM v_series ORDER BY name',
 specifications:'SELECT p.name AS process,s.* FROM specifications s JOIN processes p ON p.id=s.process_id ORDER BY p.name,s.revision',
 analyses:'SELECT a.id,s.name AS series,a.method,a.input_sha,a.actor,a.created_at FROM analyses a JOIN series s ON s.id=a.series_id ORDER BY a.created_at,a.id',
 actions:'SELECT * FROM actions ORDER BY due,id',
 notes:'SELECT * FROM notes ORDER BY created_at,id',
 activity:'SELECT * FROM audit_events ORDER BY created_at,id',
 attention:'SELECT * FROM v_attention ORDER BY due,record',
 compliance:'SELECT * FROM v_compliance ORDER BY finding,record',
 week:'SELECT * FROM v_week ORDER BY process',
 imports:'SELECT id,name,source_name,source_sha,map_sha,mapping,actor FROM series ORDER BY created_at,id'
};
export const COMMANDS=[...Object.keys(READS),'help','show','measurements','describe','control-chart','capability','batches','weekly-review','add-process','set-spec','import','analyse','add-action','close-action','log','export','draft-analysis','draft-review'];
const digest=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
function required(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k} is required`);return o[k].trim();}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Date must be a valid YYYY-MM-DD');return v;}
function number(v){if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(String(v).trim())||!Number.isFinite(Number(v)))throw Error(`Invalid numeric measurement: ${v}`);return Number(v);}
function timestamp(v){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Measurement time must include date, time and timezone');date(v.slice(0,10));return new Date(v).toISOString();}
export async function resolve(db,tab,ref){
 if(!TABLES.includes(tab))throw Error('Unknown entity');
 const label=['processes','series'].includes(tab)?'name':tab==='actions'?'title':'id::text';
 const rows=await db.query(`SELECT * FROM ${tab} WHERE id::text ILIKE $1 OR lower(${label})=lower($2) ORDER BY id`,[String(ref)+'%',String(ref)]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${tab}: ${rows.map(x=>`${x.id} ${x.name||x.title||x.method||''}`).join('; ')}`:`No ${tab} matching ${ref}`);
 return rows[0];
}
async function audit(db,operation,id,actor,detail){await db.query('INSERT INTO audit_events(operation,record_id,actor,detail) VALUES($1,$2,$3,$4)',[operation,id,actor,JSON.stringify(detail)]);}
async function transaction(db,fn){await db.exec('BEGIN');try{const out=await fn();await db.exec('COMMIT');return out;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function data(db,o){const s=await resolve(db,'series',required(o,'series'));const rows=await db.query('SELECT row_number,measured_at,value,batch FROM measurements WHERE series_id=$1 ORDER BY measured_at,row_number',[s.id]);return {s,rows};}
async function calculation(db,o,method){
 const {s,rows}=await data(db,o);
 const spec=(await db.query('SELECT * FROM v_current_specs WHERE process_id=$1',[s.process_id]))[0]||null;
 let baseline=null;
 if(o.baseline&&method!=='individuals')throw Error('A fixed baseline is only used for individuals analysis');
 if(o.baseline){baseline=await resolve(db,'analyses',o.baseline);const bs=await resolve(db,'series',baseline.series_id);if(baseline.method!=='individuals'||bs.process_id!==s.process_id)throw Error('Baseline must be an individuals analysis for the same process');}
 const result=method==='describe'?describe(rows):method==='individuals'?individuals(rows,baseline?.result):capability(rows,spec);
 const finite=v=>{if(typeof v==='number'&&!Number.isFinite(v))throw Error('Numeric range exceeds safe calculation limits');if(v&&typeof v==='object')Object.values(v).forEach(finite);};finite(result);
 return {s,rows,spec,baseline,result,input_sha:digest(rows)};
}
export async function run(db,command,o={},pos=[]){
 const allowed={
  show:['series'],measurements:['series'],describe:['series'],batches:['series'],
  'control-chart':['series','baseline'],capability:['series'],
  'add-process':['name','unit','owner','review-due','purpose','actor'],
  'set-spec':['process','lower','upper','reason','actor'],
  import:['process','actor','name','review-due','file','map','dry-run'],
  analyse:['method','series','baseline','actor','evidence'],
  'add-action':['series','text','owner','due','actor'],
  'close-action':['action','actor','evidence'],log:['series','actor','text'],
  export:['out'],'draft-analysis':['analysis']
 };
 for(const k of Object.keys(o))if(k!=='json'&&!(allowed[command]||[]).includes(k))throw Error(`Unknown option --${k} for ${command}`);
 if(READS[command])return db.query(READS[command]);
 if(command==='help')return COMMANDS.map(command=>({command}));
 if(command==='show'){const {s,rows}=await data(db,o);return {series:s,measurements:rows,notes:await db.query('SELECT * FROM notes WHERE series_id=$1 ORDER BY created_at',[s.id]),actions:await db.query('SELECT * FROM actions WHERE series_id=$1 ORDER BY due',[s.id])};}
 if(command==='measurements')return (await data(db,o)).rows;
 if(command==='batches'){const {rows}=await data(db,o);return [...new Set(rows.map(x=>x.batch))].map(batch=>({batch,...(rows.some(x=>x.batch===batch&&x.value!==null)?describe(rows.filter(x=>x.batch===batch)):{n:0,missing:rows.filter(x=>x.batch===batch).length})}));}
 if(['describe','control-chart','capability'].includes(command))return (await calculation(db,o,command==='control-chart'?'individuals':command)).result;
 if(command==='weekly-review')return {week:await run(db,'week'),attention:await run(db,'attention'),compliance:await run(db,'compliance')};
 if(command==='add-process'){
  const vals=[required(o,'name'),required(o,'unit'),required(o,'owner'),date(required(o,'review-due')),required(o,'purpose')],actor=required(o,'actor');
  return transaction(db,async()=>{const [p]=await db.query('INSERT INTO processes(name,unit,owner,review_due,purpose) VALUES($1,$2,$3,$4,$5) RETURNING *',vals);await audit(db,command,p.id,actor,{name:p.name});return p;});
 }
 if(command==='set-spec'){
  const p=await resolve(db,'processes',required(o,'process')),l=number(required(o,'lower')),u=number(required(o,'upper')),actor=required(o,'actor'),reason=required(o,'reason');if(l>=u)throw Error('Lower limit must be below upper limit');
  return transaction(db,async()=>{await db.query('SELECT id FROM processes WHERE id=$1 FOR UPDATE',[p.id]);const [s]=await db.query('INSERT INTO specifications(process_id,revision,lower_limit,upper_limit,reason,actor) SELECT $1,COALESCE(max(revision),0)+1,$2,$3,$4,$5 FROM specifications WHERE process_id=$1 RETURNING *',[p.id,l,u,reason,actor]);await audit(db,command,s.id,actor,{reason});return s;});
 }
 if(command==='import'){
  if(pos[0]!=='minitab')throw Error('Use import minitab --file=worksheet.csv --map=mapping.json');
  const p=await resolve(db,'processes',required(o,'process')),actor=required(o,'actor'),name=required(o,'name'),due=date(required(o,'review-due'));
  const file=required(o,'file'),mapFile=required(o,'map');
  if(fs.statSync(file).size>20*1024*1024)throw Error('Worksheet exceeds the 20 MB import limit');
  const raw=fs.readFileSync(file,'utf8');if(raw.includes('\uFFFD'))throw Error('Convert worksheet to UTF-8 before importing');
  const map=JSON.parse(fs.readFileSync(mapFile,'utf8'));for(const k of Object.keys(map))if(!['time','value','batch','missing'].includes(k))throw Error(`Unknown mapping field ${k}`);
  if(typeof map.time!=='string'||typeof map.value!=='string'||(map.batch!==undefined&&typeof map.batch!=='string')||(map.missing!==undefined&&(!Array.isArray(map.missing)||map.missing.some(v=>typeof v!=='string'))))throw Error('Mapping needs time and value column names, optional batch and string missing list');
  const parsed=parseCsv(raw);if(!parsed.length)throw Error('Empty worksheet');
  for(const col of [map.time,map.value,map.batch].filter(Boolean))if(!Object.hasOwn(parsed[0],col))throw Error(`Missing mapped column ${col}`);
  const missing=new Set(map.missing||['','*']);
  const rows=parsed.map((r,i)=>({row_number:i+1,measured_at:timestamp(r[map.time].trim()),value:missing.has(r[map.value].trim())?null:number(r[map.value]),batch:map.batch?r[map.batch]:'',raw:r}));
  if(new Set(rows.map(x=>x.measured_at)).size!==rows.length)throw Error('Duplicate timestamps: individuals observations need a unique measurement order');
  const sha=digest(raw),msha=digest(map);
  const existing=(await db.query('SELECT id,name FROM series WHERE process_id=$1 AND source_sha=$2 AND map_sha=$3',[p.id,sha,msha]))[0];
  if(existing)return {duplicate:true,...existing,rows:rows.length};
  if(o['dry-run'])return {dry_run:true,rows:rows.length,missing:rows.filter(x=>x.value===null).length,source_sha:sha,map_sha:msha};
  return transaction(db,async()=>{
   const [s]=await db.query('INSERT INTO series(process_id,name,source_sha,map_sha,source_name,mapping,actor,review_due) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[p.id,name,sha,msha,path.basename(file),JSON.stringify(map),actor,due]);
   for(const row of rows)await db.query('INSERT INTO measurements(series_id,row_number,measured_at,value,batch,raw) VALUES($1,$2,$3,$4,$5,$6)',[s.id,row.row_number,row.measured_at,row.value,row.batch,JSON.stringify(row.raw)]);
   await audit(db,command,s.id,actor,{rows:rows.length,source_sha:sha,map_sha:msha});return {id:s.id,name,rows:rows.length,missing:rows.filter(x=>x.value===null).length};
  });
 }
 if(command==='analyse'){
  const method=required(o,'method');if(!['describe','individuals','capability'].includes(method))throw Error('Method must be describe, individuals or capability');
  const actor=required(o,'actor'),evidence=required(o,'evidence');
  return transaction(db,async()=>{const c=await calculation(db,o,method);const [a]=await db.query('INSERT INTO analyses(series_id,method,specification_id,baseline_id,input_sha,result,actor,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[c.s.id,method,method==='capability'?c.spec.id:null,c.baseline?.id||null,c.input_sha,JSON.stringify(c.result),actor,evidence]);await audit(db,command,a.id,actor,{method});return a;});
 }
 if(command==='add-action'){
  const s=await resolve(db,'series',required(o,'series')),vals=[s.id,required(o,'text'),required(o,'owner'),date(required(o,'due')),required(o,'actor')];
  return transaction(db,async()=>{const [a]=await db.query('INSERT INTO actions(series_id,title,owner,due,actor) VALUES($1,$2,$3,$4,$5) RETURNING *',vals);await audit(db,command,a.id,vals[4],{title:a.title});return a;});
 }
 if(command==='close-action'){
  const a=await resolve(db,'actions',required(o,'action')),actor=required(o,'actor'),evidence=required(o,'evidence');
  return transaction(db,async()=>{const rows=await db.query("UPDATE actions SET status='closed',resolution=$2,closed_at=now() WHERE id=$1 AND status='open' RETURNING *",[a.id,evidence]);if(!rows.length)throw Error('Action already closed');await audit(db,command,a.id,actor,{evidence});return rows[0];});
 }
 if(command==='log'){
  const s=await resolve(db,'series',required(o,'series')),actor=required(o,'actor'),body=required(o,'text');
  return transaction(db,async()=>{const [n]=await db.query('INSERT INTO notes(series_id,body,actor) VALUES($1,$2,$3) RETURNING *',[s.id,body,actor]);await audit(db,command,n.id,actor,{series:s.id});return n;});
 }
 if(command==='export'){
  const out=path.resolve(required(o,'out'));let contents;
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try{const tables={};for(const t of TABLES)tables[t]=await db.query(`SELECT * FROM ${t} ORDER BY id`);contents=JSON.stringify({version:1,exported_at:new Date().toISOString(),tables},null,2)+'\n';}finally{await db.exec('ROLLBACK');}
  fs.mkdirSync(path.dirname(out),{recursive:true,mode:0o700});fs.writeFileSync(out,contents,{flag:'wx',mode:0o600});return {file:out,tables:TABLES.length};
 }
 if(command==='draft-analysis'){
  const a=await resolve(db,'analyses',required(o,'analysis'));const s=await resolve(db,'series',a.series_id);
  const result={...a.result};delete result.signals;delete result.mr_signals;
  const file=writeOut('drafts',`analysis-${a.id}`,page({title:'Process analysis draft',subtitle:s.name,sections:[{title:'Saved result',html:record(result)},{title:'Interpretation',html:record({method:a.method,evidence:a.evidence,actor:a.actor,input_sha:a.input_sha})},{title:'Individuals signals',html:table(a.result.signals||[])},{title:'Moving-range signals',html:table(a.result.mr_signals||[])}]}));return {file};
 }
 if(command==='draft-review'){
  const review=await run(db,'weekly-review');return {file:writeOut('drafts','weekly-review',page({title:'Weekly process review draft',sections:Object.entries(review).map(([title,rows])=>({title,html:table(rows)}))}))};
 }
 throw Error(`Unknown command ${command}. Use help.`);
}
export function parseArgs(args){const pos=[],o={};for(const a of args){if(a==='--json')o.json=true;else if(a==='--dry-run')o['dry-run']=true;else if(a.startsWith('--')&&a.includes('=')){const i=a.indexOf('=');o[a.slice(2,i)]=a.slice(i+1);}else if(a.startsWith('--'))throw Error(`Use --name=value: ${a}`);else pos.push(a);}return {o,pos};}
export function format(value){
 const cell=x=>x===null?'':x instanceof Date?x.toISOString():typeof x==='number'?String(Number(x.toFixed(6))):typeof x==='object'?JSON.stringify(x):String(x);
 if(Array.isArray(value)){
  if(!value.length)return 'No records.';
  if(typeof value[0]==='string')return value.map(x=>'- '+x).join('\n');
  const keys=Object.keys(value[0]);const rows=value.map(r=>keys.map(k=>cell(r[k])));const widths=keys.map((k,i)=>Math.max(2,k.length,...rows.map(r=>r[i].length)));
  const line=r=>r.map((x,i)=>String(x).padEnd(widths[i])).join('  ');
  return [line(keys),widths.map(w=>'-'.repeat(w)).join('  '),...rows.map(line)].join('\n');
 }
 if(value&&typeof value==='object')return Object.entries(value).map(([key,v])=>Array.isArray(v)?`\n${key}\n${'='.repeat(key.length)}\n${format(v)}\n`:`${key}: ${cell(v)}`).join('\n');
 return String(value);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const {o,pos}=parseArgs(process.argv.slice(2));const command=pos.shift()||'help';db=await getDb();const out=await run(db,command,o,pos);console.log(o.json?JSON.stringify(out,null,2):format(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
