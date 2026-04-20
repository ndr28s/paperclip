/**
 * Parses skill proposals from agent output text.
 *
 * Agents emit proposals in one of two formats:
 *
 * 1. XML tags (preferred):
 *    <skill_proposal name="slug" description="short desc">
 *    ---
 *    name: slug
 *    description: short desc
 *    ---
 *    # Slug
 *    ...content...
 *    </skill_proposal>
 *
 * 2. Fenced code block with `skill` language:
 *    ```skill
 *    ---
 *    name: slug
 *    description: short desc
 *    ---
 *    # Slug
 *    ...content...
 *    ```
 *
 * The name attribute / frontmatter key is used as slug.
 */

export interface SkillProposalInput {
  name: string;
  slug?: string | null;
  description?: string | null;
  markdown?: string | null;
}

const XML_PROPOSAL_RE = /<skill_proposal([^>]*)>([\s\S]*?)<\/skill_proposal>/gi;
const FENCED_PROPOSAL_RE = /```skill\n([\s\S]*?)```/gi;
const ATTR_NAME_RE = /\bname=["']([^"']+)["']/i;
const ATTR_DESC_RE = /\bdescription=["']([^"']+)["']/i;

function parseFrontmatter(text: string): { name: string | null; description: string | null; body: string } {
  const trimmed = text.trim();
  if (!trimmed.startsWith("---")) {
    return { name: null, description: null, body: trimmed };
  }
  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { name: null, description: null, body: trimmed };
  }
  const fm = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).trim();
  let name: string | null = null;
  let description: string | null = null;
  for (const line of fm.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();
    if (!val) continue;
    if (key === "name") name = val;
    else if (key === "description") description = val;
  }
  return { name, description, body };
}

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "skill";
}

function toProposal(attrStr: string, content: string): SkillProposalInput | null {
  const fm = parseFrontmatter(content);
  const attrName = ATTR_NAME_RE.exec(attrStr)?.[1]?.trim() ?? null;
  const attrDesc = ATTR_DESC_RE.exec(attrStr)?.[1]?.trim() ?? null;

  const name = fm.name ?? attrName;
  if (!name) return null;

  const description = fm.description ?? attrDesc ?? null;
  const slug = normalizeSlug(name);

  const markdown = content.trim().startsWith("---")
    ? content.trim()
    : [
        "---",
        `name: ${name}`,
        ...(description ? [`description: ${description}`] : []),
        "---",
        "",
        fm.body,
      ].join("\n");

  return { name, slug, description, markdown };
}

export function extractSkillProposalsFromText(text: string): SkillProposalInput[] {
  const proposals: SkillProposalInput[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(XML_PROPOSAL_RE)) {
    const proposal = toProposal(match[1] ?? "", match[2] ?? "");
    if (proposal && !seen.has(proposal.slug ?? proposal.name)) {
      seen.add(proposal.slug ?? proposal.name);
      proposals.push(proposal);
    }
  }

  for (const match of text.matchAll(FENCED_PROPOSAL_RE)) {
    const proposal = toProposal("", match[1] ?? "");
    if (proposal && !seen.has(proposal.slug ?? proposal.name)) {
      seen.add(proposal.slug ?? proposal.name);
      proposals.push(proposal);
    }
  }

  return proposals;
}
