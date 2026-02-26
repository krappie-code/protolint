/**
 * Proto file formatter — fixes indentation, bracket placement,
 * blank lines, trailing whitespace, and spacing.
 * 
 * Blank line rules:
 * - One blank line between sections (syntax, package, imports, declarations)
 * - No blank lines inside blocks (messages, enums, services)
 * - Imports grouped together (no blank lines between them)
 * - Comments attached to the next declaration (no blank line between comment and declaration)
 */

const BLOCK_OPENERS = /^(message|enum|service|oneof|extend)\s+/;
const RPC_WITH_BODY = /^rpc\s+.*\{$/;

export function format(content: string): string {
  // Pre-process: split lines where closing braces follow semicolons
  // e.g. "field = 5; }" → "field = 5;" and "}"
  const rawLines = content.split("\n");
  const lines: string[] = [];
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    // Split "something; }" or "something;}" into two lines
    const splitMatch = trimmed.match(/^(.+;\s*)(}\s*)$/);
    if (splitMatch && !trimmed.startsWith("//")) {
      lines.push(splitMatch[1].trim());
      lines.push(splitMatch[2].trim());
    } else {
      lines.push(raw);
    }
  }

  const formatted: { text: string; depth: number; type: string }[] = [];
  let depth = 0;
  let inBlockComment = false;

  // First pass: normalize each line and track depth
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();
    const trimmed = line.trim();

    // Track block comments
    if (inBlockComment) {
      formatted.push({ text: trimmed, depth, type: "comment" });
      if (trimmed.includes("*/")) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      inBlockComment = !trimmed.includes("*/");
      formatted.push({ text: trimmed, depth, type: "comment" });
      continue;
    }

    // Skip blank lines (we'll insert them intelligently later)
    if (!trimmed) continue;

    // Handle closing brace
    if (trimmed === "}" || trimmed === "};") {
      depth = Math.max(0, depth - 1);
      formatted.push({ text: trimmed, depth, type: "close" });
      continue;
    }

    // Classify and normalize the line
    let text = trimmed;
    let type = "other";

    if (/^syntax\s+/.test(text)) {
      type = "syntax";
      text = text.replace(/\s+/, " ");
    } else if (/^package\s+/.test(text)) {
      type = "package";
      text = text.replace(/\s+/, " ");
    } else if (/^import\s+/.test(text)) {
      type = "import";
      text = text.replace(/\s+/, " ");
    } else if (/^option\s+/.test(text)) {
      type = "option";
      text = text.replace(/\s+/, " ");
    } else if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      type = "comment";
    } else if (BLOCK_OPENERS.test(text)) {
      type = "block";
      // Normalize spacing in declaration
      text = text.replace(/^(message|enum|service|oneof|extend)\s+/, "$1 ");
      text = text.replace(/\s+\{$/, " {");
    } else if (text.startsWith("rpc ")) {
      type = "rpc";
      text = text
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\)\s+returns\s+\(/, ") returns (")
        .replace(/\s+;/, ";");
    } else if (/^(?:optional\s+|repeated\s+|required\s+)?(?:map<[^>]+>|\w+(?:\.\w+)*)\s+\w+\s*=/.test(text)) {
      type = "field";
      text = text.replace(/\s*=\s*/, " = ").replace(/\s+;/, ";");
    } else if (/^\w+\s*=\s*-?\d+\s*;/.test(text)) {
      type = "enumval";
      text = text.replace(/\s*=\s*/, " = ").replace(/\s+;/, ";");
    } else if (/^reserved\s+/.test(text)) {
      type = "reserved";
    }

    // Handle block opener merging (brace on next line)
    if (BLOCK_OPENERS.test(text) && !text.includes("{")) {
      let nextIdx = i + 1;
      while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
      if (nextIdx < lines.length && lines[nextIdx].trim() === "{") {
        text = text + " {";
        i = nextIdx;
      }
    }

    formatted.push({ text, depth, type });

    // Track depth increases
    const opensBlock = (BLOCK_OPENERS.test(trimmed) && text.endsWith("{")) ||
                       RPC_WITH_BODY.test(text) ||
                       (text.endsWith("{") && !text.startsWith("//"));
    if (opensBlock) {
      depth++;
    }
  }

  // Second pass: insert blank lines intelligently
  const result: string[] = [];
  const indent = (d: number) => "  ".repeat(d);

  for (let i = 0; i < formatted.length; i++) {
    const curr = formatted[i];
    const prev = i > 0 ? formatted[i - 1] : null;

    if (prev) {
      const needsBlankLine = shouldInsertBlankLine(prev, curr);
      if (needsBlankLine) {
        result.push("");
      }
    }

    result.push(indent(curr.depth) + curr.text);
  }

  // Ensure single trailing newline
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }
  result.push("");

  return result.join("\n");
}

/**
 * Determine if a blank line should be inserted between two formatted lines.
 */
function shouldInsertBlankLine(
  prev: { text: string; depth: number; type: string },
  curr: { text: string; depth: number; type: string }
): boolean {
  // Never blank lines at depth > 0 between regular content (inside blocks)
  // Exception: before a nested block definition or between comment+block at depth > 0
  
  // After closing brace, always add blank line (unless next is another close)
  if (prev.type === "close" && curr.type !== "close") {
    return true;
  }

  // Between different top-level sections
  if (prev.depth === 0 && curr.depth === 0) {
    // syntax → package: blank line
    if (prev.type === "syntax" && curr.type !== "syntax") return true;
    // package → anything else: blank line
    if (prev.type === "package" && curr.type !== "package") return true;
    // last import → non-import: blank line
    if (prev.type === "import" && curr.type !== "import") return true;
    // option → non-option (unless another option): blank line  
    if (prev.type === "option" && curr.type !== "option") return true;
    // before a block declaration (unless preceded by its comment)
    if (curr.type === "block" && prev.type !== "comment") return true;
    // before a comment that precedes a block
    if (curr.type === "comment" && prev.type !== "comment" && 
        prev.type !== "syntax" && prev.type !== "package" && 
        prev.type !== "import" && prev.type !== "option") return true;
  }

  // Inside blocks: no blank lines between fields, enum values, rpcs
  if (curr.depth > 0) {
    // Allow blank line before a comment inside a block (for readability between groups)
    // but not between consecutive fields/values
    return false;
  }

  return false;
}
