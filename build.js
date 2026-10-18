import { rimraf } from "rimraf";
import { copyFile, cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { execSync } from "node:child_process";

// read version from package.json
const pkg = JSON.parse(await readFile("package.json"));
process.env.ULTRAVIOLET_VERSION = pkg.version;

const isDevelopment = process.argv.includes("--dev");

await rimraf("dist");
await mkdir("dist");

// don't compile these files
await copyFile("src/sw.js", "dist/sw.js");
await copyFile("src/uv.config.js", "dist/uv.config.js");

let builder = await build({
	platform: "browser",
	sourcemap: true,
	minify: !isDevelopment,
	entryPoints: {
		"uv.bundle": "./src/rewrite/index.js",
		"uv.client": "./src/client/index.js",
		"uv.handler": "./src/uv.handler.js",
		"uv.sw": "./src/uv.sw.js",
	},
	define: {
		"process.env.ULTRAVIOLET_VERSION": JSON.stringify(
			process.env.ULTRAVIOLET_VERSION
		),
		"process.env.ULTRAVIOLET_COMMIT_HASH": (() => {
			try {
				let hash = JSON.stringify(
					execSync("git rev-parse --short HEAD", {
						encoding: "utf-8",
					}).replace(/\r?\n|\r/g, "")
				);

				return hash;
			} catch {
				return "unknown";
			}
		})(),
	},
	bundle: true,
	treeShaking: true,
	metafile: isDevelopment,
	logLevel: "info",
	outdir: "dist/",
});
if (isDevelopment) {
	await writeFile("metafile.json", JSON.stringify(builder.metafile));
}

// Include the browser app and its transport in the deployable output.
await cp("public", "dist", { recursive: true });
await mkdir("dist/baremux", { recursive: true });
await mkdir("dist/epoxy", { recursive: true });
await cp("node_modules/@mercuryworkshop/bare-mux/dist", "dist/baremux", { recursive: true });
await cp("node_modules/@mercuryworkshop/epoxy-transport/dist", "dist/epoxy", { recursive: true });
