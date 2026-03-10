import { Server } from "teleportal/server";
// import { createInMemory } from "teleportal/storage";
// We're currently using an 'unstorage' module that is external to
// teleportal. Eventually we should use the internal one, see:
// https://github.com/nperez0111/teleportal/blob/3792006ddc9b0d5db2138356b9b11ec5ff7cb5ab/docs/src/content/docs/integration.mdx#L10 
import { createStorage } from "unstorage";
import { getWebsocketHandlers } from "teleportal/websocket-server";

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

const STATIC_PATH = path.join(process.cwd(), "../frontend");

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

// TODO: use somewhere
const teleServer = new Server({
  getStorage: async (ctx) => {
    const { documentStorage } = createStorage();
      // original from the teleportal example: createInMemory();
    return documentStorage;
  },
});

const handlers = getWebsocketHandlers({
  onConnect: async ({ transport, context, id }) => {
    await teleServer.createClient(transport, context, id);
  },
  onDisconnect: async (id) => {
    await teleServer.disconnectClient(id);
  },
});
