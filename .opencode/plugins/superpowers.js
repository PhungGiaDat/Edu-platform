/**
 * Superpowers bootstrap plugin — OpenCode V2 (opencode2) shim.
 *
 * Upstream superpowers@6.1.1 ships a V1-only plugin
 * (`export const SuperpowersPlugin = async (...) => ({ config,
 *   "experimental.chat.messages.transform" })`). OpenCode V2 changed the plugin
 * API, so that entrypoint never runs here. This shim reproduces the same
 * behaviour against the V2 contract.
 *
 * V2 contract used (verified against @opencode-ai/plugin@0.0.0-beta-18684):
 *   - Plugin.define({ id, setup(ctx) })        -> promise/index.d.ts
 *   - ctx.session.hook("context", (e) => ...)  -> promise/session.d.ts
 *       e.messages: Array<Message>, e.system: Array<SystemPart>
 *   - Message  = { role, content: ContentPart[], ... }
 *   - TextPart = { type: "text", text: string, ... }   // `type` is REQUIRED
 *
 * Why inject into the first user message instead of `system`:
 *   Upstream made this choice deliberately (superpowers #750 / #894) — a system
 *   message is re-sent on every model call and multiple system messages break
 *   Qwen/GLM-class models. This project runs `bai/glm-5.3-flash` through an
 *   openai-compatible provider, i.e. exactly that family.
 *
 * The bootstrap body is read from SKILL.md at runtime, so it never drifts from
 * the installed skill content.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { Plugin } from "@opencode-ai/plugin";

const MARKER = "SUPERPOWERS_BOOTSTRAP";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Strip `---` frontmatter and return the markdown body. */
function stripFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[2] : content;
}

/** Expand a leading `~`, trim, and resolve. Returns null for junk input. */
function normalizePath(input, homeDir) {
  if (typeof input !== "string") return null;
  let value = input.trim();
  if (!value) return null;
  if (value === "~") value = homeDir;
  else if (value.startsWith("~/")) value = path.join(homeDir, value.slice(2));
  return path.resolve(value);
}

/**
 * Candidate roots for the vendored superpowers package, best-first.
 * `.opencode/skills/superpowers` is what V2 actually discovers skills from;
 * `.cursor/skills/superpowers` is the git-tracked canonical copy.
 */
function candidateRoots(directory) {
  const roots = [];
  if (directory) roots.push(path.resolve(directory));
  // plugin lives at <root>/.opencode/plugins/
  roots.push(path.resolve(__dirname, "..", ".."));
  // plugin may be relocated; also try cwd
  roots.push(process.cwd());
  return [...new Set(roots)].flatMap((root) => [
    path.join(root, ".opencode", "skills", "superpowers"),
    path.join(root, ".cursor", "skills", "superpowers"),
    path.join(root, ".claude", "skills", "superpowers"),
    path.join(root, "superpowers"),
  ]);
}

/** Locate using-superpowers/SKILL.md, or null if the package is absent. */
function findSkillFile(directory) {
  const env = normalizePath(process.env.SUPERPOWERS_DIR, os.homedir());
  const searched = env ? [env, ...candidateRoots(directory)] : candidateRoots(directory);
  for (const root of searched) {
    const file = path.join(root, "skills", "using-superpowers", "SKILL.md");
    if (fs.existsSync(file)) return { file, root };
  }
  return null;
}

// Tool names in this harness differ from upstream's V1 mapping. Keep this in
// sync with the actual tool surface, otherwise the bootstrap tells the model to
// call tools that do not exist.
const TOOL_MAPPING = `**Tool Mapping for this OpenCode (V2) harness:**
When a skill names an action, substitute the local equivalent:
- Invoke a skill → the native \`skill\` tool, passing the exact skill ID
- Read files → \`read\`
- Create or replace a file → \`write\`; modify in place → \`edit\`
- Run a shell command → \`shell\`
- Search files → \`grep\` (contents) and \`glob\` (paths)
- Dispatch a subagent → \`subagent\` tool with \`agent: "<name>"\` (there is NO \`task\` tool and NO \`subagent_type\` parameter here)
- Fetch a URL → \`webfetch\`
- Ask the user a question → \`question\`
- Track a skill's checklist → this harness exposes no dedicated todo tool for every agent; if no todo tool is available, keep the checklist inline in your replies and update it as you complete each item.

Use the native \`skill\` tool to list and load skills.`;

function buildBootstrap(body) {
  return `<${MARKER}>
You have superpowers.

**IMPORTANT: The using-superpowers skill content is included below. It is ALREADY LOADED — you are currently following it. Do NOT use the skill tool to load "using-superpowers" again; that would be redundant.**

${body}

${TOOL_MAPPING}
</${MARKER}>`;
}

export default Plugin.define({
  id: "superpowers",

  setup(ctx) {
    let cached; // undefined = unresolved, null = unavailable

    const bootstrap = () => {
      if (cached !== undefined) return cached;
      const directory = ctx?.location?.directory;
      const found = findSkillFile(directory);
      if (!found) {
        console.warn(
          "[superpowers] using-superpowers/SKILL.md not found; bootstrap disabled. " +
            `Searched under: ${candidateRoots(directory).join(", ")}`,
        );
        cached = null;
        return null;
      }
      try {
        cached = buildBootstrap(stripFrontmatter(fs.readFileSync(found.file, "utf8")));
        console.log(`[superpowers] bootstrap loaded from ${found.file}`);
      } catch (error) {
        console.warn(`[superpowers] failed to read ${found.file}: ${error?.message ?? error}`);
        cached = null;
      }
      return cached;
    };

    return ctx.session.hook("context", (event) => {
      const text = bootstrap();
      if (!text) return;

      // Preferred: prepend to the first user message (upstream behaviour).
      const firstUser = event.messages?.find((m) => m?.role === "user");
      if (firstUser && Array.isArray(firstUser.content)) {
        if (firstUser.content.some((p) => p?.type === "text" && String(p.text).includes(MARKER))) {
          return; // already injected in this array
        }
        firstUser.content.unshift({ type: "text", text });
        return;
      }

      // Fallback: no user message yet — append as a system part.
      // `type: "text"` is required by the SystemPart schema.
      if (Array.isArray(event.system) && !event.system.some((s) => String(s?.text ?? "").includes(MARKER))) {
        event.system.push({ type: "text", text });
      }
    });
  },
});
