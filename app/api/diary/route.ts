import { env } from 'cloudflare:workers';
import { z } from 'zod';
export const dynamic='force-dynamic';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s,'올바른 날짜를 입력하세요.');
const title=z.string().trim().min(1).max(160), note=z.string().trim().max(2000), id=z.string().uuid(), minutes=z.number().int().min(0).max(100000), priority=z.number().int().min(1).max(3);
const plan=z.object({id,title,startDate:date,endDate:date,priority,success: title,estimatedMinutes:minutes}).refine(p=>p.endDate>=p.startDate,'종료일은 시작일 이후여야 합니다.');
const task=z.object({id,planId:id,title,dueDate:date,priority,tags:z.string().trim().max(200),estimatedMinutes:minutes});
const log=z.object({id,taskId:id,startAt:z.string().datetime({offset:true}),endAt:z.string().datetime({offset:true}),content:title,blocker:note}).refine(l=>Date.parse(l.endAt)>Date.parse(l.startAt),'종료 시각은 시작 시각 이후여야 합니다.');
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const db=env.DB;if(!db)throw Error('DB unavailable');const result=await db.batch(['plans','plan_revisions','tasks','execution_logs','completions','reviews','entries'].map(t=>db.prepare(`SELECT * FROM ${t}`)));return json(Object.fromEntries(['plans','revisions','tasks','logs','completions','reviews','legacyEntries'].map((t,i)=>[t,result[i].results])));}catch{return json({error:'서버에서 자료를 불러오지 못했습니다. 다시 불러오기를 눌러 주세요.'},503);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 const raw=await req.text();if(raw.length>15000)return json({error:'입력이 너무 깁니다.'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'잘못된 요청입니다.'},400);}
 const db=env.DB;if(!db)throw Error('DB unavailable');const now=new Date().toISOString(), stmt=(sql:string,...values:(string|number)[])=>db.prepare(sql).bind(...values);
 const exists=async(table:string,key:string,value:string)=>!!await stmt(`SELECT 1 FROM ${table} WHERE ${key}=?${table==='tasks'?' AND deleted=0':''}`,value).first();
 switch(body.action){
 case 'plan': {const p=plan.parse(body.data);if(await exists('plans','id',p.id)){
 await db.batch([stmt(`INSERT INTO plan_revisions(id,plan_id,snapshot,created_at) SELECT ?,id,json_object('title',title,'start_date',start_date,'end_date',end_date,'priority',priority,'success',success,'estimated_minutes',estimated_minutes,'improvement',improvement),? FROM plans WHERE id=?`,crypto.randomUUID(),now,p.id),stmt('UPDATE plans SET title=?,start_date=?,end_date=?,priority=?,success=?,estimated_minutes=? WHERE id=?',p.title,p.startDate,p.endDate,p.priority,p.success,p.estimatedMinutes,p.id)]);
 }else await stmt('INSERT INTO plans(id,title,start_date,end_date,priority,success,estimated_minutes,created_at) VALUES(?,?,?,?,?,?,?,?)',p.id,p.title,p.startDate,p.endDate,p.priority,p.success,p.estimatedMinutes,now).run();break;}
 case 'task': {const t=task.parse(body.data);if(!await exists('plans','id',t.planId))return json({error:'연결할 계획이 없습니다.'},404);await stmt(`INSERT INTO tasks(id,plan_id,title,due_date,priority,tags,estimated_minutes,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,due_date=excluded.due_date,priority=excluded.priority,tags=excluded.tags,estimated_minutes=excluded.estimated_minutes WHERE tasks.deleted=0 AND tasks.plan_id=excluded.plan_id`,t.id,t.planId,t.title,t.dueDate,t.priority,t.tags,t.estimatedMinutes,now).run();break;}
 case 'status': {const t=z.object({id,done:z.boolean()}).parse(body.data);if(!await exists('tasks','id',t.id))return json({error:'할 일을 찾을 수 없습니다.'},404);await db.batch([stmt('UPDATE tasks SET done=? WHERE id=? AND deleted=0',t.done?1:0,t.id),t.done?stmt('INSERT OR IGNORE INTO completions(task_id,completed_at) SELECT id,? FROM tasks WHERE id=? AND deleted=0',now,t.id):stmt('DELETE FROM completions WHERE task_id=?',t.id)]);break;}
 case 'delete': {const t=id.parse(body.data.id);await db.batch([stmt('UPDATE tasks SET deleted=1,done=0 WHERE id=?',t),stmt('DELETE FROM completions WHERE task_id=?',t)]);break;}
 case 'log': {const l=log.parse(body.data);if(!await exists('tasks','id',l.taskId))return json({error:'실행을 연결할 할 일이 없습니다.'},404);const duration=Math.round((Date.parse(l.endAt)-Date.parse(l.startAt))/60000);if(duration<1||duration>100000)return json({error:'실행 시간은 1~100000분이어야 합니다.'},400);await stmt('INSERT OR IGNORE INTO execution_logs(id,task_id,start_at,end_at,actual_minutes,content,blocker,created_at) VALUES(?,?,?,?,?,?,?,?)',l.id,l.taskId,new Date(l.startAt).toISOString(),new Date(l.endAt).toISOString(),duration,l.content,l.blocker,now).run();break;}
 case 'review': {const r=z.object({id,planId:id,content:title,improvement:title,next:plan}).parse(body.data);if(!await exists('plans','id',r.planId))return json({error:'돌아볼 계획이 없습니다.'},404);if(await exists('reviews','id',r.id))break;await db.batch([stmt('INSERT INTO plans(id,title,start_date,end_date,priority,success,estimated_minutes,improvement,parent_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',r.next.id,r.next.title,r.next.startDate,r.next.endDate,r.next.priority,r.next.success,r.next.estimatedMinutes,r.improvement,r.planId,now),stmt('INSERT INTO reviews(id,plan_id,content,improvement,next_plan_id,created_at) VALUES(?,?,?,?,?,?)',r.id,r.planId,r.content,r.improvement,r.next.id,now)]);break;}
 default:return json({error:'지원하지 않는 요청입니다.'},400);
 }return json({ok:true});
 }catch(e){if(e instanceof z.ZodError)return json({error:e.issues[0].message},400);return json({error:'저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.'},503);}}

