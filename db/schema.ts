import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const entries = sqliteTable('entries', {
 id: text('id').primaryKey(), date: text('date').notNull(), title: text('title').notNull(),
 plannedMinutes: integer('planned_minutes').notNull(), actualMinutes: integer('actual_minutes'),
 actual: text('actual').notNull().default(''), reflection: text('reflection').notNull().default(''),
 nextPlan: text('next_plan').notNull().default(''), parentId: text('parent_id'),
 createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull()
});
export const plans = sqliteTable('plans', {
 id:text('id').primaryKey(), title:text('title').notNull(), startDate:text('start_date').notNull(), endDate:text('end_date').notNull(), priority:integer('priority').notNull(), success:text('success').notNull(), estimatedMinutes:integer('estimated_minutes').notNull(), improvement:text('improvement').notNull().default(''), parentId:text('parent_id'), createdAt:text('created_at').notNull()
});
export const revisions=sqliteTable('plan_revisions', {id:text('id').primaryKey(),planId:text('plan_id').notNull().references(()=>plans.id),snapshot:text('snapshot').notNull(),createdAt:text('created_at').notNull()});
export const tasks=sqliteTable('tasks',{id:text('id').primaryKey(),planId:text('plan_id').notNull().references(()=>plans.id),title:text('title').notNull(),dueDate:text('due_date').notNull(),priority:integer('priority').notNull(),tags:text('tags').notNull(),estimatedMinutes:integer('estimated_minutes').notNull(),done:integer('done').notNull().default(0),deleted:integer('deleted').notNull().default(0),createdAt:text('created_at').notNull()});
export const logs=sqliteTable('execution_logs',{id:text('id').primaryKey(),taskId:text('task_id').notNull().references(()=>tasks.id),startAt:text('start_at').notNull(),endAt:text('end_at').notNull(),actualMinutes:integer('actual_minutes').notNull(),content:text('content').notNull(),blocker:text('blocker').notNull(),createdAt:text('created_at').notNull()});
export const completions=sqliteTable('completions',{taskId:text('task_id').primaryKey().references(()=>tasks.id),completedAt:text('completed_at').notNull()});
export const reviews=sqliteTable('reviews',{id:text('id').primaryKey(),planId:text('plan_id').notNull().references(()=>plans.id),content:text('content').notNull(),improvement:text('improvement').notNull(),nextPlanId:text('next_plan_id').notNull().references(()=>plans.id),createdAt:text('created_at').notNull()});
