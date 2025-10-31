// frontend/src/App.js
import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; // backend address

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const [name, setName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // {id, text, sender, time, system}
  const [users, setUsers] = useState([]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // connect socket when app mounts
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      console.log("🔗 Connected to socket server:", s.id);
    });

    s.on("disconnect", () => {
      setConnected(false);
      console.log("❌ Disconnected");
    });

    s.on("message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    s.on("systemMessage", (sys) => {
      setMessages((prev) => [...prev, { id: "sys-" + sys.time, text: sys.text, sender: "System", time: sys.time, system: true }]);
    });

    s.on("userList", (list) => {
      setUsers(list);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    // auto-scroll to bottom on new message
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleJoin = () => {
    if (!socket) return;
    const trimmed = name.trim() || "Anonymous";
    socket.emit("join", trimmed);
    setHasJoined(true);
  };

  const sendMessage = () => {
    if (!socket) return;
    const trimmed = message.trim();
    if (!trimmed) return;
    socket.emit("message", trimmed);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!hasJoined) handleJoin();
      else sendMessage();
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ margin: 0 }}>⚡ Nimbus Chat</h1>
          <div style={styles.status}>
            <span style={{ marginRight: 8 }}>{connected ? "🟢 Online" : "🔴 Offline"}</span>
            <span>{hasJoined ? `User: ${name || "Anonymous"}` : "Not joined"}</span>
          </div>
        </header>

        <main style={styles.main}>
          <section style={styles.chatSection}>
            <div style={styles.messages} id="messages">
              {messages.length === 0 && <div style={{ padding: 12, color: "#666" }}>No messages yet. Say hi 👋</div>}
              {messages.map((m) => (
                <div key={m.id} style={m.system ? styles.systemMessage : styles.messageRow}>
                  <div style={styles.messageMeta}>
                    <strong style={{ marginRight: 8 }}>{m.sender}</strong>
                    <span style={styles.time}>{formatTime(m.time)}</span>
                  </div>
                  <div style={styles.messageText}>{m.text}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputBar}>
              {!hasJoined ? (
                <>
                  <input
                    style={styles.input}
                    placeholder="Enter your name and press Enter or Join"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button style={styles.button} onClick={handleJoin}>Join</button>
                </>
              ) : (
                <>
                  <input
                    style={styles.input}
                    placeholder="Type a message and press Enter"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button style={styles.button} onClick={sendMessage}>Send</button>
                </>
              )}
            </div>
          </section>

          <aside style={styles.sidebar}>
            <h3 style={{ marginTop: 0 }}>Online Users ({users.length})</h3>
            <ul style={styles.userList}>
              {users.length === 0 ? (
                <li style={styles.userItemEmpty}>No users online</li>
              ) : (
                users.map((u, idx) => (
                  <li key={idx} style={styles.userItem}>{u}</li>
                ))
              )}
            </ul>
            <div style={styles.infoBox}>
              <strong>Tips</strong>
              <p style={{ margin: "6px 0 0" }}>
                Open multiple windows to test. Messages appear to all connected users in real time.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: { fontFamily: "system-ui, sans-serif", background: "#f6f8fb", minHeight: "100vh", padding: 20 },
  container: { maxWidth: 1000, margin: "0 auto", background: "#fff", borderRadius: 10, boxShadow: "0 6px 18px rgba(20,20,20,0.08)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #eee" },
  status: { fontSize: 14, color: "#333", display: "flex", alignItems: "center" },
  main: { display: "flex", gap: 0 },
  chatSection: { flex: 2, padding: 16, display: "flex", flexDirection: "column", minHeight: 480 },
  messages: { flex: 1, overflowY: "auto", padding: 8, border: "1px solid #eee", borderRadius: 8, marginBottom: 12, background: "#fafafa" },
  messageRow: { padding: 8, borderBottom: "1px solid #f0f0f0" },
  systemMessage: { padding: 8, color: "#666", fontStyle: "italic", textAlign: "center" },
  messageMeta: { fontSize: 12, color: "#444", marginBottom: 6 },
  messageText: { fontSize: 15, color: "#111" },
  time: { color: "#999", fontWeight: 400, fontSize: 11 },
  inputBar: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", outline: "none" },
  button: { padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" },
  sidebar: { width: 260, borderLeft: "1px solid #eee", padding: 16, background: "#fbfdff" },
  userList: { listStyle: "none", padding: 0, margin: 0 },
  userItem: { padding: "8px 6px", borderBottom: "1px dashed #eee" },
  userItemEmpty: { color: "#777", padding: 8 },
  infoBox: { marginTop: 12, padding: 10, background: "#fff", border: "1px solid #f0f0f0", borderRadius: 8 }
};

export default App;
