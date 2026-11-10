import { serwist } from "@serwist/next/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export default serwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  precachePrerendered: true,
  // Lazy renderer chunks must not be eagerly downloaded by service-worker installation.
  // Inspect build output since Turbopack chunk filenames are content hashes.
  manifestTransforms: [async entries => {
    const manifest = [];
    for (const entry of entries) {
      if (entry.url.endsWith(".js")) {
        const content = await readFile(resolve(entry.url), "utf8");
        if (/THREE\.|react-three|world-label-overlay/.test(content)) continue;
      }
      manifest.push(entry);
    }
    return { manifest, warnings: [] };
  }],
});
