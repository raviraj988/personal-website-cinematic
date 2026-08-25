/**
 * Which OAuth scope each tool needs.
 *
 * Only the remote HTTP transport consults this. `mcp/server.ts` spawns on stdio
 * for a client that is already trusted by virtue of being able to spawn a local
 * process, so it registers everything and never passes an allowlist.
 *
 * ## Why this module has no imports
 *
 * It is pure data plus one pure function, so both halves of the system can share
 * it: `mcp/tools.ts` (plain TypeScript, run by Node directly) and
 * `src/lib/mcp-auth/config.ts` (inside Next). Importing anything from `src/lib`
 * here would drag a Next-shaped dependency into the stdio server, and importing
 * from `mcp/` into the OAuth consent screen would drag the Supabase adapter into
 * a page render. Keeping it dependency-free is what lets one definition serve
 * both, so the consent screen cannot promise a scope the tool layer does not
 * honour.
 *
 * The scope split is read/write, not per tool. Per-tool scopes would produce a
 * consent screen no human reads, and the only decision that actually matters is
 * whether a client may create content at all.
 */

export const MCP_SCOPES = {
  read: "blog:read",
  draft: "blog:draft",
} as const;

export type McpScope = (typeof MCP_SCOPES)[keyof typeof MCP_SCOPES];

export const SUPPORTED_MCP_SCOPES: readonly McpScope[] = [
  MCP_SCOPES.read,
  MCP_SCOPES.draft,
];

/**
 * The minimum scope each tool requires.
 *
 * Every key must be one of `TOOL_NAMES` in `mcp/tools.ts`, and every name there
 * must appear here — `scripts/test-mcp-scopes.mjs` asserts both directions, so a
 * tool added without a scope decision fails a suite instead of silently
 * defaulting to reachable.
 */
export const TOOL_SCOPE: Readonly<Record<string, McpScope>> = {
  get_writing_guide: MCP_SCOPES.read,
  list_posts: MCP_SCOPES.read,
  check_slug: MCP_SCOPES.read,
  get_link_targets: MCP_SCOPES.read,
  suggest_internal_links: MCP_SCOPES.read,
  check_seo: MCP_SCOPES.read,
  generate_cover_image: MCP_SCOPES.draft,
  create_draft: MCP_SCOPES.draft,
};

export function isMcpScope(value: string): value is McpScope {
  return (SUPPORTED_MCP_SCOPES as readonly string[]).includes(value);
}

/**
 * The tools a token holding `scopes` may call.
 *
 * **`blog:draft` implies `blog:read`.** Drafting well requires the read tools —
 * the writing guide, the slug check, the SEO report — so a draft-only grant that
 * could not call them would be a grant that cannot do the one thing it names.
 * Treating the two scopes as strictly disjoint made `blog:draft` alone useless in
 * practice, and a human ticking "create drafts" plainly means to allow the
 * reading a draft depends on.
 *
 * The reverse does not hold: `blog:read` never reaches `create_draft`.
 *
 * An unrecognised scope contributes nothing rather than throwing. The consent
 * screen and the token endpoint both narrow to supported scopes before anything
 * is stored, so a stray value here means a client sent something odd, not that
 * the server is misconfigured.
 */
export function toolsForScopes(scopes: readonly string[]): Set<string> {
  const granted = new Set(scopes.filter(isMcpScope));
  const mayDraft = granted.has(MCP_SCOPES.draft);
  const mayRead = mayDraft || granted.has(MCP_SCOPES.read);

  const allowed = new Set<string>();
  for (const [tool, required] of Object.entries(TOOL_SCOPE)) {
    if (required === MCP_SCOPES.read && mayRead) allowed.add(tool);
    if (required === MCP_SCOPES.draft && mayDraft) allowed.add(tool);
  }
  return allowed;
}
