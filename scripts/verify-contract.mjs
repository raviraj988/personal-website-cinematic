/**
 * Proves the wire contract and the security properties against a real database.
 *
 *   npm run verify:contract              # database assertions only
 *   npm run verify:contract -- --base-url http://localhost:3000
 *
 * Reads credentials from `.env.local`.
 *
 * This impersonates the external MCP drafting tool: it inserts using exactly the
 * columns that tool writes, with the service-role key, and then asserts what the
 * *anonymous* key can and cannot see. Positive assertions ("the post appears")
 * only show the happy path works. The negative ones — anon cannot read a draft,
 * cannot insert, cannot publish — are the assertions that tell you RLS is doing
 * something, so they are the point of this script.
 *
 * Every row and storage object it creates is removed at the end, including on
 * failure. It never touches rows it did not create: everything is namespaced under
 * a `zz-contract-check-` slug prefix.
 *
 * With `--base-url`, HTTP assertions run too. Point it at `npm run dev` — a
 * production server caches `/blog` for an hour, and this script publishes straight
 * to the database rather than through the console, so nothing fires the
 * revalidation that a real publish would.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------ env and options */

function loadEnvLocal() {
  let raw;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    console.error(
      "Could not read .env.local. Copy .env.local.example to .env.local and fill it in.",
    );
    process.exit(2);
  }

  const env = {};
  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", url],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", anonKey],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
]) {
  if (!value) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(2);
  }
}

// A URL ending in /rest/v1 produces /rest/v1/rest/v1/... and every single call
// fails with an error that looks like anything but a bad variable.
if (!/^https:\/\/[^/]+\/?$/.test(url)) {
  console.error(
    `NEXT_PUBLIC_SUPABASE_URL should be the bare project origin, e.g.\n` +
      `  https://abcdefghijklmnop.supabase.co\n` +
      `Got: ${url}`,
  );
  process.exit(2);
}

const baseUrlIndex = process.argv.indexOf("--base-url");
const baseUrl = baseUrlIndex > -1 ? process.argv[baseUrlIndex + 1] : null;

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ---------------------------------------------------------------- reporting */

let failures = 0;
let checks = 0;
const ok = (pass, name, detail = "") => {
  checks += 1;
  if (!pass) failures += 1;
  console.log(`${pass ? "  PASS " : "  FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
};
const section = (title) => console.log(`\n${title}`);

const PREFIX = "zz-contract-check-";
const stamp = process.env.CONTRACT_STAMP ?? String(Date.now()).slice(-9);
const draftSlug = `${PREFIX}draft-${stamp}`;
const futureSlug = `${PREFIX}future-${stamp}`;
const newsSlug = `${PREFIX}news-${stamp}`;
const created = { postIds: [], newsletterIds: [], objects: [] };

async function cleanup() {
  section("Cleanup");

  // Delete by slug prefix as well as by collected id, so an earlier interrupted
  // run cannot leave rows behind. Nothing outside the prefix is ever touched.
  const { error: postError } = await service
    .from("posts")
    .delete()
    .like("slug", `${PREFIX}%`);
  ok(!postError, "Removed every test post", postError?.message ?? "");

  const { error: newsletterError } = await service
    .from("newsletters")
    .delete()
    .like("slug", `${PREFIX}%`);
  ok(!newsletterError, "Removed every test newsletter issue", newsletterError?.message ?? "");

  if (created.objects.length) {
    const { error } = await service.storage.from("blog-images").remove(created.objects);
    ok(!error, `Removed ${created.objects.length} test storage object(s)`);
  }
}

/* ==========================================================================
   1. Schema and prerequisites
   ========================================================================== */

section("1. Schema and prerequisites");

const { data: owners, error: ownerError } = await service
  .from("profiles")
  .select("id, display_name, role, created_at")
  .eq("role", "owner")
  .order("created_at", { ascending: true });

ok(!ownerError, "profiles table is reachable with the service key", ownerError?.message ?? "");
ok(
  Boolean(owners?.length),
  "At least one profiles row has role = 'owner'",
  owners?.length
    ? `oldest: ${owners[0].display_name ?? owners[0].id}`
    : "the drafting tool FAILS OUTRIGHT without this — see the migration",
);

if (!owners?.length) {
  console.error(
    "\nCannot continue: the external tool attributes every draft to the oldest owner.",
  );
  await cleanup();
  process.exit(1);
}

const authorId = owners[0].id;

const { data: bucket, error: bucketError } = await service.storage.getBucket("blog-images");
ok(!bucketError && Boolean(bucket), "Bucket 'blog-images' exists", bucketError?.message ?? "");
if (bucket) {
  ok(bucket.public === true, "Bucket is public");
  ok(
    bucket.file_size_limit === 5242880,
    "Bucket file size limit is 5 MB",
    String(bucket.file_size_limit),
  );
  const mimes = (bucket.allowed_mime_types ?? []).slice().sort();
  ok(
    JSON.stringify(mimes) === JSON.stringify(["image/jpeg", "image/png", "image/webp"]),
    "Bucket allows exactly JPEG, PNG, WebP",
    mimes.join(", "),
  );
  ok(
    !mimes.includes("image/svg+xml"),
    "Bucket does NOT allow SVG",
  );
}

/* ==========================================================================
   2. The drafting tool's insert — exactly the contract columns
   ========================================================================== */

section("2. Insert as the external drafting tool");

// These are precisely the columns the brief says the tool writes. Nothing more.
const { data: inserted, error: insertError } = await service
  .from("posts")
  .insert({
    title: "Contract check — a draft from the drafting tool",
    slug: draftSlug,
    excerpt: "Inserted by scripts/verify-contract.mjs to prove the wire contract.",
    content:
      "## A heading\n\nSome **body** copy with a [link](https://example.org/).\n\n" +
      "```js\nconst codeIsNotCountedInReadingTime = true;\n```\n",
    cover_image_url: null,
    cover_image_alt: null,
    seo_title: null,
    seo_description: null,
    author_id: authorId,
    status: "draft",
    published_at: null,
    source: "ai-assisted",
  })
  .select("id, title, slug, status, published_at, updated_at")
  .single();

ok(!insertError, "Service-role insert with the contract columns succeeds", insertError?.message ?? "");
if (inserted) created.postIds.push(inserted.id);

if (insertError) {
  console.error("\nThe wire contract is broken — nothing else is worth checking.");
  await cleanup();
  process.exit(1);
}

ok(inserted.status === "draft", "Row is a draft");
ok(inserted.published_at === null, "Row has no publication timestamp");
ok(Boolean(inserted.updated_at), "updated_at is populated by the database");

// The tool's other reads, per the brief.
const { data: slugCheck } = await service
  .from("posts")
  .select("id, title")
  .eq("slug", draftSlug);
ok(slugCheck?.length === 1, "Slug-availability read (id, title by slug) works");

const { data: listRead, error: listError } = await service
  .from("posts")
  .select("id, title, slug, status, published_at, updated_at")
  .limit(5);
ok(!listError, "List read with the tool's column set works", listError?.message ?? "");

section("2b. The source column drives the AI-assisted badge");
const { data: sourceRow } = await service
  .from("posts")
  .select("source, category")
  .eq("id", inserted.id)
  .single();
ok(sourceRow?.source === "ai-assisted", "Row is marked ai-assisted", sourceRow?.source);

/**
 * The `category` column was added in migration 0002, *after* the external tool was
 * written. The tool does not know it exists and never sends it, so the column
 * having a NOT NULL default is the only thing keeping that integration alive. This
 * is the assertion that would catch someone later "tidying up" by dropping the
 * default.
 */
section("2c. category defaults, so the drafting tool keeps working");
ok(
  sourceRow?.category === "blog",
  "A row inserted WITHOUT category defaults to 'blog'",
  sourceRow?.category ?? "(null — the drafting tool would now fail)",
);

const { data: newsRow, error: newsError } = await service
  .from("posts")
  .insert({
    title: "Contract check — a news item",
    slug: newsSlug,
    excerpt: "A news-category post, to prove the two sections do not leak.",
    content: "News body copy.",
    author_id: authorId,
    status: "published",
    published_at: new Date().toISOString(),
    category: "news",
  })
  .select("id, category")
  .single();
ok(!newsError, "A news-category post can be created", newsError?.message ?? "");
if (newsRow) created.postIds.push(newsRow.id);

const { data: badCategory, error: badCategoryError } = await service
  .from("posts")
  .insert({
    title: "Bad category probe",
    slug: `${PREFIX}badcat-${stamp}`,
    excerpt: "probe",
    content: "probe",
    author_id: authorId,
    category: "archive",
  })
  .select("id");
if (badCategory?.[0]) created.postIds.push(badCategory[0].id);
ok(Boolean(badCategoryError), "An unknown category is refused", badCategoryError?.code ?? "");

/* ==========================================================================
   3. Negative assertions — what anonymous callers cannot do
   ========================================================================== */

section("3. Anonymous access is bounded by RLS");

const { data: anonDraft } = await anon.from("posts").select("id").eq("id", inserted.id);
ok(
  (anonDraft ?? []).length === 0,
  "Anonymous PostgREST CANNOT read a draft row",
  "the key security property",
);

const { data: anonAll } = await anon.from("posts").select("id, status");
ok(
  (anonAll ?? []).every((row) => row.status === "published"),
  "Anonymous reads return only published rows",
  `${(anonAll ?? []).length} row(s) visible`,
);

const { error: anonInsertError } = await anon.from("posts").insert({
  title: "Anonymous should not be able to do this",
  slug: `${PREFIX}anon-insert-${stamp}`,
  excerpt: "x",
  content: "x",
  author_id: authorId,
});
ok(Boolean(anonInsertError), "Anonymous CANNOT insert a post", anonInsertError?.code ?? "");

const { error: anonUpdateError, count: anonUpdateCount } = await anon
  .from("posts")
  .update({ status: "published", published_at: new Date().toISOString() })
  .eq("id", inserted.id);
ok(
  Boolean(anonUpdateError) || anonUpdateCount === 0 || anonUpdateCount === null,
  "Anonymous CANNOT publish a draft",
  anonUpdateError?.code ?? "no rows matched",
);

// Confirm the update really did not land, regardless of what the API reported.
const { data: stillDraft } = await service
  .from("posts")
  .select("status")
  .eq("id", inserted.id)
  .single();
ok(stillDraft?.status === "draft", "The draft is still a draft after the anon attempt");

const { data: anonProfiles } = await anon.from("profiles").select("id");
ok((anonProfiles ?? []).length === 0, "Anonymous CANNOT read profiles");

const { error: anonUploadError } = await anon.storage
  .from("blog-images")
  .upload(`covers/${PREFIX}${stamp}.png`, new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
    contentType: "image/png",
  });
ok(Boolean(anonUploadError), "Anonymous CANNOT upload to blog-images");

/* ==========================================================================
   4. Constraints the database enforces regardless of the application
   ========================================================================== */

section("4. CHECK constraints reject bad rows at the database");

const badRows = [
  [
    "A cover image with no alt text",
    { cover_image_url: "https://example.com/a.png", cover_image_alt: null },
  ],
  ["A published row with no timestamp", { status: "published", published_at: null }],
  ["An invalid slug format", { slug: "Not A Valid Slug" }],
  ["An empty body", { content: "   " }],
  ["A 161-character title", { title: "x".repeat(161) }],
  ["A 61-character SEO title", { seo_title: "x".repeat(61) }],
  ["An unknown status", { status: "archived" }],
  ["An unknown source", { source: "robot" }],
];

for (const [name, override] of badRows) {
  const row = {
    title: "Constraint probe",
    slug: `${PREFIX}probe-${stamp}-${Math.abs(hash(name))}`,
    excerpt: "probe",
    content: "probe",
    author_id: authorId,
    ...override,
  };
  const { data, error } = await service.from("posts").insert(row).select("id");
  if (data?.[0]) created.postIds.push(data[0].id);
  ok(Boolean(error), `${name} is refused`, error?.code ?? "IT WAS ACCEPTED");
}

const { error: dupError, data: dupData } = await service
  .from("posts")
  .insert({
    title: "Duplicate slug probe",
    slug: draftSlug,
    excerpt: "probe",
    content: "probe",
    author_id: authorId,
  })
  .select("id");
if (dupData?.[0]) created.postIds.push(dupData[0].id);
ok(dupError?.code === "23505", "A duplicate slug is refused as a unique violation", dupError?.code);

/* ==========================================================================
   5. Publishing, and the future-dated case
   ========================================================================== */

section("5. Publishing");

const firstPublishAt = new Date().toISOString();
const { error: publishError } = await service
  .from("posts")
  .update({ status: "published", published_at: firstPublishAt })
  .eq("id", inserted.id);
ok(!publishError, "Publishing the draft succeeds", publishError?.message ?? "");

const { data: anonPublished } = await anon
  .from("posts")
  .select("id, slug, status")
  .eq("id", inserted.id);
ok((anonPublished ?? []).length === 1, "Anonymous CAN now read the published row");

// published_at survives an unpublish, so republishing does not re-date the post.
await service.from("posts").update({ status: "draft" }).eq("id", inserted.id);
const { data: unpublished } = await service
  .from("posts")
  .select("published_at")
  .eq("id", inserted.id)
  .single();
ok(
  unpublished?.published_at === firstPublishAt,
  "Unpublishing KEEPS the original publication date",
);
await service
  .from("posts")
  .update({ status: "published", published_at: firstPublishAt })
  .eq("id", inserted.id);

const { data: hidden, error: futureError } = await service
  .from("posts")
  .insert({
    title: "Contract check — a future-dated post",
    slug: futureSlug,
    excerpt: "Scheduled, so it must be invisible to the public.",
    content: "Not visible yet.",
    author_id: authorId,
    status: "published",
    published_at: new Date(Date.now() + 86_400_000).toISOString(),
    source: "human",
  })
  .select("id")
  .single();
ok(!futureError, "A future-dated published row can be created", futureError?.message ?? "");
if (hidden) created.postIds.push(hidden.id);

if (hidden) {
  const { data: anonFuture } = await anon.from("posts").select("id").eq("id", hidden.id);
  ok(
    (anonFuture ?? []).length === 0,
    "Anonymous CANNOT read a future-dated post",
    "published_at <= now() is enforced in RLS",
  );
}

/* ==========================================================================
   5b. Newsletters
   ========================================================================== */

section("5b. Newsletter issues");

const { data: issue, error: issueError } = await service
  .from("newsletters")
  .insert({
    title: "Contract check — issue 00",
    slug: `${PREFIX}issue-${stamp}`,
    description: "A published issue, to prove the public can read it.",
    external_url: "https://example.org/issue-00",
    issue_date: "2026-01-15",
    status: "published",
  })
  .select("id")
  .single();
ok(!issueError, "A published newsletter issue can be created", issueError?.message ?? "");
if (issue) created.newsletterIds.push(issue.id);

const { data: draftIssue } = await service
  .from("newsletters")
  .insert({
    title: "Contract check — unpublished issue",
    slug: `${PREFIX}issue-draft-${stamp}`,
    description: "A draft issue, which the public must not see.",
    external_url: "https://example.org/draft",
    issue_date: "2026-02-15",
    status: "draft",
  })
  .select("id")
  .single();
if (draftIssue) created.newsletterIds.push(draftIssue.id);

const { data: anonIssues } = await anon.from("newsletters").select("id, status");
ok(
  (anonIssues ?? []).every((row) => row.status === "published"),
  "Anonymous reads only published issues",
  `${(anonIssues ?? []).length} visible`,
);
if (draftIssue) {
  const { data: leaked } = await anon.from("newsletters").select("id").eq("id", draftIssue.id);
  ok((leaked ?? []).length === 0, "Anonymous CANNOT read a draft issue");
}

const { error: anonIssueInsert } = await anon.from("newsletters").insert({
  title: "Anonymous should not manage issues",
  slug: `${PREFIX}anon-issue-${stamp}`,
  description: "x",
  external_url: "https://example.org/x",
  issue_date: "2026-03-01",
});
ok(Boolean(anonIssueInsert), "Anonymous CANNOT insert an issue", anonIssueInsert?.code ?? "");

// `external_url` is rendered straight into an href, so the database refuses
// anything that is not https — a `javascript:` URL here would be a stored XSS.
for (const [name, url] of [
  ["a javascript: URL", "javascript:alert(1)"],
  ["a plain http:// URL", "http://example.org/insecure"],
  ["a bare string", "not-a-url"],
  ["a data: URL", "data:text/html,<script>alert(1)</script>"],
]) {
  const { data, error } = await service
    .from("newsletters")
    .insert({
      title: "URL probe",
      slug: `${PREFIX}url-${stamp}-${Math.abs(hash(name))}`,
      description: "probe",
      external_url: url,
      issue_date: "2026-01-01",
    })
    .select("id");
  if (data?.[0]) created.newsletterIds.push(data[0].id);
  ok(Boolean(error), `external_url refuses ${name}`, error?.code ?? "IT WAS ACCEPTED");
}

const { data: badAlt, error: badAltError } = await service
  .from("newsletters")
  .insert({
    title: "Issue cover alt probe",
    slug: `${PREFIX}issuealt-${stamp}`,
    description: "probe",
    external_url: "https://example.org/x",
    issue_date: "2026-01-01",
    cover_image_url: "https://example.com/a.png",
    cover_image_alt: null,
  })
  .select("id");
if (badAlt?.[0]) created.newsletterIds.push(badAlt[0].id);
ok(Boolean(badAltError), "An issue cover with no alt text is refused", badAltError?.code ?? "");

/* ==========================================================================
   6. HTTP surface (optional)
   ========================================================================== */

if (!baseUrl) {
  section("6. HTTP surface");
  console.log(
    "  SKIPPED — pass --base-url http://localhost:3000 with `npm run dev` running.",
  );
} else {
  section(`6. HTTP surface at ${baseUrl}`);

  const get = async (path) => {
    const res = await fetch(`${baseUrl}${path}`, { redirect: "follow" });
    return { status: res.status, body: await res.text() };
  };

  try {
    const draftUrl = `/blog/${draftSlug}`;

    // Currently published, so it should be 200 and carry one canonical.
    const live = await get(draftUrl);
    ok(live.status === 200, `${draftUrl} returns 200 while published`, String(live.status));

    const canonicals = [...live.body.matchAll(/<link rel="canonical"[^>]*>/g)];
    ok(canonicals.length === 1, "Exactly one canonical tag", `${canonicals.length} found`);
    ok(
      canonicals[0]?.[0]?.includes(`/blog/${draftSlug}`),
      "The canonical points at this post's absolute URL",
      canonicals[0]?.[0] ?? "",
    );
    ok(
      /<script type="application\/ld\+json">/.test(live.body),
      "BlogPosting JSON-LD is present",
    );
    ok(!/<\/script>\s*<\/script>/.test(live.body), "JSON-LD did not break out of its script tag");

    const index = await get("/blog");
    ok(index.status === 200, "/blog returns 200");
    ok(index.body.includes(draftSlug), "The published post appears on /blog");

    /**
     * The two sections must not leak into each other's URLs. Slugs are unique
     * across the whole table, so a news item cannot collide with a blog post — but
     * without a category filter in the query it would still *resolve* under
     * /blog/, giving one piece of writing two addresses and two canonicals.
     */
    const newsAtNews = await get(`/news/${newsSlug}`);
    ok(newsAtNews.status === 200, `/news/${newsSlug} returns 200`, String(newsAtNews.status));

    const newsAtBlog = await get(`/blog/${newsSlug}`);
    ok(
      newsAtBlog.status === 404,
      "A news item 404s under /blog/ rather than resolving twice",
      String(newsAtBlog.status),
    );

    const blogAtNews = await get(`/news/${draftSlug}`);
    ok(
      blogAtNews.status === 404,
      "A blog post 404s under /news/",
      String(blogAtNews.status),
    );

    const newsIndex = await get("/news");
    ok(newsIndex.status === 200, "/news returns 200");
    ok(newsIndex.body.includes(newsSlug), "The news item appears on /news");
    ok(!newsIndex.body.includes(draftSlug), "A blog post does NOT appear on /news");
    ok(!index.body.includes(newsSlug), "A news item does NOT appear on /blog");

    const sitemap = await get("/sitemap.xml");
    ok(sitemap.status === 200, "/sitemap.xml returns 200");
    ok(sitemap.body.includes(`/blog/${draftSlug}`), "The published post is in sitemap.xml");
    ok(sitemap.body.includes(`/news/${newsSlug}`), "The news item is in sitemap.xml");
    ok(!futureSlug || !sitemap.body.includes(futureSlug), "The future-dated post is NOT in sitemap.xml");
    ok(!sitemap.body.includes("/admin"), "No admin route is in sitemap.xml");
    // Issues are links to documents on another origin, so there is no page here
    // for a crawler to index.
    ok(
      !sitemap.body.includes(`${PREFIX}issue-`),
      "Newsletter issues are NOT in sitemap.xml",
    );

    const robots = await get("/robots.txt");
    ok(robots.status === 200, "/robots.txt returns 200");
    ok(/Disallow/.test(robots.body), "robots.txt has a Disallow rule");

    // Now unpublish and confirm the same URL becomes a genuine 404.
    await service.from("posts").update({ status: "draft" }).eq("id", inserted.id);
    const asDraft = await get(draftUrl);
    ok(
      asDraft.status === 404,
      `${draftUrl} returns a genuine 404 as a draft`,
      String(asDraft.status),
    );

    if (hidden) {
      const future = await get(`/blog/${futureSlug}`);
      ok(future.status === 404, "A future-dated post returns 404", String(future.status));
    }

    const admin = await get("/admin");
    ok(
      admin.status === 200 && /sign in|Sign in|awaiting|not connected/i.test(admin.body),
      "/admin does not render the console to an anonymous visitor",
      String(admin.status),
    );
    ok(
      /noindex/.test(admin.body),
      "/admin carries a noindex robots directive",
    );
  } catch (error) {
    ok(false, "HTTP checks could not run", error.message);
    console.log("  Is the dev server running at that address?");
  }
}

/* ------------------------------------------------------------------- wrap up */

await cleanup();

console.log(
  `\n${checks - failures}/${checks} checks passed.` +
    (failures === 0
      ? "\nThe wire contract holds and RLS is enforcing the boundaries.\n"
      : `\n${failures} FAILED — see above.\n`),
);
process.exit(failures === 0 ? 0 : 1);

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return h;
}
