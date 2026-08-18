# LetterMaker backend

Backend for the LetterMaker application written in Go using [Gin](https://gin-gonic.com/).

## Prerequisites

### Go

Install Go 1.25.5 or later.

### LaTeX

You will need pdfTeX and the TeX Live collections containing the packages used by the generated letters. The commands below install the required collections without installing the much larger `texlive-full` distribution.

#### Ubuntu (recommended)

```sh
sudo apt update
sudo apt install texlive-latex-extra
```

#### Arch Linux

```sh
sudo pacman -S --needed texlive-latexextra texlive-fontsrecommended texlive-plaingeneric
```

> [!NOTE]
> German locales require an additional language package:
>
> - Ubuntu: `sudo apt install texlive-lang-german`
> - Arch Linux: `sudo pacman -S --needed texlive-langgerman`
>
> Other non-English locales require their corresponding TeX Live language package.

## Endpoints

- `POST /api/create`: creates a PDF
- `GET /api/health`: returns HTTP 200 for health monitoring (not rate limited)

Errors are returned as JSON in the shape `{"error": "...", "code": "..."}`.

## Environment variables

Backend settings can be configured using environment variables. When present, [godotenv](https://github.com/joho/godotenv) loads `.env` from the process's current working directory, including in production.

Copy [.env.example](/backend/.env.example) and adjust the values if needed:

```sh
cp .env.example .env
```

The configuration is validated on startup; the server refuses to start if a value is broken (e.g. `RATE_LIMIT_BURST=0`).

> [!IMPORTANT]
> Client IPs for rate limiting are resolved through Gin's trusted-proxy handling. When running behind a reverse proxy, set `TRUSTED_PROXIES` to the proxy addresses; when behind Cloudflare, additionally set `TRUSTED_PLATFORM=cloudflare`. Forwarding headers from untrusted sources are ignored.

## Development

```sh
go run .
```

`GIN_MODE` defaults to `debug`.

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
