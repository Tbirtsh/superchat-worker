import { Room } from "./room.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve static assets from /public
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(await env.ASSETS.fetch(request));
    }
    if (request.method === "GET" && url.pathname.startsWith("/public/")) {
      return env.ASSETS.fetch(request);
    }

    // Only handle WebSocket upgrades on /room/<roomId>
    if (url.pathname.startsWith("/room/") && request.headers.get("Upgrade") === "websocket") {
      const roomId = url.pathname.split("/").pop();
      const roomStub = env.CHAT_ROOM.get(env.CHAT_ROOM.idFromName(roomId));
      return roomStub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
