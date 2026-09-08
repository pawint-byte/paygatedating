import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { and, eq, isNull } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateHeardVia(id: string, attribution: Pick<User, "heardVia" | "heardViaOther">): Promise<User | undefined>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
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
