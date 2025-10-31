// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // in production set explicit origin
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

// keep track of connected users: socketId -> name
const users = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // when a user joins with a name
  socket.on("join", (name) => {
    users.set(socket.id, name || "Anonymous");
    console.log(`👋 ${users.get(socket.id)} joined (${socket.id})`);
    // notify all clients about new user and updated user list
    io.emit("userList", Array.from(users.values()));
    io.emit("systemMessage", {
      text: `${users.get(socket.id)} joined the chat.`,
      time: Date.now()
    });
  });

  // broadcast chat messages to everyone
  socket.on("message", (msg) => {
    const sender = users.get(socket.id) || "Anonymous";
    const messagePayload = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2,7),
      text: msg,
      sender,
      time: Date.now()
    };
    io.emit("message", messagePayload);
  });

  socket.on("disconnect", () => {
    const name = users.get(socket.id);
    users.delete(socket.id);
    console.log(`❌ ${name || socket.id} disconnected`);
    io.emit("userList", Array.from(users.values()));
    if (name) {
      io.emit("systemMessage", {
        text: `${name} left the chat.`,
        time: Date.now()
      });
    }
  });
});

// simple health endpoint
app.get("/", (req, res) => res.send({ status: "OK", message: "Socket.io server running" }));

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
