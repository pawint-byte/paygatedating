import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";

type RouteMethod = "get" | "post";

const MESSAGE_ROUTES: Array<{ method: RouteMethod; path: string }> = [
  { method: "get", path: "/api/matches/:id/messages" },
  { method: "post", path: "/api/matches/:id/messages" },
  { method: "post", path: "/api/matches/:id/messages/read" },
];

function extractMessageHandler(method: RouteMethod, path: string, storage: object) {
  const file = "server/routes.ts";
  const tree = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  let expression: string | undefined;

  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === `app.${method}` &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === path
    ) {
      assert.equal(node.arguments[1]?.getText(tree), "isAuthenticated");
      expression = node.arguments.at(-1)!.getText(tree);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.ok(expression, `Could not find ${method.toUpperCase()} ${path}`);

  const context = vm.createContext({
    storage,
    z,
    authStorage: { getUser: async () => undefined },
    emailService: { sendNewMessage: async () => undefined },
    console,
    handler: undefined,
  });
  vm.runInContext(
    ts.transpileModule(`handler = (${expression});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
    { filename: file },
  );
  return context.handler as (req: any, res: any) => Promise<void>;
}

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.body = body;
      return this;
    },
  };
}

function makeMatch(currentGate: string, status = currentGate === "completed" ? "completed" : "active") {
  return {
    id: "pair",
    initiatorId: "alice",
    recipientId: "bob",
    currentGate,
    status,
  };
}

function makeHarness() {
  const events = {
    createdMessages: [] as any[],
    readRequests: [] as string[][],
  };
  const state: { match?: any } = { match: makeMatch("gate3") };
  const storage = {
    getMatch: async () => state.match,
    getMessages: async () => [
      {
        id: "message-1",
        matchId: "pair",
        senderId: "bob",
        content: "Hello",
        readAt: null,
      },
    ],
    getProfile: async () => undefined,
    createMessage: async (message: any) => {
      events.createdMessages.push(message);
      return { id: "created-message", ...message };
    },
    markMessagesAsRead: async (matchId: string, userId: string) => {
      events.readRequests.push([matchId, userId]);
    },
  };
  const handlers = new Map(
    MESSAGE_ROUTES.map(({ method, path }) => [
      `${method} ${path}`,
      extractMessageHandler(method, path, storage),
    ]),
  );

  async function request(
    method: RouteMethod,
    path: string,
    userId?: string,
    body?: unknown,
  ) {
    const req: any = {
      params: { id: "pair" },
      body,
      user: userId
        ? {
            claims: { sub: userId },
            expires_at: Math.floor(Date.now() / 1000) + 60,
          }
        : undefined,
      isAuthenticated: () => Boolean(userId),
    };
    const res = makeResponse();
    const handler = handlers.get(`${method} ${path}`)!;

    // This mirrors isAuthenticated without importing the auth/database stack.
    if (!req.isAuthenticated() || !req.user?.expires_at) {
      res.status(401).json({ message: "Unauthorized" });
      return res;
    }
    await handler(req, res);
    return res;
  }

  return { events, state, request };
}

test("message routes require auth, an existing match, and membership before gate checks", async () => {
  const harness = makeHarness();

  for (const route of MESSAGE_ROUTES) {
    let response = await harness.request(route.method, route.path);
    assert.equal(response.statusCode, 401, `${route.method} ${route.path}`);

    harness.state.match = undefined;
    response = await harness.request(route.method, route.path, "alice");
    assert.equal(response.statusCode, 404, `${route.method} ${route.path}`);

    harness.state.match = makeMatch("gate3");
    response = await harness.request(route.method, route.path, "outsider");
    assert.equal(response.statusCode, 403, `${route.method} ${route.path}`);
    assert.equal(response.body.message, "Not authorized");
  }
});

test("declined matches are unavailable to members on all message routes", async () => {
  const harness = makeHarness();
  harness.state.match = makeMatch("gate3", "declined");

  for (const route of MESSAGE_ROUTES) {
    const outsiderResponse = await harness.request(route.method, route.path, "outsider", {
      content: "This must not be sent",
    });
    assert.equal(outsiderResponse.statusCode, 403, `${route.method} ${route.path} outsider`);
    assert.equal(outsiderResponse.body.message, "Not authorized");

    const response = await harness.request(route.method, route.path, "alice", {
      content: "This must not be sent",
    });
    assert.equal(response.statusCode, 403, `${route.method} ${route.path}`);
    assert.equal(response.body.message, "Match already ended");
  }

  assert.deepEqual(harness.events.createdMessages, []);
  assert.deepEqual(harness.events.readRequests, []);
});

test("messages stay gated below Gate 3 for either member", async () => {
  const harness = makeHarness();

  for (const gate of ["gate1", "gate2"]) {
    harness.state.match = makeMatch(gate);
    for (const userId of ["alice", "bob"]) {
      for (const route of MESSAGE_ROUTES) {
        const response = await harness.request(route.method, route.path, userId, {
          content: "Not unlocked",
        });
        assert.equal(response.statusCode, 403, `${route.method} ${route.path} ${gate} ${userId}`);
        assert.equal(response.body.message, "Chat unlocked at Gate 3 or higher");
      }
    }
  }

  assert.deepEqual(harness.events.createdMessages, []);
  assert.deepEqual(harness.events.readRequests, []);
});

test("either member can fetch, send, and mark messages read at Gates 3 through completion", async () => {
  const harness = makeHarness();

  for (const gate of ["gate3", "gate4", "gate5", "completed"]) {
    harness.state.match = makeMatch(gate);
    for (const userId of ["alice", "bob"]) {
      const getResponse = await harness.request("get", "/api/matches/:id/messages", userId);
      assert.equal(getResponse.statusCode, 200, `GET ${gate} ${userId}`);
      assert.equal(getResponse.body[0].content, "Hello");

      const postResponse = await harness.request(
        "post",
        "/api/matches/:id/messages",
        userId,
        { content: "x".repeat(2000) },
      );
      assert.equal(postResponse.statusCode, 201, `POST ${gate} ${userId}`);
      assert.equal(postResponse.body.content.length, 2000);

      const readResponse = await harness.request(
        "post",
        "/api/matches/:id/messages/read",
        userId,
      );
      assert.equal(readResponse.statusCode, 200, `READ ${gate} ${userId}`);
      assert.equal(readResponse.body.success, true);
    }
  }

  assert.equal(harness.events.createdMessages.length, 8);
  assert.equal(harness.events.readRequests.length, 8);
});

test("POST messages rejects content longer than 2000 characters without writing", async () => {
  const harness = makeHarness();
  harness.state.match = makeMatch("gate3");

  const response = await harness.request(
    "post",
    "/api/matches/:id/messages",
    "alice",
    { content: "x".repeat(2001) },
  );

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /String must contain at most 2000 character/);
  assert.deepEqual(harness.events.createdMessages, []);
});