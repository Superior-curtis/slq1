import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  const projectRoot = process.cwd();
  const [{ createServer: createViteServer }, { default: react }, { default: tailwindcss }, { jsxLocPlugin }, { vitePluginManusRuntime }] =
    await Promise.all([
      import("vite"),
      import("@vitejs/plugin-react"),
      import("@tailwindcss/vite"),
      import("@builder.io/vite-plugin-jsx-loc"),
      import("vite-plugin-manus-runtime"),
    ]);

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

  const vite = await createViteServer({
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    envDir: projectRoot,
    root: path.resolve(projectRoot, "client"),
    publicDir: path.resolve(projectRoot, "client", "public"),
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(projectRoot, "client", "index.html");

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Calculate dist path from current working directory for bundled code
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
