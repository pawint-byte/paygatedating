import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

export type TokenKind = "verify" | "signin" | "reset";
export type Account = {
  user_id: string; email: string; password_hash: string | null;
  verified_at: Date | null; session_version: number;
  password_prompt_skipped_at: Date | null;
  force_password_setup?: boolean;
};
export type PendingSignup = {
  id: string; email: string; created_at: Date; last_submitted_at: Date;
  referral_source: string; referral_code: string | null; status: string;
};
export class AuthError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") throw new AuthError(400, "Enter a valid email address.");
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError(400, "Enter a valid email address.");
  return email;
}
export function tokenHash(token: string): string { return createHash("sha256").update(token).digest("hex"); }

export class AuthRepository {
  private nextCleanup = 0;
  constructor(private pool: Pool) {}
  private async transaction<T>(operation: (connection: PoolClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      await connection.query("BEGIN");
      const result = await operation(connection);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally { connection.release(); }
  }
  private async emailLock(connection: PoolClient, email: string) {
    await connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [email]);
  }
  async signup(email: string, passwordHash: string): Promise<Account> {
    return this.transaction(async c => {
      email = normalizeEmail(email);
      await this.emailLock(c, email);
      return this.createAccount(c,email,passwordHash);
    });
  }
  private async createAccount(c: PoolClient,email: string,passwordHash: string): Promise<Account> {
      const existing = await c.query("SELECT id FROM users WHERE lower(btrim(email)) = $1", [email]);
      if (existing.rowCount) throw new AuthError(409, "An account already uses this email. Log in or request an email sign-in link.");
      const id = randomUUID();
      await c.query("INSERT INTO users (id,email) VALUES ($1,$2)", [id, email]);
      const { rows } = await c.query<Account>(`INSERT INTO native_auth_accounts
        (user_id,email,password_hash,adult_confirmed_at,terms_accepted_at)
        VALUES ($1,$2,$3,now(),now()) RETURNING *`, [id, email, passwordHash]);
      return rows[0];
  }
  private async issuePendingToken(c: PoolClient,id: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await c.query(`INSERT INTO pending_signup_tokens (hash,pending_id,expires_at)
      VALUES ($1,$2,now()+interval '24 hours')`,[tokenHash(token),id]);
    return token;
  }
  async startSignup(email: string,referralSource: string,referralCode?: string): Promise<{pending:PendingSignup;token:string}> {
    email = normalizeEmail(email);
    return this.transaction(async c => {
      await this.emailLock(c,email);
      if ((await c.query("SELECT id FROM users WHERE lower(btrim(email))=$1",[email])).rowCount)
        throw new AuthError(409,"An account already uses this email. Log in or request an email sign-in link.");
      const {rows} = await c.query<PendingSignup>(`INSERT INTO pending_signups
        (id,email,referral_source,referral_code) VALUES ($1,$2,$3,$4)
        ON CONFLICT(email) DO UPDATE SET last_submitted_at=now() RETURNING *`,
        [randomUUID(),email,referralSource,referralCode ?? null]);
      if (rows[0].status !== "pending") throw new AuthError(409,"This signup is already completed. Log in to continue.");
      return {pending:rows[0],token:await this.issuePendingToken(c,rows[0].id)};
    });
  }
  /** Issues a fresh continuation for a future, explicitly requested finish-signup message. No scheduler/drip. */
  async issueSignupResume(id: string): Promise<{pending:PendingSignup;token:string}> {
    return this.transaction(async c => {
      const {rows} = await c.query<PendingSignup>("SELECT * FROM pending_signups WHERE id=$1 AND status='pending' FOR UPDATE",[id]);
      if (!rows[0]) throw new AuthError(400,"This signup is no longer pending.");
      return {pending:rows[0],token:await this.issuePendingToken(c,id)};
    });
  }
  private validPendingToken(token: unknown): asserts token is string {
    if (typeof token !== "string" || !/^[\w-]{43}$/.test(token))
      throw new AuthError(400,"Enter your email first, or open a fresh signup continuation link.");
  }
  async pendingSignup(token: unknown): Promise<PendingSignup> {
    this.validPendingToken(token);
    const {rows} = await this.pool.query<PendingSignup>(`SELECT p.* FROM pending_signups p
      JOIN pending_signup_tokens t ON t.pending_id=p.id
      WHERE t.hash=$1 AND t.used_at IS NULL AND t.expires_at>now() AND p.status='pending'`,[tokenHash(token)]);
    if (!rows[0]) throw new AuthError(400,"This signup link is invalid, expired, or already completed. Enter your email again or log in.");
    return rows[0];
  }
  async completeSignup(token: unknown,passwordHash: string): Promise<Account> {
    this.validPendingToken(token);
    return this.transaction(async c => {
      const initial = await c.query<PendingSignup>(`SELECT p.* FROM pending_signups p
        JOIN pending_signup_tokens t ON t.pending_id=p.id WHERE t.hash=$1`,[tokenHash(token)]);
      if (!initial.rows[0]) throw new AuthError(400,"This signup link is invalid. Enter your email again.");
      // Always lock email before pending rows, matching startSignup's lock order.
      await this.emailLock(c,initial.rows[0].email);
      const {rows} = await c.query<PendingSignup>(`SELECT p.* FROM pending_signups p JOIN pending_signup_tokens t ON t.pending_id=p.id
        WHERE t.hash=$1 AND t.used_at IS NULL AND t.expires_at>now() AND p.status='pending' FOR UPDATE OF p,t`,[tokenHash(token)]);
      if (!rows[0]) throw new AuthError(400,"This signup link is invalid, expired, or already completed. Enter your email again or log in.");
      const account = await this.createAccount(c,rows[0].email,passwordHash);
      await c.query(`UPDATE pending_signups SET status='completed',completed_at=now(),completed_user_id=$2 WHERE id=$1`,[rows[0].id,account.user_id]);
      await c.query("UPDATE pending_signup_tokens SET used_at=now() WHERE pending_id=$1 AND used_at IS NULL",[rows[0].id]);
      return account;
    });
  }
  async getAccount(id: string): Promise<Account | undefined> {
    return (await this.pool.query<Account>("SELECT * FROM native_auth_accounts WHERE user_id=$1", [id])).rows[0];
  }
  async ensureAccount(id: string): Promise<Account> {
    return this.transaction(async c => {
      const { rows } = await c.query<{ email: string }>("SELECT email FROM users WHERE id=$1", [id]);
      if (!rows[0]?.email) throw new AuthError(409, "Your account needs an email address. Contact support for help linking it.");
      const email = normalizeEmail(rows[0].email);
      await this.emailLock(c, email);
      const matches = await c.query("SELECT id FROM users WHERE lower(btrim(email))=$1", [email]);
      if (matches.rowCount !== 1) throw new AuthError(409, "Multiple accounts use this email. Contact support; accounts have not been merged.");
      const result = await c.query<Account>(`INSERT INTO native_auth_accounts (user_id,email) VALUES ($1,$2)
        ON CONFLICT (user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`, [id,email]);
      return result.rows[0];
    });
  }
  async byEmail(email: string): Promise<Account | undefined> {
    const { rows } = await this.pool.query<{ id: string }>("SELECT id FROM users WHERE lower(btrim(email))=$1", [email]);
    if (rows.length > 1) throw new AuthError(409, "Multiple accounts use this email. Contact support; accounts have not been merged.");
    if (!rows.length) return undefined;
    return this.ensureAccount(rows[0].id);
  }
  async issue(account: Account, kind: TokenKind, passwordSetup = false): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const ttl = kind === "verify" ? 24 * 3600 : 30 * 60;
    await this.pool.query(`INSERT INTO native_auth_tokens (hash,user_id,email,kind,session_version,expires_at,password_setup)
      VALUES ($1,$2,$3,$4,$5,now()+$6*interval '1 second',$7)`,
      [tokenHash(token), account.user_id, account.email, kind, account.session_version, ttl,passwordSetup]);
    return token;
  }
  async consume(token: string, kind: TokenKind, passwordHash?: string): Promise<Account> {
    if (!/^[\w-]{43}$/.test(token)) throw new AuthError(400, "This link is invalid or expired. Request a fresh link.");
    return this.transaction(async c => {
      const { rows } = await c.query<Account & { hash: string; password_setup:boolean }>(`SELECT a.*,t.hash,t.password_setup FROM native_auth_tokens t
        JOIN native_auth_accounts a ON a.user_id=t.user_id
        WHERE t.hash=$1 AND t.kind=$2 AND t.used_at IS NULL AND t.expires_at>now()
          AND t.email=a.email AND t.session_version=a.session_version FOR UPDATE OF a,t`,
        [tokenHash(token), kind]);
      if (!rows[0]) throw new AuthError(400, "This link is invalid, expired, or already used. Request a fresh link.");
      await c.query("UPDATE native_auth_tokens SET used_at=now() WHERE hash=$1", [tokenHash(token)]);
      const reset = kind === "reset";
      if (reset && !passwordHash) throw new AuthError(400, "Enter a new password.");
      const result = await c.query<Account>(`UPDATE native_auth_accounts
        SET verified_at=COALESCE(verified_at,now()),password_hash=CASE WHEN $2 THEN $3 ELSE password_hash END,
          session_version=session_version+CASE WHEN $2 THEN 1 ELSE 0 END
        WHERE user_id=$1 RETURNING *`, [rows[0].user_id,reset,passwordHash ?? null]);
      if (reset) await c.query("UPDATE native_auth_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL", [rows[0].user_id]);
      return {...result.rows[0],force_password_setup:rows[0].password_setup === true};
    });
  }
  async setPassword(account: Account, passwordHash: string): Promise<Account> {
    const result = await this.pool.query<Account>(`UPDATE native_auth_accounts SET password_hash=$2,session_version=session_version+1
      WHERE user_id=$1 AND session_version=$3 RETURNING *`, [account.user_id,passwordHash,account.session_version]);
    if (!result.rows[0]) throw new AuthError(409,"Your account changed. Sign in again before changing your password.");
    return result.rows[0];
  }
  async skipPasswordPrompt(account: Account): Promise<void> {
    const result = await this.pool.query(`UPDATE native_auth_accounts SET password_prompt_skipped_at=now()
      WHERE user_id=$1 AND password_hash IS NULL AND password_prompt_skipped_at IS NULL RETURNING user_id`,[account.user_id]);
    if (!result.rowCount) throw new AuthError(409,"This password prompt has already been skipped, or a password is already set.","PASSWORD_PROMPT_ALREADY_SKIPPED");
  }
  async allowed(key: string, maximum: number): Promise<boolean> {
    if (Date.now() > this.nextCleanup) {
      this.nextCleanup = Date.now()+300000;
      await this.pool.query("DELETE FROM native_auth_rate_limits WHERE expires_at<=now()");
    }
    const { rows } = await this.pool.query<{ hits: number }>(`INSERT INTO native_auth_rate_limits (key,hits,expires_at)
      VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET
        hits=CASE WHEN native_auth_rate_limits.expires_at<=now() THEN 1 ELSE native_auth_rate_limits.hits+1 END,
        expires_at=CASE WHEN native_auth_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE native_auth_rate_limits.expires_at END
      RETURNING hits`, [tokenHash(key)]);
    return rows[0].hits <= maximum;
  }
  async resolveReplit(claims: Record<string, any>): Promise<{ account: Account; created: boolean; emailMismatch: boolean }> {
    const subject = claims.sub;
    if (typeof subject !== "string" || !subject) throw new AuthError(400,"Missing Replit identity.");
    const email = normalizeEmail(claims.email);
    return this.transaction(async c => {
      await this.emailLock(c, email);
      let user = (await c.query<{ id: string; email: string }>(`SELECT id,email FROM users WHERE id=$1
        UNION SELECT u.id,u.email FROM replit_auth_identities i JOIN users u ON u.id=i.user_id WHERE i.subject=$1`, [subject])).rows[0];
      let created = false;
      if (!user) {
        const matches = (await c.query<{ id: string; email: string }>("SELECT id,email FROM users WHERE lower(btrim(email))=$1", [email])).rows;
        if (matches.length > 1) throw new AuthError(409,"Duplicate email identities require support. No accounts were merged.");
        if (matches.length) {
          if (claims.email_verified !== true) throw new AuthError(409,"Use email sign-in to access this account. Replit did not confirm email ownership.");
          user = matches[0];
        } else {
          user = (await c.query(`INSERT INTO users (id,email,first_name,last_name,profile_image_url)
            VALUES ($1,$2,$3,$4,$5) RETURNING id,email`, [subject,email,claims.first_name ?? null,claims.last_name ?? null,claims.profile_image_url ?? null])).rows[0];
          created = true;
        }
      }
      const canonicalEmail = normalizeEmail(user.email);
      const duplicateCount = await c.query("SELECT id FROM users WHERE lower(btrim(email))=$1", [canonicalEmail]);
      const emailMismatch = canonicalEmail !== email;
      if (duplicateCount.rowCount !== 1) {
        // A known OIDC subject must still reach its original profile. Ambiguous
        // emails cannot be used for native login/linking or paid verification.
        return { account: { user_id:user.id,email:canonicalEmail,password_hash:null,verified_at:null,session_version:0,password_prompt_skipped_at:null },created:false,emailMismatch };
      }
      const { rows } = await c.query<Account>(`INSERT INTO native_auth_accounts (user_id,email,verified_at)
        VALUES ($1,$2,CASE WHEN $3 THEN now() ELSE NULL END) ON CONFLICT (user_id) DO UPDATE
        SET verified_at=COALESCE(native_auth_accounts.verified_at,EXCLUDED.verified_at) RETURNING *`,
        [user.id,canonicalEmail,claims.email_verified === true && !emailMismatch]);
      await c.query("INSERT INTO replit_auth_identities (subject,user_id) VALUES ($1,$2) ON CONFLICT(subject) DO NOTHING", [subject,user.id]);
      return { account: rows[0], created, emailMismatch };
    });
  }
}
