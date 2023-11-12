const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { join } = require("path");
const { Pool } = require("pg");

const app = express();
const server = createServer(app);

app.use(cors());
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.use((socket, next) => {
  // Check if the user is an admin (you might have a more secure way of doing this in a real application)

  const isAdmin = socket.handshake.auth.isAdmin;

  //   console.log(isAdmin) working fine

  // Attach the isAdmin property to the socket object for future reference
  socket.isAdmin = isAdmin;

  console.log("Is Admin:", socket.isAdmin);

  next();
});

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "order_management",
  password: "123456",
  port: 5432,
});

app.use(express.static(__dirname + "/public"));

app.get("/database", async (req, res) => {
  const result = await pool.query("SELECT * FROM orders");

  res.send(result.rows);
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "/public/index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(join(__dirname, "/public/admin.html"));
});

const orderStates = {
  IN_PROGRESS: "In Progress",
  DELIVERING: "Delivering",
  DONE: "Done",
};

io.on("connection", (socket) => {
  console.log("A user connected");

  const isAdmin = socket.isAdmin;

  socket.join(socket.isAdmin ? "admin" : socket.id);

  socket.on("submitOrder", async (order) => {
    console.log("Message from Frontend: " + order.name, order.state);

    try {
      const result = await pool.query(
        "INSERT INTO orders(name, state) VALUES ($1, $2) RETURNING id",
        [order.name, order.state]
      );

      const orderId = result.rows[0].id;

      io.to(socket.id).emit("newOrder", {
        id: orderId,
        name: order.name,
        state: order.state,
      });
      io.to("admin").emit("newOrder", {
        id: orderId,
        name: order.name,
        state: order.state,
      });
    } catch (error) {
      console.error("Error submitting order:", error.message);
    }
  });

  socket.on("updateOrderState", async ({ orderId, newState }) => {
    try {
      if (socket.isAdmin) {
        await pool.query("UPDATE orders SET state = $1 WHERE id = $2", [
          newState,
          orderId,
        ]);
        io.emit("orderStateUpdate", { orderId, newState });
      } else {
        console.error("Unauthorized attempt to update order state");
      }
    } catch (error) {
      console.error("Error updating order state:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
