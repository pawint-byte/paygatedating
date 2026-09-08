import { setupQaMembers } from "../server/qa-members";
import { pool } from "../server/db";

// Workspace-only alternative to the Admin endpoint. Never part of startup/build.
async function main() {
  if (!process.env.REPL_ID || process.env.NODE_ENV !== "development" ||
    !process.argv.includes("--confirm-track-a-qa")) {
    throw new Error(
      "Run only in the Replit development workspace: NODE_ENV=development npx tsx script/seed-track-a-qa.ts --confirm-track-a-qa. For live data, use the authenticated Admin panel.",
    );
  }
  console.log(JSON.stringify(await setupQaMembers("Replit development workspace"), null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());