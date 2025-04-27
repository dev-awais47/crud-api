import http from "http";
import url from "url";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, "items.json");

const readItems = async () => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }
};

const writeItems = async (items) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2));
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;

  res.setHeader("Content-Type", "application/json");

  if (parsedUrl.pathname === "/items") {
    if (method === "GET") {
      const items = await readItems();
      res.writeHead(200);
      res.end(JSON.stringify({ items }));
    } else if (method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const { name } = JSON.parse(body);
        if (!name) {
          res.writeHead(400);
          return res.end(JSON.stringify({ message: "Name is required" }));
        }

        const items = await readItems();
        const newItem = { id: Date.now(), name };
        items.push(newItem);
        await writeItems(items);

        res.writeHead(201);
        res.end(JSON.stringify({ message: "Item created", item: newItem }));
      });
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ message: "Method not allowed" }));
    }

  } else if (parsedUrl.pathname.startsWith("/items/")) {
    const urlParts = parsedUrl.pathname.split('/');
    const itemId = parseInt(urlParts[urlParts.length - 1]);  // Extract the id

    if (isNaN(itemId)) {
      res.writeHead(400);
      return res.end(JSON.stringify({ message: "Invalid ID" }));
    }

    if (method === "PUT") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        const { name } = JSON.parse(body);
        const items = await readItems();
        const item = items.find((item) => item.id === itemId);

        if (!item) {
          res.writeHead(404);
          return res.end(JSON.stringify({ message: "Item not found" }));
        }

        item.name = name || item.name;
        await writeItems(items);

        res.writeHead(200);
        res.end(JSON.stringify({ message: "Item updated", item }));
      });
    } else if (method === "DELETE") {
      let items = await readItems();
      const initialLength = items.length;
      items = items.filter((item) => item.id !== itemId);

      if (items.length === initialLength) {
        res.writeHead(404);
        return res.end(JSON.stringify({ message: "Item not found" }));
      }

      await writeItems(items);

      res.writeHead(200);
      res.end(JSON.stringify({ message: "Item deleted" }));
    } else {
      res.writeHead(405);
      res.end(JSON.stringify({ message: "Method not allowed" }));
    }

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ message: "Route not found" }));
  }
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
