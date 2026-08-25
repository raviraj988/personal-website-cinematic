/**
 * The eight tools.
 *
 * ## Raw JSON Schema, not zod — via the low-level Server API
 *
 * Adding zod would give this repository two validation idioms. The app already
 * validates posts with the hand-written `validatePost` in
 * `src/lib/blog/validation.ts`, whose limits mirror the CHECK constraints in
 * `0001`, and a second grammar describing the same fields is a second thing to
 * keep in step with the database.
 *
 * Avoiding it needs one deliberate choice. `McpServer.registerTool` types
 * `inputSchema` as `AnySchema`, which in SDK 1.30 is `z3.ZodTypeAny | z4.$ZodType`
 * — a zod schema, not a JSON Schema, whatever older documentation says. So this
 * uses the **low-level `Server`** and answers `tools/list` and `tools/call`
 * directly. `ToolSchema` accepts a plain JSON Schema object for `inputSchema`,
 * which is what the wire protocol carries anyway, so this is the shorter path to
 * the same bytes rather than a workaround.
 *
 * The trade is that argument parsing is ours: the SDK is not validating input
 * against the schema before the handler runs, so every handler treats `args` as
 * `unknown` and checks what it uses. That is the same posture the Server Actions
 * in `src/app/admin/actions.ts` take with `FormData`, and for the same reason.
 *
 * ## Scope-free
 *
 * Stdio is a locally trusted channel — the client already runs as the user who
 * owns the credentials. There is nothing to authorise between them, so no tool
 * takes a scope or token argument.
 *
 * ## What restrains this server is the absence of tools, not their arguments
 *
 * There is no publish tool, no update tool, and no delete tool. The adapter
 * exports no function that could implement one. That is the whole safety model —
 * see the header of `mcp/adapters/supabase.ts`.
 */
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { errorResult, textResult } from "./lib";
import { resolveSite, siteKeys, type RegisteredSite } from "./site";
import { renderWritingGuide } from "./writing-guide";
import { buildSeoReport, renderSeoReport, type ReportCorpus } from "./seo-report";
import { suggestInternalLinks, type LinkCorpus } from "./internal-links";
import { checkSlugShape } from "./paths";
import { resolveCover } from "./cover-source";
import { uploadClientCover, UPLOAD_MAX_BYTES } from "./cover-upload";
import { coverDeps, uploadDeps, type ServerDeps } from "./deps";
import type { LocalFileReader } from "./ports";
import {
  FIELD_LIMITS,
  POST_CATEGORIES,
  emptyToNull,
  slugify,
  validatePost,
  hasErrors,
  isPostCategory,
} from "../src/lib/blog/validation";
import { ADMIN_PATH, absoluteUrl, postUrl } from "../src/lib/blog/config";
import { newsUrl } from "../src/lib/news/config";
import type { PostCategory } from "../src/lib/supabase/database.types";

/* ------------------------------------------------------------------ helpers */

/** The `site` argument every mutating tool takes. */
const SITE_PROPERTY = {
  site: {
    type: "string" as const,
    description: `Which site to write to. Required. Valid keys: ${siteKeys().join(", ")}.`,
  },
};

function str(description: string, extra: Record<string, unknown> = {}) {
  return { type: "string" as const, description, ...extra };
}

/**
 * Where a post will live once published.
 *
 * `postUrl` hardcodes `/blog`, so a news post's canonical is not `postUrl(slug)`
 * — news is served by `src/app/news/[slug]/page.tsx`. `newsUrl` returns a
 * relative path where `postUrl` returns an absolute one, hence the wrapping.
 */
function canonicalFor(category: PostCategory, slug: string): string {
  return category === "news" ? absoluteUrl(newsUrl(slug)) : postUrl(slug);
}

function reviewUrl(id: string): string {
  return `${ADMIN_PATH}/posts/${id}`;
}

/** Everything the report layer needs, fetched once. */
async function loadCorpus(site: RegisteredSite, deps: ServerDeps): Promise<ReportCorpus> {
  const [existingPosts, linkable] = await Promise.all([
    deps.store.listPosts({ limit: 200 }),
    deps.store.linkableContent(),
  ]);

  return {
    site,
    existingPosts,
    publishedBlogSlugs: linkable.filter((p) => p.category === "blog").map((p) => p.slug),
    publishedNewsSlugs: linkable.filter((p) => p.category === "news").map((p) => p.slug),
  };
}

/** A guard for every optional string a tool accepts. */
function optionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  const trimmed = emptyToNull(value);
  if (trimmed && trimmed.length > max) {
    throw new Error(`${field} must be ${max} characters or fewer (currently ${trimmed.length}).`);
  }
  return trimmed;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  return value;
}

function resolveCategory(value: unknown): PostCategory {
  if (value === undefined || value === null || value === "") return "blog";
  if (typeof value !== "string" || !isPostCategory(value)) {
    throw new Error(`category must be one of: ${POST_CATEGORIES.join(", ")}.`);
  }
  return value;
}

/* ----------------------------------------------------------- registration */

type Handler = (args: Record<string, unknown>) => Promise<CallToolResult>;

export type RegisterOptions = {
  /**
   * Restrict registration to these tool names.
   *
   * Omitted on stdio, where every tool is registered — a client able to spawn
   * this process is already past every boundary an allowlist could add. The
   * remote HTTP transport passes the set derived from the bearer token's scopes
   * (see `mcp/scopes.ts`).
   *
   * The filtering happens at registration, not in the call handler, and that is
   * the point: an out-of-scope tool is absent from `tools/list` *and* absent from
   * the handler map, so there is no code path that could invoke it. A caller
   * naming one gets the same "unknown tool" answer as for a tool that never
   * existed, which also avoids confirming the surface it cannot reach.
   */
  allowedTools?: ReadonlySet<string>;

  /**
   * Lets `upload_cover_image` accept `imagePath`.
   *
   * Absent by default, and absent is the safe value: without it the tool refuses
   * a path and asks for base64 instead. Only `mcp/server.ts` supplies one,
   * because only on stdio is "read the file this client named" something the
   * client could already do for itself. Over HTTP it would be arbitrary file
   * disclosure to a remote caller — see the header of `mcp/local-files.ts`.
   *
   * Shaped as a capability rather than a boolean so the dangerous configuration
   * is the one you have to write out, not the one you get by forgetting.
   */
  localFiles?: LocalFileReader;
};

export function registerTools(
  server: Server,
  deps: ServerDeps,
  options: RegisterOptions = {},
): void {
  const tools: Tool[] = [];
  const handlers = new Map<string, Handler>();

  /**
   * Add one tool.
   *
   * Declaration and handler stay adjacent, which is what `registerTool` gave for
   * free and is worth keeping — a tool whose schema drifts from what its handler
   * reads is the failure this shape makes visible.
   */
  function define(name: string, tool: Omit<Tool, "name">, handler: Handler): void {
    if (options.allowedTools && !options.allowedTools.has(name)) return;
    tools.push({ name, ...tool });
    handlers.set(name, handler);
  }

  /* ------------------------------------------------- 1. get_writing_guide */

  define(
    "get_writing_guide",
    {
      description:
        "The ESE writing brief: audience, terminology, prohibitions, post shape, and how the page actually renders Markdown. CALL THIS FIRST, before drafting anything.",
      inputSchema: {
        type: "object",
        properties: { ...SITE_PROPERTY },
        required: [],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");
        return textResult(renderWritingGuide(site));
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Could not render the guide.");
      }
    },
  );

  /* ------------------------------------------------------------ 2. list_posts */

  define(
    "list_posts",
    {
      description:
        "Existing posts, so a topic is not drafted twice and so a draft can link to relevant published work. Call this before writing.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          category: str(`Filter by category: ${POST_CATEGORIES.join(" or ")}.`),
          status: str("Filter by status: draft or published."),
          limit: { type: "number", description: "How many to return. Default 50, max 200." },
        },
        required: [],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");
        const category = args?.category ? resolveCategory(args.category) : undefined;
        const status =
          args?.status === "draft" || args?.status === "published" ? args.status : undefined;

        const posts = await deps.store.listPosts({
          category,
          status,
          limit: typeof args?.limit === "number" ? args.limit : 50,
        });

        if (posts.length === 0) {
          return textResult(
            `site: ${site.key}\n\nNo posts yet. The archive is empty, so any topic is new — and there is nothing to link to except the service pages (see get_link_targets).`,
          );
        }

        const lines = posts.map(
          (post) =>
            `${post.status === "published" ? "published" : "draft    "}  ${post.category.padEnd(5)}  /${post.slug}\n              ${post.title}`,
        );

        return textResult(
          `site: ${site.key}\n${posts.length} post${posts.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}`,
        );
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Could not list posts.");
      }
    },
  );

  /* ------------------------------------------------------------ 3. check_slug */

  define(
    "check_slug",
    {
      description:
        "Whether a slug is validly formed and still available. Returns a corrected suggestion when the format is wrong.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          slug: str("The slug to check."),
          title: str("Optional: a title to derive a slug from, when no slug is supplied yet."),
        },
        required: [],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");

        const candidate =
          typeof args?.slug === "string" && args.slug.trim()
            ? args.slug
            : typeof args?.title === "string"
              ? slugify(args.title)
              : "";

        if (!candidate) {
          return errorResult("Supply either a slug or a title to derive one from.");
        }

        const shape = checkSlugShape(candidate);
        if (!shape.ok) {
          return textResult(
            [
              `site: ${site.key}`,
              `slug: ${candidate}`,
              `valid: no — ${shape.error}`,
              shape.suggestion ? `suggestion: ${shape.suggestion}` : "suggestion: none",
            ].join("\n"),
          );
        }

        const taken = await deps.store.slugExists(shape.slug);
        return textResult(
          [
            `site: ${site.key}`,
            `slug: ${shape.slug}`,
            `valid: yes`,
            `available: ${taken ? "no — that slug is already in use" : "yes"}`,
            // The unique index is the real authority; this is a courtesy so the
            // common case fails with a sentence rather than a 23505.
            taken ? "" : `will publish at: ${canonicalFor("blog", shape.slug)}`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Could not check the slug.");
      }
    },
  );

  /* ------------------------------------------------------- 4. get_link_targets */

  define(
    "get_link_targets",
    {
      description:
        "Every real internal route, with its actual heading and summary. Use ONLY these paths — the site has no catch-all route, so an invented path is a hard 404.",
      inputSchema: {
        type: "object",
        properties: { ...SITE_PROPERTY },
        required: [],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");
        const linkable = await deps.store.linkableContent();

        const lines = site.linkTargets.map(
          (target) => `${target.path}\n    ${target.label}\n    ${target.context}`,
        );

        const posts =
          linkable.length > 0
            ? [
                "",
                "Published posts:",
                ...linkable.map(
                  (post) =>
                    `${post.category === "news" ? "/news" : "/blog"}/${post.slug}\n    ${post.title}\n    ${post.excerpt}`,
                ),
              ]
            : ["", "Published posts: none yet."];

        return textResult(
          [
            `site: ${site.key}`,
            "",
            "Routes:",
            ...lines,
            ...posts,
            "",
            `DO NOT LINK to these — they do not exist: ${site.knownMissingPaths.join(", ")}`,
            "Anchors must be written as /#section, not #section: a bare fragment resolves against the post, not the homepage.",
          ].join("\n"),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : "Could not read the link targets.",
        );
      }
    },
  );

  /* -------------------------------------------------- 5. suggest_internal_links */

  define(
    "suggest_internal_links",
    {
      description:
        "Given draft text, propose 2–4 internal links, each with the exact phrase already in the draft that motivates it.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          content: str("The draft body, in Markdown."),
        },
        required: ["content"],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");
        const content = requiredString(args?.content, "content");
        const linkable = await deps.store.linkableContent();

        const corpus: LinkCorpus & { posts: typeof linkable } = {
          targets: site.linkTargets,
          publishedBlogSlugs: linkable.filter((p) => p.category === "blog").map((p) => p.slug),
          publishedNewsSlugs: linkable.filter((p) => p.category === "news").map((p) => p.slug),
          knownMissing: site.knownMissingPaths,
          posts: linkable,
        };

        const suggestions = suggestInternalLinks(content, corpus);

        if (suggestions.length === 0) {
          return textResult(
            `site: ${site.key}\n\nNo confident suggestions. The draft may not overlap the service pages closely enough — call get_link_targets and choose by hand, or widen the draft's coverage.`,
          );
        }

        return textResult(
          [
            `site: ${site.key}`,
            `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}:`,
            "",
            ...suggestions.map(
              (s) =>
                `[${s.anchor}](${s.path})\n    target: ${s.label}\n    anchor already in the draft: “${s.anchor}”\n    why: ${s.why}`,
            ),
          ].join("\n"),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : "Could not suggest links.",
        );
      }
    },
  );

  /* -------------------------------------------------------------- 6. check_seo */

  define(
    "check_seo",
    {
      description:
        "Run the site's own SEO checks plus duplicate-topic, dead-internal-link, repetition, CTA, raw-HTML, and unverifiable-specifics checks. Splits findings into blocking and recommended. Writes nothing.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          title: str("The post headline."),
          slug: str("The URL slug."),
          excerpt: str("The excerpt / summary."),
          content: str("The body, in Markdown."),
          seoTitle: str("Optional SEO title override."),
          seoDescription: str("Optional meta description override."),
          focusKeyword: str("Optional focus keyword, checked for placement."),
          coverImageUrl: str("Optional cover URL, from generate_cover_image."),
          coverImageAlt: str("Alt text — required whenever a cover URL is set."),
        },
        required: ["title", "slug", "excerpt", "content"],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site ?? "ese");

        const input = {
          title: requiredString(args?.title, "title"),
          slug: requiredString(args?.slug, "slug"),
          excerpt: requiredString(args?.excerpt, "excerpt"),
          content: requiredString(args?.content, "content"),
          seoTitle: typeof args?.seoTitle === "string" ? args.seoTitle : "",
          seoDescription: typeof args?.seoDescription === "string" ? args.seoDescription : "",
          focusKeyword: typeof args?.focusKeyword === "string" ? args.focusKeyword : "",
          coverImageUrl: optionalString(args?.coverImageUrl, "coverImageUrl", 2048),
          coverImageAlt: optionalString(args?.coverImageAlt, "coverImageAlt", FIELD_LIMITS.coverImageAlt.max),
        };

        const corpus = await loadCorpus(site, deps);
        const report = buildSeoReport(input, corpus);

        return textResult(
          [
            `site: ${site.key}`,
            renderSeoReport(report, input),
            "",
            report.clean
              ? "Nothing blocking. create_draft will accept this."
              : `${report.blocking.length} blocking finding${report.blocking.length === 1 ? "" : "s"} — fix these before create_draft.`,
          ].join("\n"),
        );
      } catch (error) {
        return errorResult(error instanceof Error ? error.message : "Could not run the SEO checks.");
      }
    },
  );

  /* ------------------------------------------------- 7. generate_cover_image */

  define(
    "upload_cover_image",
    {
      description:
        "PREFERRED cover route. Host an image YOU generated with your own image tool. Draw a cover for the article, send the file here, and pass the returned url and alt unchanged to check_seo and create_draft. Accepts PNG, JPEG, or WebP; normalises to 1200x630 WebP and strips metadata. Needs no OPENAI_API_KEY on the server. If you cannot generate images, use generate_cover_image instead. Read the cover rules in get_writing_guide first — no embedded text, and never depict a specific Tribe or Nation.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          title: str("The post headline. Used to derive alt text if you supply none."),
          slug: str("The post slug. Determines the storage path."),
          imageBase64: str(
            `The image file as base64 — the mode every client can use. A "data:image/png;base64,..." prefix is accepted. Max ${(UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0)} MB decoded.`,
          ),
          imagePath: str(
            "Absolute path to the generated file. LOCAL CLIENTS ONLY — refused over HTTP, where it would disclose the server's filesystem. Use imageBase64 if unsure.",
          ),
          imageUrl: str(
            "An https URL to fetch instead. Must be publicly reachable; private and loopback addresses are refused.",
          ),
          imageAlt: str(
            `Optional alt text describing what the image actually shows. Kept when 1-${FIELD_LIMITS.coverImageAlt.max} characters. Omit it and a plain factual line is derived from the title. Do not name a Tribe, Nation, person, or outcome.`,
          ),
        },
        required: ["site", "title", "slug"],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site);
        const title = requiredString(args?.title, "title");
        const slugArg = requiredString(args?.slug, "slug");

        const shape = checkSlugShape(slugArg);
        if (!shape.ok) {
          return errorResult(
            `${shape.error}${shape.suggestion ? ` Try "${shape.suggestion}".` : ""}`,
          );
        }

        const outcome = await uploadClientCover(
          {
            title,
            slug: shape.slug,
            imageBase64: typeof args?.imageBase64 === "string" ? args.imageBase64 : undefined,
            imagePath: typeof args?.imagePath === "string" ? args.imagePath : undefined,
            imageUrl: typeof args?.imageUrl === "string" ? args.imageUrl : undefined,
            imageAlt: typeof args?.imageAlt === "string" ? args.imageAlt : undefined,
          },
          uploadDeps(deps, options.localFiles),
        );

        if (!outcome.ok) {
          // Names the fallback explicitly. A client told only "that failed" tends
          // to proceed coverless when generated artwork was still available.
          return errorResult(
            `${outcome.error}\n\nNothing was uploaded. Either send a valid PNG, JPEG, or WebP, or call generate_cover_image to fall back to server-side artwork. A draft with no cover is also valid — call create_draft without coverImageUrl.`,
          );
        }

        return textResult(
          [
            `site: ${site.key}`,
            `source: ${outcome.source}`,
            `url: ${outcome.url}`,
            `alt: ${outcome.alt}`,
            `width: ${outcome.width}`,
            `height: ${outcome.height}`,
            `contentType: ${outcome.contentType}`,
            `path: ${outcome.path}`,
            `via: ${outcome.via}`,
            // Said plainly, because a client that supplied alt text and had it
            // rejected on length would otherwise report its own wording to a
            // human as what shipped.
            `altFromCaller: ${outcome.altFromCaller}`,
            outcome.altFromCaller
              ? ""
              : "note: your imageAlt was absent or too long, so the alt above was derived from the title.",
            "",
            "This is YOUR image, hosted. Pass url and alt to check_seo and create_draft unchanged.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : "Could not upload the cover.",
        );
      }
    },
  );

  /* -------------------------------------------- 7b. generate_cover_image */

  define(
    "generate_cover_image",
    {
      description:
        "FALLBACK cover route, for clients that cannot generate images themselves. Prefer upload_cover_image with your own artwork. Order here: an imageUrl you supply, else server-generated artwork (needs OPENAI_API_KEY), else an ESE-branded title card. Call BEFORE create_draft and pass the returned url and alt through unchanged. Never blocks a draft — a coverless post is valid. Check the returned source: composed-brand-cover means NO artwork was produced, only a title card.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          title: str("The post headline. Used in the prompt and on the branded card."),
          slug: str("The post slug. Determines the storage path."),
          eyebrow: str("The topic line, e.g. a service area name."),
          imageUrl: str("Optional: import this HTTPS image instead of generating one."),
          imagePrompt: str("Optional extra subject direction. Never relaxes the content rules."),
          imageAlt: str("Optional alt text for real artwork. Ignored on the branded card."),
        },
        required: ["site", "title", "slug"],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        // Required here, not defaulted: this tool writes to storage.
        const site = resolveSite(args?.site);
        const title = requiredString(args?.title, "title");
        const slugArg = requiredString(args?.slug, "slug");

        const shape = checkSlugShape(slugArg);
        if (!shape.ok) {
          return errorResult(
            `${shape.error}${shape.suggestion ? ` Try "${shape.suggestion}".` : ""}`,
          );
        }

        const outcome = await resolveCover(
          {
            site,
            title,
            slug: shape.slug,
            eyebrow: typeof args?.eyebrow === "string" && args.eyebrow.trim() ? args.eyebrow : site.shortName,
            imageUrl: typeof args?.imageUrl === "string" ? args.imageUrl : undefined,
            imagePrompt: typeof args?.imagePrompt === "string" ? args.imagePrompt : undefined,
            imageAlt: typeof args?.imageAlt === "string" ? args.imageAlt : undefined,
            model: deps.model,
            quality: deps.quality,
          },
          coverDeps(deps),
        );

        if (!outcome.ok) {
          return errorResult(
            `${outcome.error}\n\nA draft with no cover is still valid — call create_draft without coverImageUrl.`,
          );
        }

        return textResult(
          [
            `site: ${site.key}`,
            `source: ${outcome.source}`,
            `url: ${outcome.url}`,
            `alt: ${outcome.alt}`,
            `size: ${outcome.width}x${outcome.height} ${outcome.format}`,
            `fellBackToBrandCover: ${outcome.fellBackToBrandCover}`,
            outcome.attemptedSource ? `attemptedSource: ${outcome.attemptedSource}` : "",
            outcome.reason ? `reason: ${outcome.reason}` : "",
            outcome.warning ? `warning: ${outcome.warning}` : "",
            "",
            "Pass url and alt to create_draft unchanged. Do not rewrite the alt text.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : "Could not produce a cover.",
        );
      }
    },
  );

  /* ----------------------------------------------------------- 8. create_draft */

  define(
    "create_draft",
    {
      description:
        "Insert a DRAFT post. Always a draft, always attributed to the site owner, always marked ai-assisted — publishing is a human action in the admin console. Returns the row id and the review URL.",
      inputSchema: {
        type: "object",
        properties: {
          ...SITE_PROPERTY,
          title: str(`The headline. 1–${FIELD_LIMITS.title.max} characters.`),
          slug: str("The URL slug. Run check_slug first."),
          excerpt: str(`The summary. 1–${FIELD_LIMITS.excerpt.max} characters.`),
          content: str("The body, in Markdown. No raw HTML — it is discarded at render."),
          seoTitle: str(`Optional title override, max ${FIELD_LIMITS.seoTitle.max}.`),
          seoDescription: str(`Optional meta description, max ${FIELD_LIMITS.seoDescription.max}.`),
          focusKeyword: str(`Optional focus keyword, max ${FIELD_LIMITS.focusKeyword.max}.`),
          coverImageUrl: str(
            "Cover URL, exactly as returned by upload_cover_image (preferred) or generate_cover_image. This tool never makes an image; it only stores the URL you pass.",
          ),
          coverImageAlt: str(
            "Alt text, exactly as returned by whichever cover tool you called. REQUIRED whenever coverImageUrl is set. Do not rewrite it.",
          ),
          category: str(`${POST_CATEGORIES.join(" or ")}. Defaults to blog.`),
          relatedKeywords: {
            type: "array",
            items: { type: "string" },
            description:
              "NOT PERSISTED — there is no column for these. Validated and echoed back; express them inside content.",
          },
          internalLinks: {
            type: "array",
            items: { type: "string" },
            description:
              "NOT PERSISTED — there is no column for these. Validated and echoed back; express them as Markdown links inside content.",
          },
        },
        required: ["site", "title", "slug", "excerpt", "content"],
      },
    },
    async (args: Record<string, unknown>) => {
      try {
        const site = resolveSite(args?.site);

        // Refused loudly rather than dropped. A caller that passes `status`
        // believes it can publish, and letting the argument vanish silently would
        // leave that belief intact.
        for (const forbidden of ["status", "source", "author_id", "published_at", "id"]) {
          if (args && Object.prototype.hasOwnProperty.call(args, forbidden)) {
            return errorResult(
              `This tool cannot set "${forbidden}". Every post it writes is a draft attributed to the site owner and marked ai-assisted. Publishing happens in ${ADMIN_PATH}, as a person.`,
            );
          }
        }

        const category = resolveCategory(args?.category);
        const title = requiredString(args?.title, "title");
        const slugArg = requiredString(args?.slug, "slug");
        const excerpt = requiredString(args?.excerpt, "excerpt");
        const content = requiredString(args?.content, "content");

        const coverImageUrl = optionalString(args?.coverImageUrl, "coverImageUrl", 2048);
        const coverImageAlt = optionalString(
          args?.coverImageAlt,
          "coverImageAlt",
          FIELD_LIMITS.coverImageAlt.max,
        );
        const seoTitle = optionalString(args?.seoTitle, "seoTitle", FIELD_LIMITS.seoTitle.max);
        const seoDescription = optionalString(
          args?.seoDescription,
          "seoDescription",
          FIELD_LIMITS.seoDescription.max,
        );
        const focusKeyword = optionalString(
          args?.focusKeyword,
          "focusKeyword",
          FIELD_LIMITS.focusKeyword.max,
        );

        // ESE's own validator, not a second copy of the same rules.
        const errors = validatePost({
          title,
          slug: slugArg,
          excerpt,
          content,
          category,
          focusKeyword,
          coverImageUrl,
          coverImageAlt,
          seoTitle,
          seoDescription,
        });

        if (hasErrors(errors)) {
          return errorResult(
            `The draft was not saved:\n${Object.entries(errors)
              .map(([field, message]) => `  ${field}: ${message}`)
              .join("\n")}`,
          );
        }

        const created = await deps.store.createDraft({
          title,
          slug: slugArg.trim(),
          excerpt,
          content,
          seoTitle,
          seoDescription,
          coverImageUrl,
          coverImageAlt,
          focusKeyword,
          category,
        });

        // Reported on what was actually saved, not on what was proposed.
        const corpus = await loadCorpus(site, deps);
        const report = buildSeoReport(
          {
            title,
            slug: created.slug,
            excerpt,
            content,
            seoTitle: seoTitle ?? "",
            seoDescription: seoDescription ?? "",
            focusKeyword: focusKeyword ?? "",
            coverImageUrl,
            coverImageAlt,
          },
          corpus,
        );

        const notPersisted: string[] = [];
        if (Array.isArray(args?.relatedKeywords) && args.relatedKeywords.length > 0) {
          notPersisted.push(
            `relatedKeywords (${args.relatedKeywords.length}) were NOT saved — there is no column for them. They must appear inside content.`,
          );
        }
        if (Array.isArray(args?.internalLinks) && args.internalLinks.length > 0) {
          notPersisted.push(
            `internalLinks (${args.internalLinks.length}) were NOT saved — there is no column for them. They must be Markdown links inside content.`,
          );
        }

        return textResult(
          [
            `site: ${site.key}`,
            `status: draft`,
            `source: ai-assisted`,
            `id: ${created.id}`,
            `slug: ${created.slug}`,
            `category: ${category}`,
            `review at: ${reviewUrl(created.id)}`,
            `will publish at: ${canonicalFor(category, created.slug)}`,
            "",
            ...notPersisted,
            notPersisted.length > 0 ? "" : "",
            renderSeoReport(report, {
              title,
              slug: created.slug,
              excerpt,
              content,
              seoTitle: seoTitle ?? "",
              seoDescription: seoDescription ?? "",
              focusKeyword: focusKeyword ?? "",
              coverImageUrl,
              coverImageAlt,
            }),
            "",
            `Saved as a draft. It is not public and will not be until somebody publishes it at ${reviewUrl(created.id)}.`,
          ]
            .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
            .join("\n"),
        );
      } catch (error) {
        return errorResult(
          error instanceof Error ? error.message : "The draft could not be saved.",
        );
      }
    },
  );

  /* -------------------------------------------------------- the two handlers */

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const handler = handlers.get(request.params.name);
    if (!handler) {
      return errorResult(
        `Unknown tool "${request.params.name}". Available: ${[...handlers.keys()].join(", ")}.`,
      );
    }

    try {
      return await handler((request.params.arguments ?? {}) as Record<string, unknown>);
    } catch (error) {
      // A handler that throws would otherwise become a protocol error, which
      // tells the client nothing about which tool failed or what to change.
      return errorResult(
        error instanceof Error ? error.message : `${request.params.name} failed.`,
      );
    }
  });
}

/** The tool names, for the handshake test and the README. */
export const TOOL_NAMES = [
  "get_writing_guide",
  "list_posts",
  "check_slug",
  "get_link_targets",
  "suggest_internal_links",
  "check_seo",
  "upload_cover_image",
  "generate_cover_image",
  "create_draft",
] as const;
