# LetterMaker backend

Backend for the LetterMaker application written in Go using [Gin](https://gin-gonic.com/).

## Prerequisites

### LaTeX

You will need pdfTeX and a few additional libraries ([see reference file for more details](/backend/reference/letter.tex)). All of the required packages are inside the `texlive-latex-extra` package.

> [!NOTE]
> If you encounter issues with rendering German characters try installing `texlive-lang-german`. This applies to other locales as well.

## Endpoints

- /api/create: the main route for PDF creation
- /api/health: returns a simple 200. Use for debugging and uptime monitoring (not rate limited).

Errors are returned as JSON in the shape `{"error": "...", "code": "..."}`.

## Environment variables

The limits can be greatly configured using environment variables. The program uses [godotenv](https://github.com/joho/godotenv) to parse local .env files, even during production. Just make sure they are in the same directory as the binary.

Simply rename [.env.example](/backend/.env.example) to .env and adjust the values if needed. The configuration is validated on startup; the server refuses to start if a value is broken (e.g. `RATE_LIMIT_BURST=0`).

> [!IMPORTANT]
> Client IPs for rate limiting are resolved through Gin's trusted-proxy handling. When running behind a reverse proxy, set `TRUSTED_PROXIES` to the proxy addresses; when behind Cloudflare, additionally set `TRUSTED_PLATFORM=cloudflare`. Forwarding headers from untrusted sources are ignored.

## Development

Run using `go run .`. Make sure GIN_MODE is set to debug (default).

## Testing

Run the full suite (includes tests that invoke a real `pdflatex`):

```sh
go test ./...
```

Skip the pdflatex-dependent tests:

```sh
go test -short ./...
```

They are also skipped automatically when `pdflatex` is not installed. CI (see [backend.yml](/.github/workflows/backend.yml)) runs formatting, vet, module tidiness, the race-enabled test suite and the release build on every backend change.

## Build

build with `GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" .`  
adjust if needed

Explanation:

- GOOS=linux: Sets the target Operating System to Linux.
- GOARCH=amd64: Sets the target Architecture to 64-bit (x86_64).
- "-w" (Omit DWARF): Removes debugging functionality to make binary smaller
- "-s" (Omit Symbol Table): Disables the symbol table. It removes the information needed to map binary addresses back to function names or line numbers. If the program crashes, the stack trace will be less helpful, but the binary will be even smaller
