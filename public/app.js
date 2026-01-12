const roomId = "general";
const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/room/${roomId}`);

let userId;
const messagesEl = document.getElementById("messages");
const input = document.getElementById("message-input");
const typingIndicator = document.getElementById("typing-indicator");
const sendBtn = document.getElementById("send-btn");

const readMessages = new Set();

ws.addEventListener("open", () => console.log("Connected"));

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "init":
      userId = data.userId;
      data.messages.forEach(renderMessage);
      markAsRead();
      break;
    case "chat":
      renderMessage(data.message);
      markAsRead();
      break;
    case "typing":
      showTyping(data.users.filter((u) => u !== userId));
      break;
    case "read":
      updateReadReceipts(data);
      break;
  }
});

sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
input.addEventListener("input", () => {
  ws.send(JSON.stringify({ type: "typing", isTyping: input.value.length > 0 }));
});

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  ws.send(JSON.stringify({ type: "chat", text }));
  input.value = "";
  ws.send(JSON.stringify({ type: "typing", isTyping: false }));
}

function renderMessage(message) {
  const li = document.createElement("li");
  li.className = "message " + (message.userId === userId ? "me" : "other");
  li.dataset.id = message.id;
  li.innerHTML = `
    <div>${message.text}</div>
    <div class="meta">
      <span>${new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      <span class="read-status">${message.readBy.length > 1 ? "Read" : "Sent"}</span>
    </div>
  `;
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping(userIds) {
  typingIndicator.textContent = userIds.length ? "Someone is typing…" : "";
}

function markAsRead() {
  const unreadIds = Array.from(messagesEl.querySelectorAll(".message"))
    .filter(li => !readMessages.has(li.dataset.id))
    .map(li => li.dataset.id);

  if (unreadIds.length) {
    unreadIds.forEach(id => readMessages.add(id));
    ws.send(JSON.stringify({ type: "read", messageIds: unreadIds }));
  }
}

function updateReadReceipts({ messageIds, userId: reader }) {
  messageIds.forEach(id => {
    const li = messagesEl.querySelector(`.message[data-id="${id}"]`);
    if (li) {
      const status = li.querySelector(".read-status");
      status.textContent = reader === userId ? "Read" : status.textContent;
    }
  });
}
