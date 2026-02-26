export type Severity = "error" | "warning" | "info";

export interface Issue {
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: Severity;
}

export interface ValidationResult {
  valid: boolean;
  errors: Issue[];
  warnings: Issue[];
  info: Issue[];
}

function issue(
  line: number,
  column: number,
  rule: string,
  message: string,
  severity: Severity
): Issue {
  return { line, column, rule, message, severity };
}

const PASCAL_RE = /^[A-Z][A-Za-z0-9]*$/;
const SNAKE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const UPPER_SNAKE_RE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;

/**
 * Parse proto syntax and catch structural errors like missing field numbers,
 * unclosed braces, malformed declarations, etc.
 */
function validateSyntax(lines: string[]): Issue[] {
  const issues: Issue[] = [];
  let braceStack: { type: string; name: string; line: number }[] = [];
  let expectingBody = false;
  let expectingType = "";
  let expectingName = "";
  let expectingLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      continue;
    }

    // Remove inline comments
    const code = trimmed.replace(/\/\/.*$/, "").trim();
    if (!code) continue;

    // Track braces
    const openCount = (code.match(/{/g) || []).length;
    const closeCount = (code.match(/}/g) || []).length;

    // Check for field declarations inside messages (must have = fieldNumber;)
    const currentContext = braceStack.length > 0 ? braceStack[braceStack.length - 1].type : "";

    if (currentContext === "message" || currentContext === "oneof") {
      // Field pattern: type name = number;
      // Also valid: reserved, option, oneof, message, enum, map, extensions
      const isNestedDef = /^(message|enum|oneof|reserved|option|extensions|map<)/.test(code);
      const isClosingBrace = code === "}" || code === "};";
      const isFieldDecl = /^(?:optional\s+|repeated\s+|required\s+)?(?:map<[^>]+>|\w+(?:\.\w+)*)\s+\w+/.test(code);

      if (isFieldDecl && !isNestedDef && !isClosingBrace) {
        // Must have = number; (with semicolon)
        if (!/=\s*\d+\s*;/.test(code) && !/=\s*\d+\s*\[/.test(code)) {
          if (/=\s*\d+\s*$/.test(code)) {
            // Has field number but missing semicolon
            issues.push(
              issue(lineNum, 1, "syntax-error", `Field declaration is missing a trailing semicolon.`, "error")
            );
          } else {
            issues.push(
              issue(lineNum, 1, "syntax-error", `Field declaration is missing a valid field number.`, "error")
            );
          }
        }
      }
    }

    // Check enum values have = number;
    if (currentContext === "enum") {
      const isClosingBrace = code === "}" || code === "};";
      const isOption = code.startsWith("option ");
      const isReserved = code.startsWith("reserved ");
      if (!isClosingBrace && !isOption && !isReserved && /^\w+/.test(code)) {
        if (!/^\w+\s*=\s*-?\d+\s*;/.test(code) && !/^\w+\s*=\s*-?\d+\s*\[/.test(code)) {
          if (/^\w+\s*=\s*-?\d+\s*$/.test(code)) {
            issues.push(
              issue(lineNum, 1, "syntax-error", `Enum value is missing a trailing semicolon.`, "error")
            );
                    } else {
            issues.push(
              issue(lineNum, 1, "syntax-error", `Enum value is missing a valid number assignment.`, "error")
            );
          }
        }
      }
    }

    // Detect message/enum/service/oneof openings
    const blockMatch = code.match(/^(message|enum|service|oneof)\s+(\w*)/);
    if (blockMatch) {
      const type = blockMatch[1];
      const name = blockMatch[2] || "";

      if (!name) {
        issues.push(
          issue(lineNum, 1, "syntax-error", `${type} declaration is missing a name.`, "error")
        );
      }

      // Check for opening brace
      if (code.includes("{")) {
        braceStack.push({ type, name, line: lineNum });
      } else {
        // Brace might be on next line, or it's missing
        expectingBody = true;
        expectingType = type;
        expectingName = name;
        expectingLine = lineNum;
      }
    } else if (expectingBody) {
      if (code.startsWith("{") || code === "{") {
        braceStack.push({ type: expectingType, name: expectingName, line: expectingLine });
      } else {
        issues.push(
          issue(expectingLine, 1, "syntax-error", `${expectingType} "${expectingName}" is missing opening brace "{"`, "error")
        );
      }
      expectingBody = false;
    }

    // Handle brace tracking
    for (let j = 0; j < openCount; j++) {
      if (!blockMatch || j > 0) {
        // Non-block opening braces (e.g., rpc options)
        braceStack.push({ type: "block", name: "", line: lineNum });
      }
    }
    for (let j = 0; j < closeCount; j++) {
      if (braceStack.length > 0) {
        braceStack.pop();
      } else {
        issues.push(
          issue(lineNum, 1, "syntax-error", `Unexpected closing brace "}".`, "error")
        );
      }
    }

    // Check rpc syntax
    if (currentContext === "service" && code.startsWith("rpc ")) {
      // rpc Name(Request) returns (Response);
      if (!/^rpc\s+\w+\s*\([^)]*\)\s+returns\s+\([^)]*\)\s*[;{]/.test(code)) {
        issues.push(
          issue(lineNum, 1, "syntax-error", `Malformed rpc declaration. Expected: rpc Name(Request) returns (Response);`, "error")
        );
      }
    }

    // Validate syntax value
    const syntaxMatch = code.match(/^syntax\s*=\s*"([^"]*)"\s*;/);
    if (syntaxMatch) {
      const val = syntaxMatch[1];
      if (val !== "proto2" && val !== "proto3") {
        issues.push(
          issue(lineNum, 1, "syntax-error", `Invalid syntax value "${val}". Must be "proto2" or "proto3".`, "error")
        );
      }
    }

    // Check for trailing junk after semicolons
    if (code.includes(";") && !code.endsWith(";") && !code.includes("{")) {
      const afterSemicolon = code.substring(code.lastIndexOf(";") + 1).trim();
      if (afterSemicolon && !afterSemicolon.startsWith("//")) {
        issues.push(
          issue(lineNum, code.lastIndexOf(";") + 2, "syntax-error", `Unexpected content "${afterSemicolon}" after semicolon.`, "error")
        );
      }
    }

    // Detect unrecognized top-level lines
    if (currentContext === "" && !expectingBody) {
      const isKnown =
        code === "}" || code === "};" ||
        /^syntax\s/.test(code) ||
        /^package\s/.test(code) ||
        /^import\s/.test(code) ||
        /^option\s/.test(code) ||
        /^message\s/.test(code) ||
        /^enum\s/.test(code) ||
        /^service\s/.test(code) ||
        /^extend\s/.test(code) ||
        /^\/[/*]/.test(code) ||
        code === "{";
      if (!isKnown) {
        issues.push(
          issue(lineNum, 1, "syntax-error", `Unrecognized statement: "${code.substring(0, 40)}${code.length > 40 ? "..." : ""}".`, "error")
        );
      }
    }

    // Detect missing semicolons on field/import/package/syntax lines
    if (/^(syntax|package|import|option)\s+/.test(code) && !code.endsWith(";") && !code.includes("{")) {
      issues.push(
        issue(lineNum, code.length, "syntax-error", `Statement is missing a trailing semicolon.`, "error")
      );
    }
  }

  // Check for unclosed braces
  for (const unclosed of braceStack) {
    issues.push(
      issue(unclosed.line, 1, "syntax-error", `Unclosed ${unclosed.type} "${unclosed.name}" — missing closing brace "}".`, "error")
    );
  }

  return issues;
}

export function validate(content: string): ValidationResult {
  const issues: Issue[] = [];
  const lines = content.split("\n");

  // --- Trailing newline ---
  if (content.length > 0 && !content.endsWith("\n")) {
    issues.push(
      issue(lines.length, 1, "trailing-newline", "File should end with a trailing newline.", "warning")
    );
  }

  let hasSyntax = false;
  let hasPackage = false;
  let syntaxLine = -1;
  let packageLine = -1;
  let firstImportLine = -1;
  let lastImportLine = -1;
  const importLines: { line: number; text: string; isPublic: boolean }[] = [];

  // Track context for comment checks
  let prevLineIsComment = false;
  const enumBlocks: { name: string; startLine: number; values: { name: string; number: number; line: number }[] }[] = [];
  let currentEnum: { name: string; startLine: number; values: { name: string; number: number; line: number }[] } | null = null;
  let braceDepth = 0;
  let inService = false;
  let serviceHasComment = false;
  let inEnum = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // --- Max line length ---
    if (raw.length > 80) {
      issues.push(
        issue(lineNum, 81, "max-line-length", `Line exceeds 80 characters (${raw.length}).`, "warning")
      );
    }

    // Skip empty / comment-only lines for structural checks
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");

    // --- Syntax declaration ---
    if (trimmed.startsWith("syntax")) {
      hasSyntax = true;
      syntaxLine = lineNum;
    }

    // --- Package ---
    if (trimmed.startsWith("package ")) {
      hasPackage = true;
      packageLine = lineNum;
    }

    // --- Imports ---
    if (trimmed.startsWith("import ")) {
      const isPublic = trimmed.startsWith("import public ");
      if (firstImportLine === -1) firstImportLine = lineNum;
      lastImportLine = lineNum;
      importLines.push({ line: lineNum, text: trimmed, isPublic });
    }

    // --- Message naming ---
    const msgMatch = trimmed.match(/^message\s+(\w+)/);
    if (msgMatch) {
      const name = msgMatch[1];
      if (!PASCAL_RE.test(name)) {
        issues.push(
          issue(lineNum, 1, "message-name-pascal-case", `Message name "${name}" should be PascalCase.`, "error")
        );
      }
    }

    // --- Enum detection ---
    const enumMatch = trimmed.match(/^enum\s+(\w+)/);
    if (enumMatch) {
      const name = enumMatch[1];
      if (!PASCAL_RE.test(name)) {
        issues.push(
          issue(lineNum, 1, "enum-name-pascal-case", `Enum name "${name}" should be PascalCase.`, "error")
        );
      }
      currentEnum = { name, startLine: lineNum, values: [] };
      inEnum = true;
    }

    // --- Enum values ---
    if (inEnum && currentEnum) {
      const valMatch = trimmed.match(/^(\w+)\s*=\s*(\d+)/);
      if (valMatch) {
        const vName = valMatch[1];
        const vNum = parseInt(valMatch[2], 10);
        currentEnum.values.push({ name: vName, number: vNum, line: lineNum });
        if (!UPPER_SNAKE_RE.test(vName)) {
          issues.push(
            issue(lineNum, 1, "enum-value-upper-snake-case", `Enum value "${vName}" should be UPPER_SNAKE_CASE.`, "error")
          );
        }
      }
      if (trimmed.includes("}")) {
        // Enum closed — check UNSPECIFIED
        if (currentEnum.values.length > 0) {
          const first = currentEnum.values[0];
          if (first.number !== 0 || !first.name.endsWith("UNSPECIFIED")) {
            issues.push(
              issue(
                currentEnum.startLine,
                1,
                "enum-first-value-unspecified",
                `Enum "${currentEnum.name}" should have an UNSPECIFIED value as the first entry (= 0).`,
                "error"
              )
            );
          }
        }
        enumBlocks.push(currentEnum);
        currentEnum = null;
        inEnum = false;
      }
    }

    // --- Field naming (inside message) ---
    const fieldMatch = trimmed.match(
      /^(?:optional\s+|repeated\s+|required\s+)?(?:map<[^>]+>|\w+(?:\.\w+)*)\s+(\w+)\s*=\s*\d+/
    );
    if (fieldMatch && !inEnum) {
      const fName = fieldMatch[1];
      if (!SNAKE_RE.test(fName)) {
        issues.push(
          issue(lineNum, 1, "field-name-snake-case", `Field name "${fName}" should be snake_case.`, "error")
        );
      }
    }

    // --- Service / RPC comment check ---
    if (trimmed.startsWith("service ")) {
      inService = true;
      serviceHasComment = prevLineIsComment;
      if (!prevLineIsComment) {
        issues.push(
          issue(lineNum, 1, "service-comment", `Service should have a comment.`, "warning")
        );
      }
    }
    if (inService && trimmed.startsWith("rpc ")) {
      if (!prevLineIsComment) {
        issues.push(
          issue(lineNum, 1, "rpc-comment", `RPC should have a comment.`, "warning")
        );
      }
    }

    // Track brace depth for service end
    for (const ch of trimmed) {
      if (ch === "{") braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if (braceDepth === 0) inService = false;
      }
    }

    prevLineIsComment = isComment;
  }

  // --- File structure checks ---
  if (!hasSyntax) {
    issues.push(issue(1, 1, "syntax-declaration", 'File should start with a syntax declaration (e.g., syntax = "proto3";).', "error"));
  }
  if (!hasPackage) {
    issues.push(issue(1, 1, "package-declaration", "File should declare a package.", "warning"));
  }
  if (hasSyntax && hasPackage && packageLine < syntaxLine) {
    issues.push(issue(packageLine, 1, "file-structure", "Package declaration should come after the syntax declaration.", "error"));
  }

  // --- Import ordering: public first ---
  let seenNonPublic = false;
  for (const imp of importLines) {
    if (!imp.isPublic) seenNonPublic = true;
    if (imp.isPublic && seenNonPublic) {
      issues.push(
        issue(imp.line, 1, "import-ordering", "Public imports should come before other imports.", "warning")
      );
    }
  }

  // Run syntax validation
  const syntaxIssues = validateSyntax(lines);
  issues.push(...syntaxIssues);

  // Sort all issues by line number
  issues.sort((a, b) => a.line - b.line || a.column - b.column);

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const info = issues.filter((i) => i.severity === "info");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}
