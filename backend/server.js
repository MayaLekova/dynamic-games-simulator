import { Server } from "teleportal/server";
import { YDocStorage } from "teleportal/storage";
import { getHTTPHandlers } from "teleportal/http";
import { createTokenManager } from "teleportal/token";

import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

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

// TODO_1: use `server` somewhere
// TODO_2: for authentication, add checkPermission property as in
// https://teleportal.tools/core-concepts/authentication/#server-integration
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

const handlers = getHTTPHandlers({
  server,
  // onUpgrade: async () => {
  //   const token = await extractAndCheckToken(request);

  //   // Extract user context from the request
  //   // In production, you'd verify authentication here
  //   return {
  //     context: { userId: "user-123", room: "workspace-1", token },
  //   };
  // },
  onConnect: async (request) => {
    const { transport, context, id } = request;
    const client = await server.createClient(transport, context, id);
    const token = await extractAndCheckToken(request);

    return {
      context: { userId: client.userId, room: client.room, token },
    };
  },
  onDisconnect: async (id) => {
    await server.disconnectClient(id);
  },
});
