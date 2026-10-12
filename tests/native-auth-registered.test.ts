import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomInt } from "node:crypto";
import { once } from "node:events";
import express from "express";
import session from "express-session";
import { Passport } from "passport";
import { pool } from "../server/db";
import { AuthRepository, tokenHash } from "../server/native-auth/repository";
import { hashPassword } from "../server/native-auth/service";
import { registerNativeAuth } from "../server/native-auth/routes";
import { isAuthenticated } from "../server/replit_integrations/auth/replitAuth";

const repository=new AuthRepository(pool);
const ids=new Set<string>();
const pendingIds=new Set<string>();
const password="RegisteredTestPassword2026!";
const exactMessage="You're already registered with this email — we've sent you a sign-in link. Tap it to get in.";
test.after(async()=>{
  for(const id of pendingIds) await pool.query("DELETE FROM pending_signups WHERE id=$1",[id]);
  for(const id of ids) {
    await pool.query("DELETE FROM native_auth_tokens WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM replit_auth_identities WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM native_auth_accounts WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM users WHERE id=$1",[id]);
  }
  await pool.end();
});
async function legacy() {
  const id=randomUUID(),email=`registered-legacy-${randomUUID()}@example.invalid`;
  ids.add(id);
  await pool.query("INSERT INTO users (id,email,first_name) VALUES ($1,$2,'QA Legacy')",[id,email]);
  await repository.resolveReplit({sub:id,email,email_verified:false});
  return {id,email};
}
async function http(delivered=true) {
  const app=express(),passport=new Passport();
  // Test-only trusted proxy with an isolated benchmark-range IP. The preview
  // proxy can also appear as loopback; never consume its real send budget.
  const qaIp=`198.18.${randomInt(1,255)}.${randomInt(1,255)}`;
  app.set("trust proxy",1);
  app.use(express.json());
  app.use(session({secret:randomUUID(),resave:false,saveUninitialized:false}));
  passport.serializeUser((user,done)=>done(null,user));
  passport.deserializeUser((user:any,done)=>done(null,user));
  app.use(passport.initialize()); app.use(passport.session());
  const messages:{email:string;kind:string;token:string}[]=[];
  registerNativeAuth(app,isAuthenticated,{repository,send:async(email,kind,url)=>{
    messages.push({email,kind,token:new URL(url).searchParams.get("token")!}); return delivered;
  }});
  app.get("/fixture/inside",isAuthenticated,(req:any,res)=>res.json({id:req.user.claims.sub}));
  app.get("/fixture/logout",(req,res)=>req.logout(()=>res.json({ok:true})));
  const server=app.listen(0,"127.0.0.1"); await once(server,"listening");
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  let cookie="";
  const request=async(path:string,body?:unknown)=>{
    const response=await fetch(base+path,{method:body===undefined?"GET":"POST",
      headers:{Cookie:cookie,"X-Forwarded-For":qaIp,...(body===undefined?{}:{"Content-Type":"application/json"})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    const next=response.headers.get("set-cookie"); if(next) cookie=next.split(";")[0];
    return response;
  };
  return {request,messages,close:async()=>{
    server.close(); await once(server,"close");
    await pool.query("DELETE FROM native_auth_rate_limits WHERE key=ANY($1)",
      [["email","email-submit","signup-start","signup","login","consume","password","password-prompt"].map(action=>tokenHash(`${action}:ip:${qaIp}`))]);
  }};
}

test("all email entry points recognize passwordless members; ownership proof and one-time skip preserve the original identity",async()=>{
  const member=await legacy();
  const before=(await pool.query("SELECT * FROM users WHERE id=$1",[member.id])).rows[0];
  const {request,messages,close}=await http();
  try {
    for(const [path,body] of [
      ["/api/native-auth/login",{email:member.email.toUpperCase(),password:"Any incorrect password"}],
      ["/api/native-auth/signup/start",{email:member.email}],
      ["/api/native-auth/forgot-password",{email:member.email}],
    ] as const) {
      const response=await request(path,body);
      assert.equal(response.status,200);
      assert.deepEqual(await response.json(),{registered:true,linkSent:true,message:exactMessage});
      assert.equal((await request("/fixture/inside")).status,401);
    }
    assert.equal(messages.length,3);
    assert.ok(messages.every(message=>message.kind==="signin" && message.email===member.email));
    assert.equal((await pool.query("SELECT id FROM pending_signups WHERE email=$1",[member.email])).rowCount,0);
    const limited=await request("/api/native-auth/request-link",{email:member.email});
    assert.equal(limited.status,429);
    assert.equal(limited.headers.get("retry-after"),"900");
    assert.equal(messages.length,3); // Different entry points cannot bypass the email budget.
    assert.equal((await request("/api/native-auth/password-prompt/skip",{})).status,401);
    const proof=await request("/api/native-auth/consume",{kind:"signin",token:messages[0].token});
    assert.equal(proof.status,200);
    assert.equal((await proof.json()).redirect,"/set-password");
    assert.equal((await (await request("/fixture/inside")).json()).id,member.id);
    const status=await (await request("/api/native-auth/status")).json();
    assert.equal(status.hasPassword,false); assert.equal(status.canSetPassword,true);
    assert.equal(status.passwordPromptSkipped,false);
    assert.equal((await request("/api/native-auth/password-prompt/skip",{})).status,200);
    assert.equal((await (await request("/api/native-auth/status")).json()).passwordPromptSkipped,true);
    assert.equal((await request("/api/native-auth/password-prompt/skip",{})).status,409);
    await request("/fixture/logout");
    assert.equal((await request("/api/native-auth/consume",{kind:"signin",token:messages[0].token})).status,400);
    const next=await request("/api/native-auth/consume",{kind:"signin",token:messages[1].token});
    assert.equal((await next.json()).redirect,"/"); // Previously skipped: gentle reminder, not a hard gate.
    assert.equal((await request("/api/native-auth/set-password",{password})).status,200);
    assert.equal((await (await request("/api/native-auth/status")).json()).hasPassword,true);
    await request("/fixture/logout");
    assert.equal((await request("/api/native-auth/login",{email:member.email,password:"WrongPassword2026!"})).status,401);
    assert.equal((await request("/api/native-auth/login",{email:member.email,password})).status,200);
    assert.equal((await (await request("/fixture/inside")).json()).id,member.id);
    assert.deepEqual((await pool.query("SELECT * FROM users WHERE id=$1",[member.id])).rows[0],before);
    assert.equal((await pool.query("SELECT subject FROM replit_auth_identities WHERE user_id=$1",[member.id])).rows[0].subject,member.id);
    assert.ok((await pool.query("SELECT used_at FROM native_auth_tokens WHERE hash=$1",[tokenHash(messages[0].token)])).rows[0].used_at);
  } finally {await close();}
});

test("unknown auth emails disclose only no-account plus signup; signup still captures a new pending email",async()=>{
  const email=`registered-unknown-${randomUUID()}@example.invalid`;
  const {request,messages,close}=await http();
  try {
    for(const path of ["/api/native-auth/login","/api/native-auth/request-link","/api/native-auth/forgot-password"]) {
      const response=await request(path,{email,password});
      assert.equal(response.status,404);
      assert.deepEqual(await response.json(),{message:"No account is registered with this email. Create an account to get started.",code:"NO_ACCOUNT",redirect:"/signup"});
    }
    assert.equal(messages.length,0);
    const captured=await request("/api/native-auth/signup/start",{email});
    assert.equal(captured.status,201);
    const pending=(await pool.query("SELECT id FROM pending_signups WHERE email=$1",[email])).rows[0];
    pendingIds.add(pending.id);
    assert.equal((await pool.query("SELECT id FROM users WHERE email=$1",[email])).rowCount,0);
  } finally {await close();}
});

test("password-bearing signup still sends a sign-in link, wrong password remains an error, and failed delivery never claims success/access",async()=>{
  const account=await repository.signup(`registered-password-${randomUUID()}@example.invalid`,await hashPassword(password));
  ids.add(account.user_id);
  const {request,messages,close}=await http();
  try {
    const wrong=await request("/api/native-auth/login",{email:account.email,password:"WrongPassword2026!"});
    assert.equal(wrong.status,401); assert.equal(messages.length,0);
    const signup=await request("/api/native-auth/signup/start",{email:account.email});
    assert.equal(signup.status,200); assert.equal((await signup.json()).message,exactMessage);
    assert.equal(messages[0].kind,"signin");
    assert.equal((await pool.query("SELECT id FROM pending_signups WHERE email=$1",[account.email])).rowCount,0);
    assert.equal((await request("/fixture/inside")).status,401);
    const reset=await request("/api/native-auth/forgot-password",{email:account.email});
    assert.equal(reset.status,200); assert.equal(messages[1].kind,"reset");
  } finally {await close();}
  const member=await legacy();
  const failed=await http(false);
  try {
    const response=await failed.request("/api/native-auth/login",{email:member.email,password});
    assert.equal(response.status,503); assert.ok(!(await response.json()).linkSent);
    assert.equal((await failed.request("/fixture/inside")).status,401);
    assert.equal((await repository.getAccount(member.id))?.password_hash,null);
  } finally {await failed.close();}
});
