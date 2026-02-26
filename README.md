# protolint.com

Validate your `.proto` files against the [Google Protocol Buffer style guide](https://protobuf.dev/programming-guides/style/).

## Features

- **Web editor** — paste or drag-and-drop `.proto` files with syntax highlighting (Monaco Editor)
- **Instant validation** — checks naming conventions, file structure, enum rules, comments, and more
- **REST API** — `POST /api/validate` for CI/CD integration
- **Stateless** — no database, no accounts, everything runs in the browser + API

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## API Usage

```bash
# Validate with JSON body
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"content": "syntax = \"proto3\";\npackage example;"}'

# Validate with file upload
curl -X POST http://localhost:3000/api/validate \
  -F "file=@path/to/your.proto"
```

## Validation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `syntax-declaration` | error | File must declare syntax version |
| `package-declaration` | warning | File should declare a package |
| `message-name-pascal-case` | error | Messages must use PascalCase |
| `enum-name-pascal-case` | error | Enums must use PascalCase |
| `field-name-snake-case` | error | Fields must use snake_case |
| `enum-value-upper-snake-case` | error | Enum values must use UPPER_SNAKE_CASE |
| `enum-first-value-unspecified` | error | First enum value should be UNSPECIFIED = 0 |
| `import-ordering` | warning | Public imports should come first |
| `service-comment` | warning | Services should have comments |
| `rpc-comment` | warning | RPCs should have comments |
| `max-line-length` | warning | Lines should not exceed 80 characters |
| `trailing-newline` | warning | File should end with a newline |

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Monaco Editor**

## License

MIT

