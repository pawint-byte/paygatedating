import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { and, eq, getTableColumns, isNull, sql } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser, onAccountCreated?: () => void): Promise<User>;
  updateHeardVia(id: string, attribution: Pick<User, "heardVia" | "heardViaOther">): Promise<User | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser, onAccountCreated?: () => void): Promise<User> {
    const [result] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning({
        ...getTableColumns(users),
        // Read-only INSERT metadata from the same atomic upsert. Unlike a
        // pre-insert lookup this cannot count concurrent logins as new accounts.
        __analyticsInserted: sql<boolean>`xmax = 0`,
      });
    const { __analyticsInserted, ...user } = result;
    if (__analyticsInserted && onAccountCreated) {
      try {
        onAccountCreated();
      } catch {
        // Analytics must never interrupt successful account creation or login.
        console.warn("Signup analytics receipt could not be created.");
      }
    }
    return user;
  }

  async updateHeardVia(
    id: string,
    attribution: Pick<User, "heardVia" | "heardViaOther">,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...attribution, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.heardVia)))
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
