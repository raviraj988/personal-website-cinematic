/**
 * The Supabase adapter, against the real database.
 *
 * Modelled on `verify-contract.mjs`: every row it creates is namespaced under a
 * prefix and deleted in a `finally`, including on failure. The prefix is
 * deliberately **different** from that script's `zz-contract-check-` so the two
 * can never delete each other's fixtures — run them serially all the same.
 *
 * The assertion that matters most is in section 1 and touches no data: that this
 * module exports nothing publish-shaped. Everything else here could be replaced
 * by a mock; that one cannot, because it is a claim about the real module's
 * surface.
 *
 *   node --import ./scripts/register-ts.mjs scripts/test-mcp-adapter.mjs
 */
import * as adapterModule from "../mcp/adapters/supabase.ts";
import { supabaseStore } from "../mcp/adapters/supabase.ts";
import { readEnv } from "../mcp/lib.ts";
import { createClient } from "@supabase/supabase-js";

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

async function rejects(promise, label) {
  try {
    await promise;
    ok(false, label, "did not reject");
  } catch (error) {
    ok(true, label, error.message.slice(0, 80));
  }
}

/* ------------------------------------- 1. the shape of the module (no I/O) */

section("1. The adapter exports nothing that could publish");

const FORBIDDEN = /publish|unpublish|update|delete|remove|destroy|promote/i;

const moduleExports = Object.keys(adapterModule);
ok(moduleExports.length > 0, "The module has exports to enumerate", moduleExports.join(", "));
const badExports = moduleExports.filter((name) => FORBIDDEN.test(name));
ok(
  badExports.length === 0,
  "No module export is publish-shaped",
  badExports.length ? badExports.join(", ") : "checked: " + moduleExports.join(", "),
);

const storeMethods = Object.keys(supabaseStore);
const badMethods = storeMethods.filter((name) => FORBIDDEN.test(name));
ok(
  badMethods.length === 0,
  "No store method is publish-shaped",
  badMethods.length ? badMethods.join(", ") : "checked: " + storeMethods.join(", "),
);
/**
 * Kept as an explicit list rather than derived from the object.
 *
 * Deriving it would make the assertion vacuous — the store would always have
 * exactly the methods the store has. The point is that widening `BlogStore` is a
 * deliberate act that has to be written down here too, so a method appearing
 * without anyone noticing fails a test. The publish-shape check above is the
 * security control; this is the tripwire that makes someone look at it.
 *
 * Grew from six to eleven in 0005: the five `*CoverTicket*` / `*CoverResult*`
 * methods back the out-of-band upload route. None of them touch `posts`.
 */
const DOCUMENTED_METHODS = [
  "resolveAuthorId",
  "listPosts",
  "slugExists",
  "linkableContent",
  "createDraft",
  "uploadCover",
  "createCoverTicket",
  "readCoverTicket",
  "claimCoverTicket",
  "recordCoverResult",
  "recordCoverFailure",
];
const undocumented = storeMethods.filter((m) => !DOCUMENTED_METHODS.includes(m));
ok(
  undocumented.length === 0 && storeMethods.length === DOCUMENTED_METHODS.length,
  "The store has exactly the documented methods",
  undocumented.length ? `undocumented: ${undocumented.join(", ")}` : `${storeMethods.length}`,
);
for (const expected of [
  "resolveAuthorId",
  "listPosts",
  "slugExists",
  "linkableContent",
  "createDraft",
  "uploadCover",
]) {
  ok(typeof supabaseStore[expected] === "function", `Store method present: ${expected}`);
}

/* ------------------------------------------------------------- environment */

section("2. Environment");

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceKey) {
  console.log(
    "\n  SKIPPED — NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed for the database half.",
  );
  console.log(`\n${passed}/${passed + failed} checks passed.`);
  process.exit(failed > 0 ? 1 : 0);
}

ok(!/\/rest\/v1\/?$/.test(url), "The project URL is a bare origin");

// A second, independent client, so cleanup does not depend on the module under
// test still working.
const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Rows and storage objects both. This suite does not upload a cover today, but
 * it deletes any it finds under the prefix so that an interrupted earlier run —
 * or a future test that does upload — cannot leave files in a public bucket.
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

let createdId = null;

try {
  // Anything left behind by an interrupted earlier run.
  await cleanup();

  /* ------------------------------------------------------------- 3. author */

  section("3. Author resolution");

  const authorId = await supabaseStore.resolveAuthorId();
  ok(typeof authorId === "string" && authorId.length === 36, "Resolves an author id");

  const { data: owners } = await service
    .from("profiles")
    .select("id, created_at")
    .eq("role", "owner")
    .order("created_at", { ascending: true });

  ok((owners?.length ?? 0) > 0, "At least one owner profile exists", String(owners?.length));
  ok(
    owners?.[0]?.id === authorId,
    "It is the OLDEST owner, as the wire contract documents",
  );

  const again = await supabaseStore.resolveAuthorId();
  ok(again === authorId, "The result is memoised and stable");

  /* --------------------------------------------------------- 4. slug reads */

  section("4. Slug availability");

  const freeSlug = `${PREFIX}available-${Date.now().toString(36)}`;
  ok((await supabaseStore.slugExists(freeSlug)) === false, "An unused slug is available");
  ok(
    (await supabaseStore.slugExists("Not A Valid Slug")) === false,
    "An invalid slug reports not-existing rather than throwing",
  );

  /* -------------------------------------------------------- 5. the insert */

  section("5. createDraft writes a draft, and only a draft");

  const slug = `${PREFIX}draft-${Date.now().toString(36)}`;
  const created = await supabaseStore.createDraft({
    title: "A drafting-tool check post",
    slug,
    excerpt: "Written by scripts/test-mcp-adapter.mjs. Deleted before this script exits.",
    content:
      "## A heading\n\nBody text, long enough to be a valid row but not long enough to matter.",
    seoTitle: null,
    seoDescription: null,
    coverImageUrl: null,
    coverImageAlt: null,
    focusKeyword: null,
    category: "blog",
  });

  createdId = created.id;
  ok(typeof created.id === "string" && created.id.length === 36, "Returns a row id", created.id);
  ok(created.slug === slug, "Returns the slug it wrote");

  const { data: row } = await service
    .from("posts")
    .select("status, source, published_at, author_id, category, focus_keyword, title")
    .eq("id", created.id)
    .single();

  ok(row?.status === "draft", "The row is a DRAFT", row?.status);
  ok(row?.source === "ai-assisted", "The row is marked ai-assisted", row?.source);
  ok(row?.published_at === null, "published_at is null");
  ok(row?.author_id === authorId, "Attributed to the oldest owner");
  ok(row?.category === "blog", "Category defaults to blog", row?.category);
  ok(
    row?.focus_keyword === null,
    "An absent focus keyword is NULL, not an empty string — the CHECK refuses ''",
    JSON.stringify(row?.focus_keyword),
  );

  section("5b. The slug is now taken");

  ok(await supabaseStore.slugExists(slug), "slugExists sees the new row");
  await rejects(
    supabaseStore.createDraft({
      title: "Same slug again",
      slug,
      excerpt: "Should be refused before the insert.",
      content: "Body.",
      seoTitle: null,
      seoDescription: null,
      coverImageUrl: null,
      coverImageAlt: null,
      focusKeyword: null,
      category: "blog",
    }),
    "A duplicate slug is refused pre-flight, with a sentence",
  );

  /* ------------------------------------------- 6. what it refuses to write */

  section("6. Fields this server may not set");

  for (const forbidden of ["status", "source", "author_id", "published_at", "id"]) {
    await rejects(
      supabaseStore.createDraft({
        title: "Trying to set a forbidden field",
        slug: `${PREFIX}forbidden-${forbidden}`,
        excerpt: "Should never reach the database.",
        content: "Body.",
        seoTitle: null,
        seoDescription: null,
        coverImageUrl: null,
        coverImageAlt: null,
        focusKeyword: null,
        category: "blog",
        [forbidden]: forbidden === "published_at" ? new Date().toISOString() : "published",
      }),
      `Refused an input carrying "${forbidden}"`,
    );
  }

  const { data: leaked } = await service
    .from("posts")
    .select("id")
    .like("slug", `${PREFIX}forbidden-%`);
  ok((leaked?.length ?? 0) === 0, "None of those reached the database");

  section("6b. Constraint failures come back as sentences");

  await rejects(
    supabaseStore.createDraft({
      title: "Cover with no alt text",
      slug: `${PREFIX}no-alt`,
      excerpt: "The database CHECK should refuse this.",
      content: "Body.",
      seoTitle: null,
      seoDescription: null,
      coverImageUrl: "https://example.com/cover.webp",
      coverImageAlt: null,
      focusKeyword: null,
      category: "blog",
    }),
    "A cover with no alt text is refused",
  );

  await rejects(
    supabaseStore.createDraft({
      title: "Bad slug",
      slug: "Not A Valid Slug",
      excerpt: "Refused by the shape check.",
      content: "Body.",
      seoTitle: null,
      seoDescription: null,
      coverImageUrl: null,
      coverImageAlt: null,
      focusKeyword: null,
      category: "blog",
    }),
    "An invalid slug is refused before any I/O",
  );

  await rejects(
    supabaseStore.createDraft({
      title: "Empty focus keyword",
      slug: `${PREFIX}empty-keyword`,
      excerpt: "posts_focus_keyword_length refuses an empty string.",
      content: "Body.",
      seoTitle: null,
      seoDescription: null,
      coverImageUrl: null,
      coverImageAlt: null,
      focusKeyword: "",
      category: "blog",
    }),
    "An empty-string focus keyword is refused",
  );

  section("6c. A news draft is still a draft");

  const newsSlug = `${PREFIX}news-${Date.now().toString(36)}`;
  const newsRow = await supabaseStore.createDraft({
    title: "A news check item",
    slug: newsSlug,
    excerpt: "Category news, still a draft.",
    content: "## Heading\n\nBody.",
    seoTitle: null,
    seoDescription: null,
    coverImageUrl: null,
    coverImageAlt: null,
    focusKeyword: "check item",
    category: "news",
  });

  const { data: newsCheck } = await service
    .from("posts")
    .select("status, category, focus_keyword")
    .eq("id", newsRow.id)
    .single();

  ok(newsCheck?.category === "news", "Category news is written", newsCheck?.category);
  ok(newsCheck?.status === "draft", "And it is still a draft", newsCheck?.status);
  ok(
    newsCheck?.focus_keyword === "check item",
    "A supplied focus keyword is persisted",
    newsCheck?.focus_keyword,
  );

  /* ------------------------------------------------------------- 7. listing */

  section("7. listPosts");

  const all = await supabaseStore.listPosts({ limit: 100 });
  ok(Array.isArray(all), "Returns an array");
  ok(
    all.some((p) => p.slug === slug),
    "The new draft is listed",
  );

  const listed = all.find((p) => p.slug === slug);
  for (const field of ["id", "title", "slug", "status", "category", "updated_at"]) {
    ok(field in listed, `Listing carries ${field}`);
  }
  ok(!("content" in listed), "Listing does NOT carry the body");

  const drafts = await supabaseStore.listPosts({ status: "draft", limit: 100 });
  ok(
    drafts.every((p) => p.status === "draft"),
    "Filtering by status works",
  );

  const newsOnly = await supabaseStore.listPosts({ category: "news", limit: 100 });
  ok(
    newsOnly.every((p) => p.category === "news"),
    "Filtering by category works",
  );
  ok(
    newsOnly.some((p) => p.slug === newsSlug),
    "The news draft appears under category news",
  );

  const capped = await supabaseStore.listPosts({ limit: 1 });
  ok(capped.length <= 1, "The limit is honoured", String(capped.length));

  /* ----------------------------------------------------- 8. linkableContent */

  section("8. linkableContent excludes drafts");

  const linkable = await supabaseStore.linkableContent();
  ok(Array.isArray(linkable), "Returns an array");
  ok(
    !linkable.some((p) => p.slug === slug || p.slug === newsSlug),
    "Neither new draft is linkable — drafts are not published",
  );
  ok(
    linkable.every((p) => "slug" in p && "title" in p && "excerpt" in p),
    "Each linkable row carries slug, title, and excerpt",
  );
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

  const { data: published } = await service
    .from("posts")
    .select("id, slug")
    .eq("status", "published")
    .like("slug", `${PREFIX}%`);
  ok((published?.length ?? 0) === 0, "This run published nothing");
}

console.log(`\n${passed}/${passed + failed} checks passed.`);
if (failed > 0) {
  console.log(`${failed} FAILED — see above.`);
  process.exit(1);
}
