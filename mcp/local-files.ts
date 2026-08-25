/**
 * Reading a client-named file from disk.
 *
 * ## Who may import this
 *
 * `mcp/server.ts` — the stdio entry point — and nothing else. Specifically **not**
 * `src/app/api/mcp/route.ts`, and not `mcp/deps.ts`, which both transports share.
 *
 * The distinction is not stylistic. On stdio the client started this process,
 * runs as the same user, and can already read anything this could read; accepting
 * a path there saves a client base64-encoding a file it just wrote. Over HTTP the
 * caller is remote, and returning the bytes of a path they chose — through a
 * public storage bucket — is arbitrary file disclosure. `.env.local` sits two
 * directories up from here.
 *
 * So the capability travels as a dependency that the HTTP transport simply never
 * constructs. See `LocalFileReader` in `ports.ts` and `RegisterOptions.localFiles`
 * in `tools.ts`.
 *
 * ## The guards below are for accidents, not for the boundary above
 *
 * Nothing here makes this safe to expose remotely, and it should not be read as
 * an attempt to. They exist so a mistyped path fails with a sentence, and so a
 * client naming a 4 GB file or a FIFO does not take the process down.
 */
import { readFile, stat } from "node:fs/promises";
import { isAbsolute } from "node:path";

import type { LocalFileReader, LocalFileResult } from "./ports";
import { UPLOAD_MAX_BYTES } from "./cover-upload";

export const nodeFileReader: LocalFileReader = {
  async read(path: string): Promise<LocalFileResult> {
    if (!path || path.trim().length === 0) {
      return { ok: false, reason: "imagePath was empty." };
    }

    const target = path.trim();

    // Relative paths resolve against this process's working directory, which an
    // MCP client chooses and the caller cannot see — so a relative path means
    // something different depending on who launched the server. Refusing is more
    // predictable than resolving against a directory nobody named.
    if (!isAbsolute(target)) {
      return {
        ok: false,
        reason: `imagePath must be absolute. Got "${target.slice(0, 80)}".`,
      };
    }

    // A NUL truncates the path inside some syscalls, so a name containing one can
    // address a different file than it appears to.
    if (target.includes("\0")) {
      return { ok: false, reason: "imagePath contained a null byte." };
    }

    let info;
    try {
      info = await stat(target);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      return {
        ok: false,
        reason:
          code === "ENOENT"
            ? `No file at ${target.slice(0, 120)}.`
            : code === "EACCES"
              ? `Permission denied reading ${target.slice(0, 120)}.`
              : `Could not read ${target.slice(0, 120)}.`,
      };
    }

    // Directories, sockets, and FIFOs. A read on a FIFO blocks forever, which
    // would hang the tool call rather than fail it.
    if (!info.isFile()) {
      return { ok: false, reason: "imagePath is not a regular file." };
    }

    // Checked from the stat, before any bytes are read: the point is to avoid
    // pulling an enormous file into memory, which a post-hoc length check does
    // not achieve.
    if (info.size > UPLOAD_MAX_BYTES) {
      return {
        ok: false,
        reason: `That file is ${(info.size / 1024 / 1024).toFixed(1)} MB, over the ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
      };
    }

    if (info.size === 0) {
      return { ok: false, reason: "That file is empty." };
    }

    try {
      const buffer = await readFile(target);
      return { ok: true, bytes: new Uint8Array(buffer) };
    } catch {
      return { ok: false, reason: `Could not read ${target.slice(0, 120)}.` };
    }
  },
};
