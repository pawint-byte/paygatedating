import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createSpaFallback } from "./spa-routing";

export function serveStatic(
  app: Express,
  directory = path.resolve(__dirname, "public"),
) {
  const distPath = directory;
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  app.use(createSpaFallback((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  }));
}
