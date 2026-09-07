import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import type { Plugin } from "vite";

/** Local mirror of src/lib/store/types.ts's StoredFile — this file must not import from src/. */
type StoredFileLike = {
  path: string;
  content: string;
  encoding: "utf8" | "base64";
};

export const WRITABLE_PREFIXES = ["src/content/", "content/articles/", "public/img/"];

export function isWritablePath(path: string): boolean {
  if (!path) return false;
  if (path.includes("\\")) return false;
  if (path.startsWith("/")) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  if (path.split("/").includes("..")) return false;
  return WRITABLE_PREFIXES.some((p) => path.startsWith(p) && path.length > p.length);
}

/**
 * Validates every file in the batch before any of them is written, so the
 * middleware never has to unwind a partial write. Runs both checks — the
 * string guard and the post-resolve() root containment check — over the
 * whole batch and returns the first failure, or the resolved write targets
 * for the whole batch when every file passes.
 */
export function resolveWrites(
  root: string,
  files: StoredFileLike[]
): { error: string } | { targets: { target: string; file: StoredFileLike }[] } {
  const targets: { target: string; file: StoredFileLike }[] = [];

  for (const file of files) {
    if (!isWritablePath(file.path)) {
      return { error: `Path is not writable: ${file.path}` };
    }
    // Resolve and re-check: a path that passes the string guard but
    // escapes the root once resolved is rejected here.
    const target = resolve(root, file.path);
    if (!target.startsWith(resolve(root) + sep)) {
      return { error: `Path escapes the project root: ${file.path}` };
    }
    targets.push({ target, file });
  }

  return { targets };
}

/**
 * Serves POST /__admin/write during `vite` only. It is registered with
 * apply: "serve", so it cannot exist in a production build — there is no
 * code path that ships this endpoint.
 */
export function adminWritePlugin(): Plugin {
  return {
    name: "admin-write",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__admin/write", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", () => {
          try {
            const { files } = JSON.parse(raw) as { files: StoredFileLike[] };

            const root = server.config.root;
            const result = resolveWrites(root, files);
            if ("error" in result) {
              res.statusCode = 403;
              res.end(result.error);
              return;
            }

            for (const { target, file } of result.targets) {
              mkdirSync(dirname(target), { recursive: true });
              writeFileSync(
                target,
                file.encoding === "base64"
                  ? Buffer.from(file.content, "base64")
                  : file.content,
                file.encoding === "base64" ? undefined : "utf8"
              );
            }

            res.statusCode = 200;
            res.end("ok");
          } catch (cause) {
            res.statusCode = 500;
            res.end(cause instanceof Error ? cause.message : "Write failed");
          }
        });
      });
    },
  };
}
