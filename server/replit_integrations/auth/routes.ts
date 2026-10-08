import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { addSignUpAnalyticsHeader, registerSignUpAnalyticsAck } from "../../signup-analytics";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  registerSignUpAnalyticsAck(app, isAuthenticated);
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      addSignUpAnalyticsHeader(res, req.user, !!user);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
