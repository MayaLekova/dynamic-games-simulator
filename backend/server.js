import { serve } from "crossws/server";
import { Server } from "teleportal/server";
import { YDocStorage } from "teleportal/storage";
import { getHTTPHandlers } from "teleportal/http";
import { getWebsocketHandlers } from "teleportal/websocket-server";
import { createTokenManager } from "teleportal/token";

import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { websocket } from "teleportal/providers";

const PORT = 8000;

const MIME_TYPES = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  js: "text/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

const STATIC_PATH = path.join(process.cwd(), "frontend");

const toBool = [() => true, () => false];

const prepareFile = async (url) => {
  const paths = [STATIC_PATH, url];
  if (url.endsWith("/")) paths.push("index.html");
  const filePath = path.join(...paths);
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;
  const streamPath = found ? filePath : `${STATIC_PATH}/404.html`;
  const ext = path.extname(streamPath).substring(1).toLowerCase();
  const stream = fs.createReadStream(streamPath);
  return { found, ext, stream };
};

// Node.js HTTP server
http
  .createServer(async (req, res) => {
    const file = await prepareFile(req.url);
    const statusCode = file.found ? 200 : 404;
    const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
    res.writeHead(statusCode, { "Content-Type": mimeType });
    file.stream.pipe(res);
    console.log(`${req.method} ${req.url} ${statusCode}`);
  })
  .listen(PORT);

console.log(`Server running at http://127.0.0.1:${PORT}/`);

const tokenManager = createTokenManager({
  secret: "your-secret-key-here",
  expiresIn: 3600, // 1 hour
  issuer: "my-collaborative-app",
});

// [done] TODO_1: use `server` somewhere
// [done] TODO_2: for authentication, add checkPermission property as in
// https://teleportal.tools/core-concepts/authentication/#server-integration

// [done] TODO_3: Add back WebSocket transport.

// Teleportal server
const server = new Server({
  storage: new YDocStorage(),
  checkPermission: async ({ context, documentId, fileId, message, type }) => {
    // Extract token from context
    const token = context.token; // TS specific: (context as any).token;
    if (!token) return false;

    // Verify token
    const result = await tokenManager.verifyToken(token);
    if (!result.valid || !result.payload) return false;

    const payload = result.payload;

    // Check room access
    if (payload.room !== context.room) return false;

    // Handle file messages
    if (message.type === "file") {
      // File messages use fileId for permission checks
      return true; // Implement file-specific permission checks
    }

    // Check document permissions
    if (!documentId) {
      throw new Error("documentId is required for doc messages");
    }
    const requiredPermission = message.type === "awareness" ? "read" : "write";
    return tokenManager.hasDocumentPermission(payload, documentId, requiredPermission);
  },
});

async function extractAndCheckToken(request) {
  // Extract token from request
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ||
                request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new Response("No token provided", { status: 401 });
  }

  // Verify token
  const result = await tokenManager.verifyToken(token);
  if (!result.valid || !result.payload) {
    throw new Response("Invalid token", { status: 401 });
  }

  const payload = result.payload;

  // Check expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Response("Token expired", { status: 401 });
  }
  
  return token;
}

const ws_handlers = getWebsocketHandlers({
  server,
  onConnect: async (request) => {
    const { transport, context, id } = request;
    console.log('onConnect; id: ', id);
    const client = await server.createClient(transport, context, id);

    // TODO_4: see what's wrong with the token, pass it back to `context`
    // const token = await extractAndCheckToken(request);

    return {
      context: { userId: client.userId, room: client.room},
    };
  },
  onDisconnect: async (id) => {
    await server.disconnectClient(id);
  },
  onUpgrade: async (request) => {
    console.log('onUpgrade; checking token... ');

    // TODO_4: see what's wrong with the token and pass it back to `context`
    // const token = await extractAndCheckToken(request);
    // console.log('onUpgrade; token: ', token);
    
    // Extract user context from the request
    // In production, you'd verify authentication here
    return { context: { userId: "user-123", room: "workspace-1" } };
  },
});

serve({
  websocket: ws_handlers,
  fetch: () => new Response("Not found", { status: 404 }),
});

// TODO_5: add fallback HTTP transport
// const handlers = getHTTPHandlers({
//   server,
//   onConnect: async (request) => {
//     const { transport, context, id } = request;
//     const client = await server.createClient(transport, context, id);
//     const token = await extractAndCheckToken(request);

//     return {
//       context: { userId: client.userId, room: client.room, token },
//     };
//   },
//   onDisconnect: async (id) => {
//     await server.disconnectClient(id);
//   },
// });
