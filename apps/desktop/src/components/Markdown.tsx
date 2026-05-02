import React from "react";

/** Lightweight markdown → React renderer (no external deps). */

type Token =
  | { t: "heading"; level: 1 | 2 | 3; text: string }
  | { t: "rule" }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "codeblock"; lang: string; code: string }
  | { t: "para"; text: string };

function tokenize(md: string): Token[] {
  const lines = md.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      tokens.push({ t: "codeblock", lang, code: codeLines.join("\n") });
      i++;
      continue;
    }

    // Heading
    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      tokens.push({ t: "heading", level: hm[1].length as 1 | 2 | 3, text: hm[2] });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      tokens.push({ t: "rule" });
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      tokens.push({ t: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      tokens.push({ t: "ol", items });
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: accumulate consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-*_]{3,}\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      tokens.push({ t: "para", text: paraLines.join(" ") });
    }
  }
  return tokens;
}

/** Render inline spans: bold, italic, code, links */
function renderInline(text: string, key: string): React.ReactNode {
  // Split on bold / italic / inline-code patterns
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
  return (
    <React.Fragment key={key}>
      {parts.map((p, pi) => {
        if (p.startsWith("**") || p.startsWith("__")) {
          const inner = p.slice(2, -2);
          return <strong key={pi}>{inner}</strong>;
        }
        if (p.startsWith("`")) {
          const inner = p.slice(1, -1);
          return (
            <code key={pi} style={{
              fontFamily: "monospace",
              fontSize: "0.88em",
              background: "var(--bg-3, rgba(255,255,255,0.07))",
              borderRadius: 3,
              padding: "1px 5px",
              color: "var(--fg-1)",
            }}>
              {inner}
            </code>
          );
        }
        if (p.startsWith("*") || p.startsWith("_")) {
          const inner = p.slice(1, -1);
          return <em key={pi}>{inner}</em>;
        }
        return p;
      })}
    </React.Fragment>
  );
}

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  const tokens = tokenize(children || "");

  return (
    <div className={`md-body${className ? ` ${className}` : ""}`} style={{ fontSize: 13, color: "var(--fg-1)", lineHeight: 1.65 }}>
      {tokens.map((tok, idx) => {
        switch (tok.t) {
          case "heading": {
            const sizes: Record<number, string> = { 1: "15px", 2: "13.5px", 3: "13px" };
            const weights: Record<number, number> = { 1: 700, 2: 600, 3: 600 };
            return (
              <div key={idx} style={{
                fontSize: sizes[tok.level],
                fontWeight: weights[tok.level],
                color: "var(--fg-0)",
                marginTop: tok.level === 1 ? "16px" : "12px",
                marginBottom: 4,
              }}>
                {renderInline(tok.text, `h${idx}`)}
              </div>
            );
          }
          case "rule":
            return <hr key={idx} style={{ border: "none", borderTop: "1px solid var(--border-1)", margin: "12px 0" }} />;

          case "ul":
            return (
              <ul key={idx} style={{ margin: "6px 0 6px 16px", padding: 0, listStyle: "disc" }}>
                {tok.items.map((item, ii) => (
                  <li key={ii} style={{ marginBottom: 2 }}>{renderInline(item, `ul-${idx}-${ii}`)}</li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={idx} style={{ margin: "6px 0 6px 16px", padding: 0, listStyle: "decimal" }}>
                {tok.items.map((item, ii) => (
                  <li key={ii} style={{ marginBottom: 2 }}>{renderInline(item, `ol-${idx}-${ii}`)}</li>
                ))}
              </ol>
            );

          case "codeblock":
            return (
              <pre key={idx} style={{
                background: "var(--bg-3, rgba(255,255,255,0.05))",
                border: "1px solid var(--border-1)",
                borderRadius: 5,
                padding: "8px 10px",
                margin: "8px 0",
                overflowX: "auto",
                fontSize: 12,
                fontFamily: "monospace",
                color: "var(--fg-1)",
                lineHeight: 1.5,
              }}>
                <code>{tok.code}</code>
              </pre>
            );

          case "para":
            return (
              <p key={idx} style={{ margin: "6px 0" }}>
                {renderInline(tok.text, `p${idx}`)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
