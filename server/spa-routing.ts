import type { NextFunction, Request, RequestHandler, Response } from "express";
import { isAppPath } from "@shared/app-paths";

const NOT_FOUND_HTML =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>404 Not Found</title></head><body><h1>404 Not Found</h1></body></html>';

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export type SpaIndexHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

/**
 * Final application fallback. Static files and all registered server routes
 * must be mounted before this handler.
 */
export function createSpaFallback(serveIndex: SpaIndexHandler): RequestHandler {
  return (req, res, next) => {
    if (isApiPath(req.path)) {
      return res.status(404).json({ message: "Not Found" });
    }

    if (!isAppPath(req.path)) {
      return res.status(404).type("html").send(NOT_FOUND_HTML);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.set("Allow", "GET, HEAD");
      return res.status(405).type("text").send("Method Not Allowed");
    }

    return void Promise.resolve(serveIndex(req, res, next)).catch(next);
  };
}