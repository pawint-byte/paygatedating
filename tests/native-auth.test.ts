import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import session from "express-session";
import { Passport } from "passport";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pool } from "../server/db";
import { AuthRepository, AuthError, tokenHash, normalizeEmail } from "../server/native-auth/repository";
import { hashPassword, checkPassword } from "../server/native-auth/service";
import { registerNativeAuth } from "../server/native-auth/routes";
import { isAuthenticated } from "../server/replit_integrations/auth/replitAuth";
import { passwordIssues } from "../shared/password-policy";
import { shouldLogApiResponseBody } from "../server/api-log-privacy";
import { parseSignUpReceipt } from "../shared/signup-analytics";
import { newSignUpReceipt } from "../server/signup-analytics";
import { authOrigin } from "../server/native-auth/origin";

const password = "NativeTestPassword2026!";
const repository = new AuthRepository(pool);
const ownIds = new Set<string>();
const ownPendingIds = new Set<string>();
async function fixture() {
  const account = await repository.signup(`native-qa-${randomUUID()}@example.invalid`, await hashPassword(password));
  ownIds.add(account.user_id);
  return account;
}
test.after(async () => {
  for (const id of ownPendingIds) await pool.query("DELETE FROM pending_signups WHERE id=$1",[id]);
  for (const id of ownIds) {
    await pool.query("DELETE FROM native_auth_tokens WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM replit_auth_identities WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM native_auth_accounts WHERE user_id=$1",[id]);
    await pool.query("DELETE FROM users WHERE id=$1",[id]);
  }
  await pool.end();
});

test("email-first capture persists an emailable pending record without any account/password, even after its link expires", async () => {
  const email=`native-pending-${randomUUID()}@example.invalid`;
  const started=await repository.startSignup(email.toUpperCase(),"invite:QA123CODE","QA123CODE");
  ownPendingIds.add(started.pending.id);
  assert.equal(started.pending.email,email);
  assert.equal(started.pending.status,"pending");
  assert.equal(started.pending.referral_source,"invite:QA123CODE");
  assert.equal(started.pending.referral_code,"QA123CODE");
  assert.ok(started.pending.created_at instanceof Date);
  assert.equal((await pool.query("SELECT id FROM users WHERE email=$1",[email])).rowCount,0);
  assert.equal((await pool.query("SELECT user_id FROM native_auth_accounts WHERE email=$1",[email])).rowCount,0);
  assert.ok(!("password_hash" in started.pending));
  const again=await repository.startSignup(email,"different-source");
  assert.equal(again.pending.id,started.pending.id);
  assert.equal(again.pending.referral_source,"invite:QA123CODE");
  await pool.query("UPDATE pending_signup_tokens SET expires_at=now()-interval '1 second' WHERE pending_id=$1",[started.pending.id]);
  await assert.rejects(repository.pendingSignup(started.token),AuthError);
  assert.equal((await pool.query("SELECT status FROM pending_signups WHERE id=$1",[started.pending.id])).rows[0].status,"pending");
  const later=await repository.issueSignupResume(started.pending.id);
  assert.equal((await repository.pendingSignup(later.token)).email,email);
  const account=await repository.completeSignup(later.token,await hashPassword(password));
  ownIds.add(account.user_id);
  const completed=(await pool.query("SELECT * FROM pending_signups WHERE id=$1",[started.pending.id])).rows[0];
  assert.equal(completed.status,"completed");
  assert.equal(completed.completed_user_id,account.user_id);
  assert.ok(completed.completed_at);
  await assert.rejects(repository.pendingSignup(later.token),AuthError);
  await assert.rejects(repository.issueSignupResume(started.pending.id),AuthError);
});

test("concurrent step-two completions create exactly one account and consume every pending continuation", async () => {
  const started=await repository.startSignup(`native-parallel-${randomUUID()}@example.invalid`,"direct");
  ownPendingIds.add(started.pending.id);
  const second=await repository.issueSignupResume(started.pending.id);
  const hash=await hashPassword(password);
  const results=await Promise.allSettled([repository.completeSignup(started.token,hash),repository.completeSignup(second.token,hash)]);
  const success=results.filter((result):result is PromiseFulfilledResult<any>=>result.status==="fulfilled");
  assert.equal(success.length,1);
  ownIds.add(success[0].value.user_id);
  assert.equal((await pool.query("SELECT id FROM users WHERE email=$1",[started.pending.email])).rowCount,1);
  await assert.rejects(repository.completeSignup(started.token,hash),AuthError);
  await assert.rejects(repository.pendingSignup(second.token),AuthError);
});

test("pending signup cannot overwrite or attach a password to an identity created by Replit in the meantime", async () => {
  const email=`native-oidc-race-${randomUUID()}@example.invalid`;
  const started=await repository.startSignup(email,"direct");
  ownPendingIds.add(started.pending.id);
  const subject=randomUUID();
  const oidc=await repository.resolveReplit({sub:subject,email,email_verified:true});
  ownIds.add(subject);
  await assert.rejects(repository.completeSignup(started.token,await hashPassword(password)),(error:any)=>error.status===409);
  assert.equal((await repository.getAccount(subject))?.password_hash,null);
  assert.equal(oidc.account.user_id,subject);
  await assert.rejects(repository.startSignup(email,"direct"),(error:any)=>error.status===409);
});

test("passwords use cost-12 bcrypt, enforce UTF-8 boundaries, and never verify missing credentials", async () => {
  const hash = await hashPassword(password);
  assert.match(hash,/^\$2[ab]\$12\$/);
  assert.notEqual(hash,password);
  assert.deepEqual(passwordIssues(password),[]);
  assert.ok(passwordIssues("weak").length);
  assert.ok(passwordIssues(`Aa9${"é".repeat(40)}`).length);
  assert.deepEqual(passwordIssues("Aa9"+"x".repeat(69)),[]);
  const account = await fixture();
  assert.equal(await checkPassword(password,account),true);
  assert.equal(await checkPassword("WrongPassword2026!",account),false);
  assert.equal(await checkPassword(password),false);
  assert.equal(normalizeEmail(" Person@EXAMPLE.com "),"person@example.com");
});

test("normalized-email collisions cannot create a second account; raw link tokens are never stored", async () => {
  const account = await fixture();
  await assert.rejects(repository.signup(account.email,await hashPassword(password)),(error:any)=>error.status===409);
  const token = await repository.issue(account,"signin");
  const stored = (await pool.query("SELECT hash,expires_at FROM native_auth_tokens WHERE user_id=$1",[account.user_id])).rows[0];
  assert.equal(stored.hash,tokenHash(token));
  assert.notEqual(stored.hash,token);
  const remaining = new Date(stored.expires_at).getTime()-Date.now();
  assert.ok(remaining > 28*60000 && remaining <= 30*60000);
});

test("links enforce purpose and expiry and allow exactly one concurrent consume", async () => {
  const account = await fixture();
  const token = await repository.issue(account,"verify");
  await assert.rejects(repository.consume(token,"signin"),AuthError);
  const outcomes = await Promise.allSettled([repository.consume(token,"verify"),repository.consume(token,"verify")]);
  assert.equal(outcomes.filter(result=>result.status==="fulfilled").length,1);
  assert.ok((await repository.getAccount(account.user_id))?.verified_at);
  await assert.rejects(repository.consume(token,"verify"),AuthError);
  const expired = await repository.issue(account,"signin");
  await pool.query("UPDATE native_auth_tokens SET expires_at=now()-interval '1 second' WHERE hash=$1",[tokenHash(expired)]);
  await assert.rejects(repository.consume(expired,"signin"),AuthError);
});

test("password reset verifies ownership, increments native-session epoch, and invalidates outstanding links", async () => {
  const account = await fixture();
  const pending = await repository.issue(account,"signin");
  const reset = await repository.issue(account,"reset");
  const updated = await repository.consume(reset,"reset",await hashPassword("ReplacementPassword2026!"));
  assert.equal(updated.session_version,account.session_version+1);
  assert.ok(updated.verified_at);
  assert.equal(await checkPassword(password,updated),false);
  assert.equal(await checkPassword("ReplacementPassword2026!",updated),true);
  await assert.rejects(repository.consume(pending,"signin"),AuthError);
});

test("OIDC and native identities keep the canonical ID, reject unverified auto-linking, and preserve email mismatches", async () => {
  const native = await fixture();
  const newSubject = `native-oidc-qa-${randomUUID()}`;
  await assert.rejects(repository.resolveReplit({sub:newSubject,email:native.email}),AuthError);
  const linked = await repository.resolveReplit({sub:newSubject,email:native.email,email_verified:true});
  assert.equal(linked.account.user_id,native.user_id);
  assert.equal(linked.created,false);
  const repeat = await repository.resolveReplit({sub:newSubject,email:`changed-${randomUUID()}@example.invalid`,email_verified:true});
  assert.equal(repeat.account.user_id,native.user_id);
  assert.equal(repeat.account.email,native.email);
  assert.equal(repeat.emailMismatch,true);
  assert.equal((await pool.query("SELECT email FROM users WHERE id=$1",[native.user_id])).rows[0].email,native.email);
});

test("ambiguous case-duplicate legacy emails keep OIDC access but refuse native identity selection", async () => {
  const email = `native-duplicate-${randomUUID()}@example.invalid`;
  const ids = [randomUUID(),randomUUID()];
  for (const [index,id] of ids.entries()) {
    ownIds.add(id);
    await pool.query("INSERT INTO users (id,email) VALUES ($1,$2)",[id,index ? email.toUpperCase() : email]);
  }
  const existing = await repository.resolveReplit({sub:ids[0],email,email_verified:true});
  assert.equal(existing.account.user_id,ids[0]);
  await assert.rejects(repository.byEmail(email),AuthError);
  await assert.rejects(repository.resolveReplit({sub:randomUUID(),email,email_verified:true}),AuthError);
});

test("rate limits persist across repository instances, and stale password edits fail without overwriting", async () => {
  const key=`qa-limit:${randomUUID()}`;
  assert.equal(await repository.allowed(key,2),true);
  assert.equal(await new AuthRepository(pool).allowed(key,2),true);
  assert.equal(await repository.allowed(key,2),false);
  await pool.query("DELETE FROM native_auth_rate_limits WHERE key=$1",[tokenHash(key)]);
  const account=await fixture();
  await repository.setPassword(account,await hashPassword("ReplacementPassword2026!"));
  await assert.rejects(repository.setPassword(account,await hashPassword(password)),(error:any)=>error.status===409);
});

test("two-step HTTP journey captures before password, signs in before verification delivery, and preserves login/recovery", async () => {
  const app = express();
  app.use(express.json());
  app.use(session({secret:randomUUID(),resave:false,saveUninitialized:false,cookie:{sameSite:"lax"}}));
  const passport = new Passport();
  passport.serializeUser((user,done)=>done(null,user));
  passport.deserializeUser((user:any,done)=>done(null,user));
  app.use(passport.initialize());
  app.use(passport.session());
  const messages: { email:string;kind:string;token:string }[] = [];
  let deliver: ()=>void = () => {};
  const delivery = new Promise<void>(resolve=>{deliver=resolve;});
  registerNativeAuth(app,isAuthenticated,{repository,send:async(email,kind,url)=>{
    messages.push({email,kind,token:new URL(url).searchParams.get("token")!});
    await delivery;
    return true;
  }});
  app.get("/api/inside",isAuthenticated,(req:any,res)=>res.json({id:req.user.claims.sub}));
  let paidCalls = 0;
  for (const path of ["/api/wallet/deposit","/api/subscription/create-checkout","/api/gifts/checkout"]) {
    app.post(path,(_req,res)=>{paidCalls++;res.json({allowed:true});});
  }
  app.get("/fixture/logout",(req,res)=>req.logout(()=>res.sendStatus(204)));
  let legacyAccount:any;
  app.get("/fixture/legacy",(req,res)=>{
    req.login({claims:{sub:legacyAccount.user_id,email:legacyAccount.email},authVersion:legacyAccount.session_version,
      authenticatedAt:Date.now(),expires_at:Math.floor(Date.now()/1000)+3600},error=>error ? res.sendStatus(500) : res.sendStatus(204));
  });
  const server = createServer(app).listen(0,"127.0.0.1");
  await once(server,"listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  let cookie = "";
  const request = async(path:string,body?:unknown,headers:Record<string,string>={}) => {
    const response = await fetch(base+path,{method:body===undefined?"GET":"POST",
      headers:{"Content-Type":"application/json",Cookie:cookie,...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const setCookie=response.headers.get("set-cookie");
    if(setCookie) cookie=setCookie.split(";")[0];
    return response;
  };
  try {
    const email=`native-http-${randomUUID()}@example.invalid`;
    assert.equal((await request("/api/native-auth/signup",{email,password})).status,400);
    assert.equal((await request("/api/native-auth/signup",{email,password,adultConfirmed:true,acceptedTerms:true})).status,400);
    const start=await request("/api/native-auth/signup/start",{email,referralSource:"campaign:qa",referralCode:"QAREF123"});
    assert.equal(start.status,201);
    const startBody=await start.json();
    assert.equal(startBody.resumePath,"/signup/complete");
    assert.ok(!startBody.token);
    const pending=(await pool.query("SELECT * FROM pending_signups WHERE email=$1",[email])).rows[0];
    ownPendingIds.add(pending.id);
    assert.equal(pending.status,"pending");
    assert.equal(pending.referral_source,"campaign:qa");
    assert.equal((await request("/api/inside")).status,401);
    assert.equal((await pool.query("SELECT id FROM users WHERE email=$1",[email])).rowCount,0);
    const resume=await request("/api/native-auth/signup/resume",{});
    assert.equal(resume.status,200);
    assert.equal((await resume.json()).referralCode,"QAREF123");
    const continuation=messages.find(message=>message.kind==="signup")!;
    assert.ok(continuation);
    const anotherDevice=await fetch(base+"/api/native-auth/signup/resume",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:continuation.token})});
    assert.equal(anotherDevice.status,200);
    assert.equal((await anotherDevice.json()).email,email);
    assert.equal((await request("/api/native-auth/signup",{password,adultConfirmed:false,acceptedTerms:true})).status,400);
    const signup = await request("/api/native-auth/signup",{password,adultConfirmed:true,acceptedTerms:true});
    assert.equal(signup.status,201);
    assert.equal((await signup.json()).redirect,"/setup");
    const inside=await request("/api/inside");
    assert.equal(inside.status,200);
    const id=(await inside.json()).id;
    ownIds.add(id);
    assert.ok(cookie);
    const initialCookie=cookie;
    assert.equal((await request("/api/native-auth/status")).status,200);
    for(const path of ["/api/wallet/deposit","/api/subscription/create-checkout","/api/gifts/checkout"]) {
      const blocked=await request(path,{});
      assert.equal(blocked.status,403);
      assert.equal((await blocked.json()).code,"EMAIL_VERIFICATION_REQUIRED");
    }
    assert.equal(paidCalls,0);
    for(let i=0;i<100 && !messages.some(message=>message.kind==="verify");i++) await new Promise(resolve=>setTimeout(resolve,20));
    const verification=messages.find(message=>message.kind==="verify")!;
    assert.ok(verification);
    deliver();
    assert.equal((await request("/api/native-auth/signup/resume",{token:continuation.token})).status,400);
    assert.equal((await pool.query("SELECT status FROM pending_signups WHERE id=$1",[pending.id])).rows[0].status,"completed");
    const verified=await request("/api/native-auth/consume",{kind:"verify",token:verification.token});
    assert.equal(verified.status,200);
    assert.notEqual(cookie,initialCookie);
    assert.equal((await (await request("/api/native-auth/status")).json()).emailVerified,true);
    assert.equal((await request("/api/gifts/checkout",{})).status,200);
    assert.equal(paidCalls,1);
    assert.equal((await request("/api/native-auth/consume",{kind:"verify",token:verification.token})).status,400);
    assert.equal((await request("/api/native-auth/login",{email,password},{Origin:"https://attacker.invalid"})).status,403);
    assert.throws(()=>authOrigin({protocol:"http",get:()=>"attacker.invalid"} as any),AuthError);
    await request("/fixture/logout");
    assert.equal((await request("/api/inside")).status,401);
    assert.equal((await request("/api/native-auth/login",{email,password:"WrongPassword2026!"})).status,401);
    assert.equal((await request("/api/native-auth/login",{email,password})).status,200);
    assert.equal((await (await request("/api/inside")).json()).id,id);
    assert.equal((await request("/api/native-auth/set-password",{currentPassword:password,password:"SettingsPassword2026!"})).status,200);
    assert.equal((await request("/api/inside")).status,200);
    const parallelLogin=await fetch(base+"/api/native-auth/login",{method:"POST",
      headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:"SettingsPassword2026!"})});
    assert.equal(parallelLogin.status,200);
    const parallelCookie=parallelLogin.headers.get("set-cookie")!.split(";")[0];
    const forgotten = await request("/api/native-auth/forgot-password",{email:"unknown@example.invalid"});
    const known = await request("/api/native-auth/forgot-password",{email});
    assert.deepEqual(await forgotten.json(),await known.json());
    for(let i=0;i<100 && !messages.some(message=>message.kind==="reset");i++) await new Promise(resolve=>setTimeout(resolve,20));
    const reset=messages.find(message=>message.kind==="reset")!;
    assert.ok(reset);
    const oldCookie=cookie;
    assert.equal((await request("/api/native-auth/reset-password",{token:reset.token,password:"ReplacementPassword2026!"})).status,200);
    assert.notEqual(cookie,oldCookie);
    assert.equal((await fetch(base+"/api/inside",{headers:{Cookie:oldCookie}})).status,401);
    assert.equal((await fetch(base+"/api/inside",{headers:{Cookie:parallelCookie}})).status,401);
    assert.equal((await request("/api/native-auth/reset-password",{token:reset.token,password})).status,400);
    assert.equal((await request("/api/native-auth/login",{email,password})).status,401);
    await request("/fixture/logout");
    const legacyId=randomUUID();
    const legacyEmail=`native-legacy-${randomUUID()}@example.invalid`;
    ownIds.add(legacyId);
    await pool.query("INSERT INTO users (id,email) VALUES ($1,$2)",[legacyId,legacyEmail]);
    legacyAccount=(await repository.resolveReplit({sub:legacyId,email:legacyEmail,email_verified:true})).account;
    await request("/fixture/legacy");
    assert.equal((await (await request("/api/native-auth/status")).json()).hasPassword,false);
    assert.equal((await request("/api/native-auth/set-password",{password})).status,200);
    assert.equal((await (await request("/api/inside")).json()).id,legacyId);
    await request("/fixture/logout");
    assert.equal((await request("/api/native-auth/login",{email:legacyEmail,password})).status,200);
    assert.equal((await (await request("/api/inside")).json()).id,legacyId);
  } finally {
    deliver();
    server.close();
    await once(server,"close");
  }
});

test("email-token pages do not load analytics or affiliate scripts; ordinary signup still loads both", () => {
  const html=readFileSync("client/index.html","utf8");
  const blocks=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match=>!match[1].includes('type="'));
  for(const pathname of ["/auth/confirm","/reset-password","/signup/complete","/signup"]) {
    const scripts:any[]=[];
    const context=vm.createContext({window:{location:{pathname},addEventListener:()=>{}},navigator:{},
      document:{createElement:()=>({}),head:{appendChild:(script:any)=>scripts.push(script)}},Date});
    // Browsers expose window properties as globals. Only signup defines gtag.
    for(const block of blocks) {
      const source=block[2].replace(/(?<!\.)\bgtag\(/g,"window.gtag(");
      new vm.Script(source).runInContext(context);
    }
    assert.equal(scripts.length,pathname==="/signup"?2:0);
  }
});

test("auth logging excludes credentials and tokens; analytics retains the truthful native signup method", () => {
  for(const path of ["/api/native-auth/signup","/api/native-auth/reset-password","/api/native-auth/consume","/api/auth/user"]) assert.equal(shouldLogApiResponseBody(path),false);
  assert.equal(parseSignUpReceipt(JSON.stringify(newSignUpReceipt("password")))?.method,"password");
  const auth = readFileSync("server/replit_integrations/auth/replitAuth.ts","utf8");
  assert.ok(!auth.includes('prompt: "login consent"'));
  assert.ok(auth.includes("canonicalSub"));
  assert.ok(auth.includes("user.nativeAuth"));
});
