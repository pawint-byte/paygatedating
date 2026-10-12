export function passwordIssues(password: unknown): string[] {
  if (typeof password !== "string") return ["Enter a password."];
  const issues: string[] = [];
  if (Array.from(password).length < 10) issues.push("Use at least 10 characters.");
  if (!/[a-z]/.test(password)) issues.push("Include a lowercase letter.");
  if (!/[A-Z]/.test(password)) issues.push("Include an uppercase letter.");
  if (!/[0-9]/.test(password)) issues.push("Include a number.");
  if (new TextEncoder().encode(password).length > 72) issues.push("Use no more than 72 UTF-8 bytes.");
  return issues;
}
