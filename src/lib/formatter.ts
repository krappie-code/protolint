/**
 * Proto file formatter — fixes indentation, bracket placement,
 * extra blank lines, trailing whitespace, and spacing.
 */

const BLOCK_OPENERS = /^(message|enum|service|oneof|extend)\s+/;
const RPC_WITH_BODY = /^rpc\s+.*\{$/;

export function format(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let depth = 0;
  let prevWasBlank = false;
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Strip trailing whitespace
    line = line.trimEnd();
    const trimmed = line.trim();

    // Track block comments
    if (inBlockComment) {
      result.push(indent(depth) + trimmed);
      if (trimmed.includes("*/")) inBlockComment = false;
      prevWasBlank = false;
      continue;
    }
    if (trimmed.startsWith("/*")) {
      inBlockComment = !trimmed.includes("*/");
      result.push(indent(depth) + trimmed);
      prevWasBlank = false;
      continue;
    }

    // Collapse multiple blank lines into one
    if (!trimmed) {
      if (!prevWasBlank && result.length > 0) {
        result.push("");
      }
      prevWasBlank = true;
      continue;
    }
    prevWasBlank = false;

    // Handle closing brace (decrease depth before printing)
    if (trimmed === "}" || trimmed === "};") {
      depth = Math.max(0, depth - 1);
      result.push(indent(depth) + trimmed);
      continue;
    }

    // Handle lines that have both opening content and closing brace on same line
    // e.g., "option java_package = "com.example";"
    // But NOT lines like "message Foo {" which open a block

    // Check if this line opens a block: "message Foo {", "enum Bar {", etc.
    const opensBlock = (BLOCK_OPENERS.test(trimmed) && trimmed.endsWith("{")) ||
                       RPC_WITH_BODY.test(trimmed);

    // Handle case where opening brace is on next line — merge it
    if (BLOCK_OPENERS.test(trimmed) && !trimmed.includes("{")) {
      // Peek ahead for a lone opening brace
      let nextIdx = i + 1;
      while (nextIdx < lines.length && !lines[nextIdx].trim()) nextIdx++;
      if (nextIdx < lines.length && lines[nextIdx].trim() === "{") {
        // Merge: put opening brace on same line
        result.push(indent(depth) + trimmed + " {");
        depth++;
        i = nextIdx; // skip the brace line
        continue;
      }
    }

    // Format field declarations: normalize spacing around "="
    let formatted = trimmed;
    if (/^(?:optional\s+|repeated\s+|required\s+)?(?:map<[^>]+>|\w+(?:\.\w+)*)\s+\w+\s*=\s*\d+/.test(trimmed)) {
      // Normalize field: type name = number;
      formatted = trimmed
        .replace(/\s*=\s*/, " = ")
        .replace(/\s+;/, ";");
    }

    // Format enum values: normalize spacing
    if (/^\w+\s*=\s*-?\d+\s*;/.test(trimmed)) {
      formatted = trimmed
        .replace(/\s*=\s*/, " = ")
        .replace(/\s+;/, ";");
    }

    // Format rpc declarations: normalize spacing
    if (trimmed.startsWith("rpc ")) {
      formatted = formatted
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .replace(/\)\s+returns\s+\(/, ") returns (")
        .replace(/\s+;/, ";");
    }

    // Format import/package/syntax: ensure single space
    if (/^(syntax|package|import|option)\s+/.test(formatted)) {
      formatted = formatted.replace(/\s+/, " ");
    }

    // Normalize spacing in block declarations: message, enum, service, oneof, extend
    if (BLOCK_OPENERS.test(formatted)) {
      formatted = formatted.replace(/^(message|enum|service|oneof|extend)\s+/, "$1 ");
      // Also normalize space before opening brace
      formatted = formatted.replace(/\s+\{$/, " {");
    }

    result.push(indent(depth) + formatted);

    // Increase depth if this line opens a block
    if (opensBlock || (trimmed.endsWith("{") && !trimmed.startsWith("//"))) {
      depth++;
    }
  }

  // Remove trailing blank lines, ensure single trailing newline
  while (result.length > 0 && result[result.length - 1] === "") {
    result.pop();
  }
  result.push(""); // trailing newline

  return result.join("\n");
}

function indent(depth: number): string {
  return "  ".repeat(depth);
}
