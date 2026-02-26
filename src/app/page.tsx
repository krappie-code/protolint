"use client";

import { useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { EXAMPLE_PROTO } from "@/lib/examples";
import type { ValidationResult, Issue } from "@/lib/validator";
import type { editor } from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-[#1e1e1e] rounded-lg animate-pulse" />
  ),
});

const RULES = [
  { name: "Syntax Declaration", desc: "Files must declare syntax version" },
  { name: "Package Name", desc: "Package should be declared" },
  { name: "PascalCase Names", desc: "Messages and enums use PascalCase" },
  { name: "snake_case Fields", desc: "Field names use snake_case" },
  { name: "UPPER_SNAKE_CASE Enums", desc: "Enum values use UPPER_SNAKE_CASE" },
  { name: "Enum UNSPECIFIED", desc: "First enum value should be UNSPECIFIED = 0" },
  { name: "Import Ordering", desc: "Public imports come first" },
  { name: "Service Comments", desc: "Services and RPCs should have comments" },
  { name: "Line Length", desc: "Lines should not exceed 80 characters" },
  { name: "Trailing Newline", desc: "Files should end with a newline" },
];

function severityColor(s: string) {
  if (s === "error") return "text-red-400 bg-red-400/10 border-red-400/30";
  if (s === "warning") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-blue-400 bg-blue-400/10 border-blue-400/30";
}

function severityIcon(s: string) {
  if (s === "error") return "✕";
  if (s === "warning") return "⚠";
  return "ℹ";
}

export default function Home() {
  const [content, setContent] = useState(EXAMPLE_PROTO);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);

  const updateDecorations = useCallback((validationResult: ValidationResult | null) => {
    const ed = editorRef.current;
    if (!ed) return;

    const allIssues = validationResult
      ? [...validationResult.errors, ...validationResult.warnings, ...validationResult.info]
      : [];

    const newDecorations: editor.IModelDeltaDecoration[] = allIssues.map((iss) => ({
      range: {
        startLineNumber: iss.line,
        startColumn: 1,
        endLineNumber: iss.line,
        endColumn: 1,
      },
      options: {
        isWholeLine: true,
        className:
          iss.severity === "error"
            ? "editor-line-error"
            : iss.severity === "warning"
            ? "editor-line-warning"
            : "editor-line-info",
        glyphMarginClassName:
          iss.severity === "error"
            ? "editor-glyph-error"
            : iss.severity === "warning"
            ? "editor-glyph-warning"
            : "editor-glyph-info",
        glyphMarginHoverMessage: { value: `**${iss.rule}**: ${iss.message}` },
        overviewRuler: {
          color: iss.severity === "error" ? "#f87171" : iss.severity === "warning" ? "#fbbf24" : "#60a5fa",
          position: 1, // Full overview ruler
        },
      },
    }));

    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    decorationsRef.current = ed.createDecorationsCollection(newDecorations);
  }, []);

  const handleValidate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setResult(data);
      updateDecorations(data);
    } catch {
      setResult(null);
      updateDecorations(null);
    } finally {
      setLoading(false);
    }
  }, [content, updateDecorations]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      file.text().then((text) => setContent(text));
    }
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        file.text().then((text) => setContent(text));
      }
    },
    []
  );

  const allIssues: Issue[] = result
    ? [...result.errors, ...result.warnings, ...result.info]
    : [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="border-b border-[#1e1e2e]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              protolint
            </span>
            <span className="text-sm text-[#7a7a8c]">.com</span>
          </div>
          <a
            href="https://github.com/krappie-code/protolint"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7a7a8c] hover:text-white transition-colors text-sm"
          >
            GitHub →
          </a>
        </div>
      </header>

      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Validate your{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Protocol Buffers
          </span>
        </h1>
        <p className="text-[#7a7a8c] text-lg max-w-2xl mx-auto mb-12">
          Check your .proto files against the Google Protocol Buffer style guide.
          Catch naming issues, structural problems, and style violations instantly.
        </p>
      </section>

      {/* Editor + Results */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Editor panel */}
          <div
            className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
              <span className="text-sm text-[#7a7a8c]">editor.proto</span>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".proto"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs px-3 py-1 rounded-md border border-[#1e1e2e] text-[#7a7a8c] hover:text-white hover:border-[#333] transition-colors"
                >
                  Upload
                </button>
                <button
                  onClick={handleValidate}
                  disabled={loading}
                  className="text-xs px-4 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? "Validating…" : "Validate"}
                </button>
              </div>
            </div>
            <MonacoEditor
              height="500px"
              language="protobuf"
              theme="vs-dark"
              value={content}
              onChange={(v) => setContent(v || "")}
              onMount={(ed) => {
                editorRef.current = ed;
                ed.updateOptions({ glyphMargin: true });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                padding: { top: 12 },
                wordWrap: "on",
                glyphMargin: true,
              }}
            />
            <p className="text-xs text-[#7a7a8c] px-4 py-2 border-t border-[#1e1e2e]">
              Drag & drop a .proto file or paste content above
            </p>
          </div>

          {/* Results panel */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
              <span className="text-sm text-[#7a7a8c]">Results</span>
              {result && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    result.valid
                      ? "bg-green-400/10 text-green-400"
                      : "bg-red-400/10 text-red-400"
                  }`}
                >
                  {result.valid ? "✓ Valid" : `${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto max-h-[540px] p-4">
              {!result && (
                <div className="flex items-center justify-center h-full text-[#7a7a8c] text-sm">
                  Click &quot;Validate&quot; to check your .proto file
                </div>
              )}
              {result && allIssues.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <span className="text-4xl">🎉</span>
                  <span className="text-green-400 font-medium">No issues found!</span>
                  <span className="text-[#7a7a8c] text-sm">Your .proto file follows the Google style guide.</span>
                </div>
              )}
              {result && allIssues.length > 0 && (
                <div className="space-y-2">
                  {allIssues.map((issue, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border px-3 py-2 text-sm cursor-pointer hover:brightness-125 transition-all ${severityColor(issue.severity)}`}
                      onClick={() => {
                        const ed = editorRef.current;
                        if (ed) {
                          ed.revealLineInCenter(issue.line);
                          ed.setPosition({ lineNumber: issue.line, column: issue.column });
                          ed.focus();
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs mt-0.5">{severityIcon(issue.severity)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs opacity-60">
                              L{issue.line}:{issue.column}
                            </span>
                            <span className="font-mono text-xs opacity-60">
                              [{issue.rule}]
                            </span>
                          </div>
                          <p className="mt-0.5">{issue.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#1e1e2e] py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Style Rules Checked
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {RULES.map((rule) => (
              <div
                key={rule.name}
                className="rounded-lg border border-[#1e1e2e] bg-[#12121a] p-4"
              >
                <h3 className="font-medium text-sm mb-1">{rule.name}</h3>
                <p className="text-[#7a7a8c] text-xs">{rule.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Docs */}
      <section className="border-t border-[#1e1e2e] py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">API</h2>
          <p className="text-[#7a7a8c] text-center mb-8">
            Integrate protolint into your CI/CD pipeline or tooling.
          </p>
          <div className="rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e2e]">
              <span className="text-sm font-mono">
                POST /api/validate
              </span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto text-[#7a7a8c]">
{`# JSON body
curl -X POST https://protolint.com/api/validate \\
  -H "Content-Type: application/json" \\
  -d '{"content": "syntax = \\"proto3\\";\\npackage example;"}'

# File upload
curl -X POST https://protolint.com/api/validate \\
  -F "file=@path/to/your.proto"`}
            </pre>
          </div>
          <div className="mt-6 rounded-xl border border-[#1e1e2e] bg-[#12121a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e1e2e]">
              <span className="text-sm font-mono text-[#7a7a8c]">Response</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto text-[#7a7a8c]">
{`{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "line": 5,
      "column": 81,
      "rule": "max-line-length",
      "message": "Line exceeds 80 characters (92).",
      "severity": "warning"
    }
  ],
  "info": []
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e2e] py-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm text-[#7a7a8c]">
          <span>© {new Date().getFullYear()} protolint</span>
          <a
            href="https://github.com/krappie-code/protolint"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
