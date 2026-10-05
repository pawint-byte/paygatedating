/**
 * Exact browser routes rendered by the client application. Keep this list in
 * sync with the top-level routes in client/src/App.tsx.
 */
export const APP_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/safety",
  "/guidelines",
  "/gift-demo",
  "/contact",
  "/pricing",
  "/how-it-works",
  "/features",
  "/stories",
  "/faq",
  "/assistant-guide",
  "/discover",
  "/setup",
  "/serious-romance",
  "/activity-partner",
  "/nearby",
  "/radar",
  "/matches",
  "/messages",
  "/profile",
  "/verification",
  "/settings",
  "/assistant-access",
  "/wallet",
  "/wishlist",
  "/feedback",
  "/rewards",
  "/admin/feedback",
  "/admin/users",
  "/gifts",
  "/gift-success",
  "/gift-cancel",
  "/subscription/success",
] as const;

export const APP_DYNAMIC_PATHS = [
  "/invite/:referralCode",
  "/p/:userId",
  "/serious-romance/p/:userId",
  "/activity-partner/p/:userId",
] as const;

const exactPaths: ReadonlySet<string> = new Set(APP_PATHS);
const dynamicPathPatterns = [
  /^\/invite\/[^/]+\/?$/,
  /^\/p\/[^/]+\/?$/,
  /^\/(?:serious-romance|activity-partner)\/p\/[^/]+\/?$/,
];

export function isAppPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  return exactPaths.has(normalized) ||
    dynamicPathPatterns.some((pattern) => pattern.test(pathname));
}