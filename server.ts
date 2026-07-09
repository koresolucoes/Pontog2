import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with large limits for image and audio uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dynamic serverless function handler for all files in `/api` folder
  app.all("/api/{*path}", async (req, res, next) => {
    const apiPath = req.path.replace(/^\/api\//, "");
    
    // Clean path to prevent directory traversal
    const cleanPath = path.normalize(apiPath).replace(/^(\.\.(\/|\\|$))+/, "");
    
    // Find the file
    const tsPath = path.join(process.cwd(), "api", `${cleanPath}.ts`);
    const jsPath = path.join(process.cwd(), "api", `${cleanPath}.js`);
    
    let filePath = "";
    if (fs.existsSync(tsPath)) {
      filePath = tsPath;
    } else if (fs.existsSync(jsPath)) {
      filePath = jsPath;
    } else {
      // Check index files
      const indexTsPath = path.join(process.cwd(), "api", cleanPath, "index.ts");
      const indexJsPath = path.join(process.cwd(), "api", cleanPath, "index.js");
      if (fs.existsSync(indexTsPath)) {
        filePath = indexTsPath;
      } else if (fs.existsSync(indexJsPath)) {
        filePath = indexJsPath;
      }
    }

    if (!filePath) {
      return res.status(404).json({ error: `API route /api/${cleanPath} not found` });
    }

    try {
      // Dynamic import
      // Node.js 22 natively supports ts files via type stripping or tsx loader in dev
      // Use query parameter to bypass Node module caching in dev
      const fileUrl = `file://${filePath}?t=${Date.now()}`;
      const module = await import(fileUrl);
      const handler = module.default;
      
      if (typeof handler === "function") {
        await handler(req, res);
      } else {
        console.error(`Route /api/${cleanPath} does not export a default function handler`);
        res.status(500).json({ error: `API route /api/${cleanPath} does not export a default handler` });
      }
    } catch (err: any) {
      console.error(`Error executing API route /api/${cleanPath}:`, err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development or serving built dist in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
