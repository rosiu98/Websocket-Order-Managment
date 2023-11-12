import { useState, useEffect } from "react";
import "./index.css";
import { socket } from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  const [list, setList] = useState([]);

  const [name, setName] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();

    socket.timeout(5000).emit("submitOrder", {
      name: name,
      state: "In Progress",
    });

    setName("");
  };

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    const onNewOrder = (order) => {
      console.log(order);
      setList((list) => [...list, order]);
    };

    const onUpdateOrder = ({ orderId, newState }) => {
      console.log(orderId, newState);
      console.log(list);
      setList((list) =>
        list.map((item) =>
          Number(item.id) === Number(orderId)
            ? { ...item, state: newState }
            : item
        )
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("newOrder", onNewOrder);
    socket.on("orderStateUpdate", onUpdateOrder);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("newOrder", onNewOrder);
      socket.off("orderStateUpdate", onUpdateOrder);
    };
  }, [list]);

  return (
    <>
      <h2>Order Management System</h2>
      <div className="card">
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
        <form onSubmit={onSubmit} id="orderForm">
          <label htmlFor="orderName">Order Name:</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            id="orderName"
            required
          />
          <button type="submit">Submit Order</button>
        </form>
        <ul>
          {isConnected &&
            list?.map((item) => (
              <li key={item.id}>
                {item.state === "Done"
                  ? "Order Delivered"
                  : `${item.name} - ${item.state}`}
              </li>
            ))}
        </ul>
      </div>
    </>
  );
}

export default App;
