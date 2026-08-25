/**
 * One draft, end to end, through the real tool surface.
 *
 * The real `registerTools`, the real Supabase adapter, the real SEO layer, the
 * real cover pipeline — with the **image provider stubbed**, so a full run makes
 * no paid request. The row is namespaced under `zz-mcp-check-` and deleted in a
 * `finally`, including on failure.
 *
 * What this catches that the unit suites cannot: the wiring. Each layer is
 * already tested in isolation, so the interesting failures left are a tool that
 * passes the wrong field along, a review URL built from the wrong id, or a cover
 * URL that never reaches the row.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-e2e.mjs
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { createClient } from "@supabase/supabase-js";

import { registerTools, TOOL_NAMES } from "../mcp/tools.ts";
import { supabaseStore } from "../mcp/adapters/supabase.ts";
import { httpsImageFetcher } from "../mcp/image-import.ts";
import { workingProvider } from "../mcp/testing/fakes.ts";
import { readEnv } from "../mcp/lib.ts";

const PREFIX = "zz-mcp-check-";

let passed = 0;
let failed = 0;

function ok(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceKey) {
  console.log("SKIPPED — needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(0);
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Drive the real tool surface in-process.
 *
 * The handshake suite already proves the stdio transport works, so this talks to
 * the registered handlers directly — that keeps the assertions about content
 * rather than about framing, and lets the provider be swapped for a stub.
 */
function toolRunner(provider) {
  const server = new Server(
    { name: "e2e", version: "0" },
    { capabilities: { tools: {} } },
  );

  const handlers = new Map();
  let toolList = [];

  // Capture what registerTools installs, rather than reaching into the SDK.
  server.setRequestHandler = (schema, handler) => {
    const name = schema?.shape?.method?.value ?? schema?._def?.shape?.()?.method?._def?.value;
    if (name === "tools/list") {
      handlers.set("__list", handler);
    } else if (name === "tools/call") {
      handlers.set("__call", handler);
    }
  };

  registerTools(server, {
    store: supabaseStore,
    provider,
    fetcher: httpsImageFetcher,
    model: "stub-model",
    quality: "medium",
  });

  return {
    async list() {
      const result = await handlers.get("__list")({ params: {} });
      toolList = result.tools;
      return toolList;
    },
    async call(name, args) {
      const result = await handlers.get("__call")({
        params: { name, arguments: args },
      });
      return {
        isError: result.isError === true,
        text: result.content?.[0]?.text ?? "",
      };
    },
  };
}

const stamp = Date.now().toString(36);
const slug = `${PREFIX}e2e-${stamp}`;
let createdId = null;

/**
 * Delete the rows *and* the storage objects.
 *
 * The cover upload is a real write to a real public bucket, so a run that only
 * cleaned up `posts` would leave a file behind every time — and orphaned objects
 * in `blog-images` are indistinguishable from covers a human uploaded.
 */
async function cleanup() {
  const { error } = await service.from("posts").delete().like("slug", `${PREFIX}%`);

  const { data: objects } = await service.storage.from("blog-images").list("covers", {
    limit: 200,
  });
  const ours = (objects ?? [])
    .filter((object) => object.name.startsWith(PREFIX))
    .map((object) => `covers/${object.name}`);

  if (ours.length > 0) {
    await service.storage.from("blog-images").remove(ours);
  }

  return error;
}

const provider = workingProvider();
const tools = toolRunner(provider);

try {
  await cleanup();

  /* ------------------------------------------------------- 1. the tool list */

  section("1. The tool surface");

  const list = await tools.list();
  // Derived from TOOL_NAMES, not a literal: a hardcoded count turns "a tool was
  // added" into a failing assertion that points at itself.
  ok(
    list.length === TOOL_NAMES.length,
    `All ${TOOL_NAMES.length} tools registered`,
    String(list.length),
  );

  /* ------------------------------------------------------ 2. the guide first */

  section("2. get_writing_guide");

  const guide = await tools.call("get_writing_guide", { site: "ese" });
  ok(!guide.isError, "Returns without error");
  ok(guide.text.includes("Native Nations"), "Uses ESE's terminology");
  ok(guide.text.includes("noindex"), "States the site is not indexed");

  /* --------------------------------------------------------- 3. list_posts */

  section("3. list_posts");

  const posts = await tools.call("list_posts", { site: "ese" });
  ok(!posts.isError, "Returns without error");
  ok(posts.text.includes("site: ese"), "Echoes the resolved site");

  /* --------------------------------------------------------- 4. check_slug */

  section("4. check_slug");

  const slugCheck = await tools.call("check_slug", { site: "ese", slug });
  ok(!slugCheck.isError, "Returns without error");
  ok(slugCheck.text.includes("available: yes"), "The new slug is available");

  const badSlug = await tools.call("check_slug", { site: "ese", title: "PFAS In Tribal Water" });
  ok(badSlug.text.includes("pfas-in-tribal-water"), "Derives a slug from a title", "");

  /* ---------------------------------------------------- 5. get_link_targets */

  section("5. get_link_targets");

  const targets = await tools.call("get_link_targets", { site: "ese" });
  ok(!targets.isError, "Returns without error");
  ok(targets.text.includes("/services/grant-development"), "Lists a real service page");
  ok(targets.text.includes("DO NOT LINK"), "Warns about the known-404 paths");
  ok(targets.text.includes("/services,"), "And names /services among them");

  /* ------------------------------------------------ 6. the cover, stubbed */

  section("6. generate_cover_image, with the provider stubbed");

  const cover = await tools.call("generate_cover_image", {
    site: "ese",
    title: "How grant eligibility works for Native Nations",
    slug,
    eyebrow: "Grant development",
  });

  ok(!cover.isError, "Returns without error", cover.isError ? cover.text.slice(0, 90) : "");
  ok(cover.text.includes("source: generated-image"), "Used the (stubbed) generator");
  ok(provider.callCount() === 1, "The stub was called once — no paid request", String(provider.callCount()));
  ok(cover.text.includes("1200x630 webp"), "Produced a 1200x630 WebP");

  const coverUrl = (cover.text.match(/^url: (.+)$/m) ?? [])[1];
  const coverAlt = (cover.text.match(/^alt: (.+)$/m) ?? [])[1];
  ok(Boolean(coverUrl && coverUrl.startsWith("https://")), "Returned a public URL", coverUrl);
  ok(Boolean(coverAlt && coverAlt.length > 10), "Returned alt text", coverAlt);
  ok(coverUrl.includes("/covers/"), "The cover landed under covers/");

  /* --------------------------------------------------------- 7. check_seo */

  section("7. check_seo before writing");

  const body = [
    "Tribal environmental staff asking how grant eligibility works usually need two",
    "answers at once: whether a programme is open to a Nation directly, and what a",
    "complete application looks like. This post covers both, and points at where the",
    "determination actually gets made.",
    "",
    "## Who can apply for grant funding",
    "",
    "Grant eligibility is set by the programme, not by us, and the programme's own",
    "notice is the only place it is settled. What we can do is read that notice with",
    "you and say plainly whether the work you have in mind fits it. Our",
    "[grant development work](/services/grant-development) starts there, not with a",
    "template.",
    "",
    "Some programmes are open to Native Nations governments directly. Others route",
    "through a consortium, a state agency, or a pass-through recipient, which changes",
    "who signs and who reports. That distinction is worth settling before anybody",
    "writes a narrative, because it decides the whole shape of the submission.",
    "",
    "## What a complete application looks like",
    "",
    "A narrative that answers the notice in the notice's own order. A budget whose",
    "lines a reviewer can tie to that narrative. Letters that say something specific.",
    "And a plan for the reporting an award will require, written before the award",
    "instead of after it.",
    "",
    "Where the work runs into rules more than paperwork, our",
    "[policy support work](/services/policy-support-and-sovereignty) covers the part",
    "that is about how the law applies in your area, not about the form itself.",
    "",
    "## Where grant eligibility is finally decided",
    "",
    "By the programme officer, against the notice. Anything we tell you is a reading",
    "of a document they administer, which is why our answers point back to that",
    "document instead of standing in for it. If you want a second reader on a filing",
    "you are looking at now, that is a conversation rather than an engagement.",
    "",
    "What we will not do is tell you a programme is open to you when the notice is",
    "ambiguous and the officer has not been asked. An answer that turns out to be",
    "wrong costs a submission cycle, and a cycle is a year. Saying so plainly at the",
    "start is worth more than confidence, and it is the part of this work that a",
    "template cannot do for you. Bring the paperwork, bring the timeline you are",
    "working to, and we will read it with you rather than around you.",
    "",
    "[Talk to us about this](/#contact)",
  ].join("\n");

  const draft = {
    site: "ese",
    title: "How grant eligibility works for Native Nations",
    slug,
    excerpt:
      "Whether a funding programme is open to a Nation directly, what a complete application looks like, and where grant eligibility is actually decided.",
    content: body,
    focusKeyword: "grant eligibility",
    coverImageUrl: coverUrl,
    coverImageAlt: coverAlt,
    category: "blog",
  };

  const seo = await tools.call("check_seo", draft);
  ok(!seo.isError, "Returns without error", seo.isError ? seo.text.slice(0, 90) : "");
  ok(seo.text.includes("BLOCKING: none."), "The draft has nothing blocking", seo.text.slice(0, 120));
  ok(seo.text.includes("SEO score:"), "Reports a score");
  ok(
    seo.text.includes("placeholder") || seo.text.includes("example.com"),
    "Still warns about the placeholder domain",
  );

  const scoreLine = (seo.text.match(/SEO score: (\d+)/) ?? [])[1];
  ok(Number(scoreLine) >= 70, "Score is respectable", `${scoreLine}/100`);

  /* ------------------------------------------------ 8. suggest_internal_links */

  section("8. suggest_internal_links");

  const suggestions = await tools.call("suggest_internal_links", {
    site: "ese",
    content: body,
  });
  ok(!suggestions.isError, "Returns without error");

  /* -------------------------------------------------------- 9. create_draft */

  section("9. create_draft");

  const created = await tools.call("create_draft", draft);
  ok(!created.isError, "Returns without error", created.isError ? created.text.slice(0, 140) : "");
  ok(created.text.includes("status: draft"), "Reports status draft");
  ok(created.text.includes("source: ai-assisted"), "Reports source ai-assisted");

  createdId = (created.text.match(/^id: (.+)$/m) ?? [])[1];
  ok(Boolean(createdId) && createdId.length === 36, "Returned a row id", createdId);

  const review = (created.text.match(/^review at: (.+)$/m) ?? [])[1];
  ok(review === `/admin/posts/${createdId}`, "The review URL uses the real id", review);
  ok(
    created.text.includes(`will publish at: https://example.com/blog/${slug}`),
    "The canonical is the blog path",
    (created.text.match(/^will publish at: (.+)$/m) ?? [])[1],
  );

  /* -------------------------------------------- 10. what actually landed */

  section("10. The row, as the database has it");

  const { data: row } = await service
    .from("posts")
    .select("*")
    .eq("id", createdId)
    .single();

  ok(row?.status === "draft", "status is draft", row?.status);
  ok(row?.source === "ai-assisted", "source is ai-assisted", row?.source);
  ok(row?.published_at === null, "published_at is null");
  ok(row?.slug === slug, "slug matches");
  ok(row?.category === "blog", "category is blog");
  ok(row?.focus_keyword === "grant eligibility", "focus_keyword persisted", row?.focus_keyword);
  ok(row?.cover_image_url === coverUrl, "The cover URL reached the row");
  ok(row?.cover_image_alt === coverAlt, "The alt text reached the row");
  ok(row?.content === body, "The body reached the row unmodified");
  ok(row?.title === draft.title, "The title reached the row");
  ok(row?.excerpt === draft.excerpt, "The excerpt reached the row");

  section("10b. And it is not visible to the public");

  const anonKey =
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (anonKey) {
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: anonRows } = await anon.from("posts").select("id").eq("id", createdId);
    ok((anonRows?.length ?? 0) === 0, "Anonymous cannot read the draft");
  } else {
    console.log("        (no publishable key — skipping the anonymous read)");
  }

  /* ------------------------------------------ 11. a duplicate is refused */

  section("11. The same slug twice");

  const again = await tools.call("create_draft", draft);
  ok(again.isError, "A second create_draft with the same slug fails");
  ok(again.text.includes("already taken"), "And says the slug is taken", again.text.slice(0, 80));

  const { count } = await service
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("slug", slug);
  ok(count === 1, "Only one row exists for that slug", String(count));

  /* ---------------------------------- 12. a blocked draft is still writable */

  section("12. check_seo blocks advisorily, it does not gate the insert");

  const thin = await tools.call("check_seo", {
    site: "ese",
    title: "A thin post",
    slug: `${PREFIX}thin-${stamp}`,
    excerpt: "Too short to be worth publishing.",
    content: "## Heading\n\nA sentence.",
  });
  ok(thin.text.includes("blocking finding"), "A thin draft reports blocking findings");
} finally {
  section("Cleanup");
  const error = await cleanup();
  ok(!error, "Deleted every row under the test prefix", error?.message ?? "");

  const { data: survivors } = await service
    .from("posts")
    .select("id, slug, status")
    .like("slug", `${PREFIX}%`);
  ok(
    (survivors?.length ?? 0) === 0,
    "Nothing survives the run",
    survivors?.length ? survivors.map((s) => `${s.slug}:${s.status}`).join(", ") : "0 rows",
  );

  const { data: anyPublished } = await service
    .from("posts")
    .select("id, slug")
    .eq("status", "published");
  ok(
    (anyPublished?.length ?? 0) === 0,
    "No published post exists in the table at all",
    `${anyPublished?.length ?? 0} published rows`,
  );

  const { data: leftoverObjects } = await service.storage
    .from("blog-images")
    .list("covers", { limit: 200 });
  const orphans = (leftoverObjects ?? []).filter((object) => object.name.startsWith(PREFIX));
  ok(
    orphans.length === 0,
    "No cover objects are left in the bucket",
    orphans.length ? orphans.map((o) => o.name).join(", ") : "0 objects",
  );

  ok(provider.callCount() <= 1, "The stub provider was called at most once", String(provider.callCount()));
}

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
