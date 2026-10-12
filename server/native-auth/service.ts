import bcrypt from "bcryptjs";
import { pool } from "../db";
import { AuthError, AuthRepository, type Account } from "./repository";
import { passwordIssues } from "../../shared/password-policy";

export const nativeAuthRepository = new AuthRepository(pool);
export async function hashPassword(password: unknown): Promise<string> {
  const issues = passwordIssues(password);
  if (issues.length) throw new AuthError(400, issues.join(" "));
  return bcrypt.hash(password as string, 12);
}
// A real bcrypt hash keeps missing-account password checks on the same costly path.
const dummyHash = bcrypt.hash("NotARealPassword9384!", 12);
export async function checkPassword(password: unknown, account?: Account): Promise<boolean> {
  if (typeof password !== "string" || new TextEncoder().encode(password).length > 72) return false;
  const valid = await bcrypt.compare(password, account?.password_hash ?? await dummyHash);
  return !!account?.password_hash && valid;
}
