import { getDb } from '../../../db';
import { entries } from '../../../db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const schema = z.object({
 id:z.string().uuid().optional(), date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s),
 title:z.string().trim().min(1).max(160), plannedMinutes:z.number().int().min(1).max(1440),
 actualMinutes:z.number().int().min(0).max(1440).nullable(), actual:z.string().trim().max(2000),
 reflection:z.string().trim().max(2000), nextPlan:z.string().trim().max(160), parentId:z.string().uuid().nullable().optional()
}).refine(v=>(!v.actual && v.actualMinutes===null) || (!!v.actual && v.actualMinutes!==null), {message:'실행 내용과 실제 소요시간을 함께 입력하세요.'})
 .refine(v=>!v.reflection || !!v.actual,{message:'실행을 기록한 뒤 돌아보기를 작성하세요.'})
 .refine(v=>!v.nextPlan || !!v.reflection,{message:'돌아본 점을 먼저 작성하세요.'});
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{return json(await getDb().select().from(entries).orderBy(desc(entries.date),desc(entries.createdAt)));}catch{return json({error:'기록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.'},503);}}
export async function POST(request:Request){
 try {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin) return json({error:'허용되지 않은 요청입니다.'},403);
  const raw=await request.text(); if(raw.length>15000)return json({error:'입력 내용이 너무 깁니다.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'잘못된 요청입니다.'},400);}
  const parsed=schema.safeParse(body);if(!parsed.success)return json({error:parsed.error.issues[0].message},400);
  const {id,...data}=parsed.data;const db=getDb();const now=new Date().toISOString();
  if(data.parentId && !(await db.select({id:entries.id}).from(entries).where(eq(entries.id,data.parentId))).length) return json({error:'연결할 이전 기록이 없습니다.'},400);
  if(id){const changed=await db.update(entries).set({...data,updatedAt:now}).where(eq(entries.id,id)).returning();if(!changed.length)return json({error:'기록을 찾을 수 없습니다.'},404);return json(changed[0]);}
  const row={...data,id:crypto.randomUUID(),createdAt:now,updatedAt:now};await db.insert(entries).values(row);return json(row,201);
 }catch{return json({error:'저장하지 못했습니다. 입력 내용은 유지됩니다. 다시 시도하세요.'},503);}
}
