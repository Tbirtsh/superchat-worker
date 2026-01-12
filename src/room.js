export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.users = new Map();
    this.messages = [];
    this.typing = new Set();
  }

  async fetch(request) {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }
    const [client, server] = Object.values(new WebSocketPair());
    const url = new URL(request.url);
    const userId = crypto.randomUUID();
    this.users.set(userId, server);
    server.accept();

    // send initial state
    server.send(JSON.stringify({ type: "init", userId, messages: this.messages }));
    server.addEventListener("message", (event) => this.handleMessage(userId, event.data));
    server.addEventListener("close", () => {
      this.users.delete(userId);
      this.typing.delete(userId);
      this.broadcast({ type: "typing", users: Array.from(this.typing) });
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  handleMessage(userId, raw) {
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    switch (data.type) {
      case "chat":
        this.handleChat(userId, data.text);
        break;
      case "typing":
        this.handleTyping(userId, data.isTyping);
        break;
      case "read":
        this.handleRead(userId, data.messageIds);
        break;
    }
  }

  handleChat(userId, text) {
    const message = {
      id: crypto.randomUUID(),
      userId,
      text,
      timestamp: Date.now(),
      readBy: [userId]
    };
    this.messages.push(message);
    this.broadcast({ type: "chat", message });
  }

  handleTyping(userId, isTyping) {
    if (isTyping) {
      this.typing.add(userId);
    } else {
      this.typing.delete(userId);
    }
    this.broadcast({ type: "typing", users: Array.from(this.typing) });
  }

  handleRead(userId, messageIds) {
    for (const id of messageIds) {
      const msg = this.messages.find(m => m.id === id);
      if (msg && !msg.readBy.includes(userId)) {
        msg.readBy.push(userId);
      }
    }
    this.broadcast({ type: "read", messageIds, userId });
  }

  broadcast(obj) {
    const payload = JSON.stringify(obj);
    for (const [, ws] of this.users) {
      try { ws.send(payload); } catch {}
    }
  }
}
