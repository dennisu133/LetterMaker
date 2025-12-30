# LetterMaker backend

Backend for the LetterMaker application written in Go using [Gin](https://gin-gonic.com/).

## Prerequesites

### LaTeX

You will need pdfTeX and a few additional libraries ([see reference file for more details](/backend/reference/letter.tex)). All of the required packages are inside the `texlive-latex-extra` package.

> [!NOTE]
> If you encounter issues with rendering German characters try installing `texlive-lang-german`. This applies to other locales as well.

## Endpoints

- /api/create: the main route for PDF creation
- /api/health: returns a simple 200. Use for debugging.

## Enviroment variables

The limits can be greatly configured using enviroment variables. The program uses [godotenv](https://github.com/joho/godotenv) to parse local .env files, even during production. Just make sure they are in the same directory as the binary.

Simply rename [.env.example](/backend/.env.example) to .env and adjust the values if needed.

## Development

Run using `go run .`. Make sure GIN_MODE is set to debug (default).

## Build

build with `GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" .`  
adjust if needed

Explanation:

- GOOS=linux: Sets the target Operating System to Linux.
- GOARCH=amd64: Sets the target Architecture to 64-bit (x86_64).
- "-w" (Omit DWARF): Removes debugging functionality to make binary smaller
- "-s" (Omit Symbol Table): Disables the symbol table. It removes the information needed to map binary addresses back to function names or line numbers. If the program crashes, the stack trace will be less helpful, but the binary will be even smaller
