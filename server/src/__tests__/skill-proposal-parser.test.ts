import { describe, expect, it } from "vitest";
import { extractSkillProposalsFromText } from "../services/skill-proposal-parser.js";

describe("extractSkillProposalsFromText", () => {
  it("returns empty array for text with no proposals", () => {
    expect(extractSkillProposalsFromText("No proposals here.")).toEqual([]);
  });

  it("parses XML-style skill_proposal block", () => {
    const text = `
Some output.
<skill_proposal name="my-skill" description="Does something useful">
---
name: my-skill
description: Does something useful
---
# My Skill
Use this skill to do things.
</skill_proposal>
More output.
`;
    const proposals = extractSkillProposalsFromText(text);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].name).toBe("my-skill");
    expect(proposals[0].slug).toBe("my-skill");
    expect(proposals[0].description).toBe("Does something useful");
    expect(proposals[0].markdown).toContain("My Skill");
  });

  it("parses fenced ```skill block", () => {
    const text = `
Result here.
\`\`\`skill
---
name: deploy-helper
description: Helps deploy the app
---
# Deploy Helper
Run this to deploy.
\`\`\`
End.
`;
    const proposals = extractSkillProposalsFromText(text);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].name).toBe("deploy-helper");
    expect(proposals[0].slug).toBe("deploy-helper");
  });

  it("deduplicates proposals by slug", () => {
    const text = `
<skill_proposal name="my-skill">
---
name: my-skill
---
Content A
</skill_proposal>
\`\`\`skill
---
name: my-skill
---
Content B
\`\`\`
`;
    const proposals = extractSkillProposalsFromText(text);
    expect(proposals).toHaveLength(1);
  });

  it("normalizes slug to lowercase hyphenated form", () => {
    const text = `
<skill_proposal name="My Cool Skill">
---
name: My Cool Skill
---
# Body
</skill_proposal>
`;
    const proposals = extractSkillProposalsFromText(text);
    expect(proposals[0].slug).toBe("my-cool-skill");
  });

  it("falls back to attr name when frontmatter has no name", () => {
    const text = `<skill_proposal name="fallback-skill">
# Just a body with no frontmatter
</skill_proposal>`;
    const proposals = extractSkillProposalsFromText(text);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].name).toBe("fallback-skill");
  });
});
