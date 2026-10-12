import type { Pool } from "pg";
import type { Express, RequestHandler } from "express";
import { QA_MEMBERS } from "../../shared/qa";
import { AuthError, type AuthRepository } from "./repository";
import { nativeAuthRepository } from "./service";
import { sendMigrationEmail } from "../lib/email";
import { authOrigin } from "./origin";

export type MigrationMember = { id:string; email:string|null; has_password:boolean; email_notifications:boolean; attempted:boolean; email_count:number };
export function exclusion(member: MigrationMember): string | null {
  const email=member.email?.trim().toLowerCase();
  if (member.has_password) return "password";
  if (!email) return "missingEmail";
  if (QA_MEMBERS.some(m=>m.userId===member.id) || /^(qa[_-]|demo[_-]|user_demo[_-]|test[_-])/i.test(member.id) ||
      /^(qa[._+-]|test[._+-]|demo[._+-])/i.test(email) ||
      /@(example\.(com|net|org|invalid)|demo\.com|demo\.paygate\.dating)$|@[^@]+\.(invalid|test|example|demo)$/i.test(email)) return "test";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalidEmail";
  if (member.email_count !== 1) return "ambiguousEmail";
  if (!member.email_notifications) return "optOut";
  if (member.attempted) return "alreadyAttempted";
  return null;
}

// No timer/startup trigger. One permanently claimed attempt per member.
// An interrupted/uncertain send is never automatically resent.
export class PasswordMigration {
  constructor(private pool:Pool, private repository:AuthRepository = nativeAuthRepository,
    private send = sendMigrationEmail, private source?:()=>Promise<MigrationMember[]>) {}
  async members():Promise<MigrationMember[]> {
    if (this.source) return this.source();
    return (await this.pool.query<MigrationMember>(`SELECT u.id,u.email,
      NULLIF(a.password_hash,'') IS NOT NULL AS has_password,
      COALESCE(p.email_notifications,true) AS email_notifications,
      d.user_id IS NOT NULL AS attempted,
      count(*) OVER(PARTITION BY lower(btrim(u.email)))::int AS email_count
      FROM users u LEFT JOIN native_auth_accounts a ON a.user_id=u.id
      LEFT JOIN member_email_preferences p ON p.user_id=u.id
      LEFT JOIN password_migration_deliveries d ON d.user_id=u.id ORDER BY u.id`)).rows;
  }
  async report() {
    const members=await this.members();
    const counts:Record<string,number>={emailNoPassword:0,eligible:0,test:0,optOut:0,alreadyAttempted:0,invalidEmail:0,ambiguousEmail:0};
    for(const m of members) {
      if(m.has_password || !m.email?.trim()) continue;
      counts.emailNoPassword++;
      const reason=exclusion(m); counts[reason ?? "eligible"]++;
    }
    const logs=(await this.pool.query(`SELECT status,count(*)::int AS count FROM password_migration_deliveries GROUP BY status`)).rows;
    return {counts,logs,subject:"Your PayGate sign-in upgrade",
      body:"We've upgraded how you sign in to PayGate Dating. Tap below to set your password and you're in."};
  }
  async run(actorId:string,origin:string) {
    const lock=await this.pool.connect();
    try {
      if(!(await lock.query("SELECT pg_try_advisory_lock(74102913) AS acquired")).rows[0].acquired)
        throw new AuthError(409,"The migration send is already running.");
      const result={sent:0,failed:0,uncertain:0,skipped:0};
      for(const member of await this.members()) {
        if(exclusion(member)) {result.skipped++;continue;}
        const claimed=await this.pool.query(`INSERT INTO password_migration_deliveries(user_id,initiated_by,status)
          VALUES($1,$2,'claimed') ON CONFLICT(user_id) DO NOTHING RETURNING user_id`,[member.id,actorId]);
        if(!claimed.rowCount) {result.skipped++;continue;}
        try {
          // Recheck password, consent and identity immediately before dispatch.
          const current=(await this.members()).find(m=>m.id===member.id);
          if(!current || exclusion({...current,attempted:false})) {
            await this.finish(member.id,"skipped");result.skipped++;continue;
          }
          const account=await this.repository.byEmail(member.email!.trim().toLowerCase());
          if(!account || account.user_id!==member.id || account.password_hash) {
            await this.finish(member.id,"skipped");result.skipped++;continue;
          }
          const token=await this.repository.issue(account,"signin",true);
          const delivery=await this.send(account.email,`${origin}/auth/confirm?kind=signin&token=${token}`,member.id);
          await this.finish(member.id,delivery.status,delivery.providerId);
          result[delivery.status]++;
        } catch {
          // Ambiguous network/process outcomes must not risk duplicate emails.
          await this.finish(member.id,"uncertain"); result.uncertain++;
        }
      }
      console.info("Password migration dispatch completed",result);
      return result;
    } finally {await lock.query("SELECT pg_advisory_unlock(74102913)");lock.release();}
  }
  private async finish(id:string,status:string,providerId?:string) {
    await this.pool.query("UPDATE password_migration_deliveries SET status=$2,finished_at=now(),provider_id=$3 WHERE user_id=$1",[id,status,providerId??null]);
  }
}

export function registerPasswordMigration(app:Express,authenticated:RequestHandler,admin:RequestHandler,pool:Pool,
  migration=new PasswordMigration(pool),sendEnabled=process.env.NODE_ENV==="production") {
  const safe=(handler:(req:any,res:any)=>Promise<void>):RequestHandler=>async(req,res)=>{
    res.setHeader("Cache-Control","no-store");
    try {await handler(req,res);} catch(error) {
      res.status(error instanceof AuthError?error.status:503).json({message:error instanceof AuthError?error.message:"Migration operation unavailable."});
    }
  };
  const sameOrigin:RequestHandler=(req,res,next)=>{
    try {
      if(!req.is("application/json") || req.get("origin")!==authOrigin(req)) {res.sendStatus(403);return;}
      next();
    } catch {res.sendStatus(403);}
  };
  app.get("/api/admin/password-migration",authenticated,admin,safe(async(_req,res)=>{
    res.json({...await migration.report(),sendEnabled});
  }));
  app.post("/api/admin/password-migration/send",authenticated,admin,sameOrigin,safe(async(req,res)=>{
    if(!sendEnabled) throw new AuthError(403,"Migration emails cannot be sent from preview. The owner can send after release.");
    if(req.body?.confirmation!=="SEND PASSWORD UPGRADE" || Object.keys(req.body).length!==1)
      throw new AuthError(400,"Confirm the one-time migration send.");
    res.json(await migration.run(req.user.claims.sub,authOrigin(req)));
  }));
  app.get("/api/email-preferences",authenticated,safe(async(req,res)=>{
    const row=(await pool.query("SELECT email_notifications,marketing_emails FROM member_email_preferences WHERE user_id=$1",[req.user.claims.sub])).rows[0];
    res.json(row??{email_notifications:true,marketing_emails:false});
  }));
  app.patch("/api/email-preferences",authenticated,sameOrigin,safe(async(req,res)=>{
    if(typeof req.body?.email_notifications!=="boolean" || typeof req.body?.marketing_emails!=="boolean" ||
      Object.keys(req.body).length!==2) throw new AuthError(400,"Choose your email preferences.");
    const row=(await pool.query(`INSERT INTO member_email_preferences(user_id,email_notifications,marketing_emails)
      VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET email_notifications=$2,marketing_emails=$3,updated_at=now()
      RETURNING email_notifications,marketing_emails`,[req.user.claims.sub,req.body.email_notifications,req.body.marketing_emails])).rows[0];
    res.json(row);
  }));
}
