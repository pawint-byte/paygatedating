import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "../server/db";
import { AuthRepository, tokenHash } from "../server/native-auth/repository";
import { PasswordMigration, exclusion, registerPasswordMigration, type MigrationMember } from "../server/native-auth/migration";
import { migrationEmailContent } from "../server/lib/email";
import express from "express";
import { once } from "node:events";
import { hashPassword } from "../server/native-auth/service";

const repo=new AuthRepository(pool),ids:string[]=[];
const candidate=(overrides:Partial<MigrationMember>={}):MigrationMember=>({id:"member",email:"member@qa-mailbox.com",has_password:false,email_notifications:true,attempted:false,email_count:1,...overrides});
test.after(async()=>{
  for(const id of ids) {
    await pool.query("DELETE FROM password_migration_deliveries WHERE user_id=$1 OR initiated_by=$1",[id]);
    await pool.query("DELETE FROM native_auth_tokens WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM replit_auth_identities WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM native_auth_accounts WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM users WHERE id=$1",[id]);
  } await pool.end();
});
async function fixture(){
  const id=randomUUID(),email=`memberfixture-${id}@qa-mailbox.com`;ids.push(id);
  await pool.query("INSERT INTO users(id,email,first_name) VALUES($1,$2,'QA Migration')",[id,email]);
  return candidate({id,email});
}
test("migration excludes passwords, blank/invalid/ambiguous emails, opt-outs, QA/test/demo and attempted members",()=>{
  for(const fields of [
    {has_password:true},{email:null},{email:"bad"},{email_count:2},{email_notifications:false},{attempted:true},
    {id:"qa_track_a_alice"},{id:"demo_ella"},{email:"ella@demo.paygate.dating"},
    {email:"native-registered-a@example.invalid"},{email:"test.user@gmail.com"},{email:"actor@paygate.test"},
  ]) assert.ok(exclusion(candidate(fields)));
  assert.equal(exclusion(candidate()),null);
});
test("migration template uses exact upgrade copy, escaped single-use link and recovery guidance",()=>{
  const mail=migrationEmailContent('https://paygatedating.com/auth/confirm?kind=signin&token="<unsafe>');
  assert.match(mail.text,/We've upgraded how you sign in to PayGate Dating\. Tap below to set your password and you're in\./);
  assert.match(mail.html,/kind=signin&amp;token=&quot;&lt;unsafe/);
  assert.match(mail.text,/30 minutes/);assert.match(mail.html,/Set your password/);
});
test("one-time migration preserves legacy identity, logs fake dispatch, forces password prompt after old skip and rejects replay",async()=>{
  const member=await fixture(),before=(await pool.query("SELECT * FROM users WHERE id=$1",[member.id])).rows[0];
  const {account}=await repo.resolveReplit({sub:member.id,email:member.email!,email_verified:false});
  await repo.skipPasswordPrompt(account);
  let calls=0,token="";
  const migration=new PasswordMigration(pool,repo,async(_email,link)=>{
    calls++;token=new URL(link).searchParams.get("token")!;return {status:"sent",providerId:"fake-provider"};
  },async()=>[member]);
  assert.equal((await migration.report()).counts.eligible,1);
  assert.deepEqual(await migration.run(member.id,"https://paygatedating.com"),{sent:1,failed:0,uncertain:0,skipped:0});
  assert.equal(calls,1);
  const stored=(await pool.query("SELECT hash,password_setup,used_at,expires_at>now() AS valid FROM native_auth_tokens WHERE user_id=$1",[member.id])).rows[0];
  assert.equal(stored.hash,tokenHash(token));assert.equal(stored.password_setup,true);assert.equal(stored.valid,true);assert.equal(stored.used_at,null);
  const proof=await repo.consume(token,"signin");
  assert.equal(proof.user_id,member.id);assert.equal(proof.force_password_setup,true);assert.ok(proof.verified_at);
  await assert.rejects(()=>repo.consume(token,"signin"));
  await repo.setPassword(proof,await hashPassword("MigrationFixturePass2026!"));
  await migration.run(member.id,"https://paygatedating.com");assert.equal(calls,1);
  assert.deepEqual((await pool.query("SELECT * FROM users WHERE id=$1",[member.id])).rows[0],before);
  assert.equal((await pool.query("SELECT user_id FROM replit_auth_identities WHERE subject=$1",[member.id])).rows[0].user_id,member.id);
});
test("failed and uncertain migration sends are logged once and never retried",async()=>{
  for(const status of ["failed","uncertain"] as const){
    const member=await fixture();let calls=0;
    const migration=new PasswordMigration(pool,repo,async()=>{calls++;return {status};},async()=>[member]);
    assert.equal((await migration.run(member.id,"https://paygatedating.com"))[status],1);
    await migration.run(member.id,"https://paygatedating.com");assert.equal(calls,1);
    assert.equal((await pool.query("SELECT status FROM password_migration_deliveries WHERE user_id=$1",[member.id])).rows[0].status,status);
  }
});
test("admin API rejects anonymous/nonadmin, preview sends and missing confirmation; preferences persist and exclude",async()=>{
  const member=await fixture(),app=express();app.use(express.json());
  const authenticated:any=(req:any,res:any,next:any)=>{if(!req.get("x-auth"))return res.sendStatus(401);req.user={claims:{sub:member.id}};next();};
  const admin:any=(req:any,res:any,next:any)=>req.get("x-admin")?next():res.sendStatus(403);
  const migration=new PasswordMigration(pool,repo,async()=>{throw Error("Must never send");},async()=>[member]);
  registerPasswordMigration(app,authenticated,admin,pool,migration,false);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const request=(path:string,method="GET",body?:unknown,headers:any={})=>fetch(origin+path,{method,headers:{"Content-Type":"application/json",Origin:origin,...headers},body:body?JSON.stringify(body):undefined});
  try{
    assert.equal((await request("/api/admin/password-migration")).status,401);
    assert.equal((await request("/api/admin/password-migration","GET",undefined,{"x-auth":"1"})).status,403);
    assert.equal((await request("/api/admin/password-migration/send","POST",{confirmation:"SEND PASSWORD UPGRADE"},{"x-auth":"1","x-admin":"1"})).status,403);
    assert.equal((await request("/api/email-preferences","PATCH",{email_notifications:false,marketing_emails:false},{"x-auth":"1"})).status,200);
    const preferences=await(await request("/api/email-preferences","GET",undefined,{"x-auth":"1"})).json();
    assert.equal(preferences.email_notifications,false);
    const real=new PasswordMigration(pool,repo);
    assert.equal(exclusion((await real.members()).find(m=>m.id===member.id)!),"optOut");
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM password_migration_deliveries WHERE user_id=$1",[member.id])).rows[0].count,0);
    assert.equal((await request("/api/email-preferences","PATCH",{email_notifications:true,marketing_emails:false},{"x-auth":"1",Origin:"https://evil.invalid"})).status,403);
  }finally{server.close();await once(server,"close");}
});
test("live-mode admin control requires typed confirmation and claims concurrent dispatch once using fake mail only",async()=>{
  const member=await fixture(),app=express();app.use(express.json());let sends=0;
  const migration=new PasswordMigration(pool,repo,async()=>{
    sends++;await new Promise(resolve=>setTimeout(resolve,40));return {status:"sent",providerId:"fake-provider"};
  },async()=>[member]);
  const auth:any=(req:any,_res:any,next:any)=>{req.user={claims:{sub:member.id}};next();};
  registerPasswordMigration(app,auth,auth,pool,migration,true);
  const server=app.listen(0,"127.0.0.1");await once(server,"listening");
  const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const send=(body:unknown)=>fetch(origin+"/api/admin/password-migration/send",{method:"POST",
    headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
  try{
    assert.equal((await send({confirmation:"wrong"})).status,400);assert.equal(sends,0);
    const results=await Promise.all([send({confirmation:"SEND PASSWORD UPGRADE"}),send({confirmation:"SEND PASSWORD UPGRADE"})]);
    assert.ok(results.some(r=>r.status===200));assert.equal(sends,1);
    assert.equal((await send({confirmation:"SEND PASSWORD UPGRADE"})).status,200);assert.equal(sends,1);
  }finally{server.close();await once(server,"close");}
});
