package pipeline

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// -----------------------------------------------------------------------------
// Compiler Error
// -----------------------------------------------------------------------------

// CompileError represents an error during compilation
type CompileError struct {
	Message   string
	Log       string
	IsTimeout bool
}

func (e CompileError) Error() string { return e.Message }

// -----------------------------------------------------------------------------
// Compiler
// -----------------------------------------------------------------------------

// Compiler runs pdflatex to generate PDFs
type Compiler struct {
	timeout time.Duration
}

// NewCompiler creates a compiler with the given timeout.
func NewCompiler(timeout time.Duration) *Compiler {
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &Compiler{timeout: timeout}
}

// Compile runs pdflatex on the prepared job and returns the generated PDF.
// The compile timeout is layered on top of the given context, so pdflatex
// is also killed when the caller cancels (e.g. the client disconnects).
// The job's temporary directory should be cleaned up by the caller after
// the PDF has been sent to the client.
func (c *Compiler) Compile(ctx context.Context, job *PreparedJob) ([]byte, error) {
	if job == nil || job.Dir == "" {
		return nil, CompileError{Message: "invalid job: missing directory"}
	}

	// Layer the compile timeout on top of the caller's context
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()

	// Get the directory and filename
	// Use absolute path for output directory to avoid pdflatex issues
	dir, err := filepath.Abs(job.Dir)
	if err != nil {
		return nil, CompileError{Message: fmt.Sprintf("failed to resolve directory path: %v", err)}
	}

	// Build pdflatex command
	// -interaction=nonstopmode: don't stop on errors, try to complete
	// -halt-on-error: stop on first error (but don't wait for input)
	// -no-shell-escape: forbid \write18 even where restricted shell escape
	//   is enabled by default
	// -output-directory: output files to the same directory
	cmd := exec.CommandContext(ctx, "pdflatex",
		"-interaction=nonstopmode",
		"-halt-on-error",
		"-no-shell-escape",
		"-output-directory", dir,
		letterTexFilename,
	)
	cmd.Dir = dir

	// Defense in depth: paranoid kpathsea file access, so even if an
	// escaping bug slips through, TeX cannot read or write dotfiles,
	// absolute paths or parent directories.
	cmd.Env = append(os.Environ(), "openin_any=p", "openout_any=p")

	output, err := cmd.CombinedOutput()
	logOutput := string(output)

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		return nil, CompileError{
			Message:   "PDF compilation timed out",
			Log:       logOutput,
			IsTimeout: true,
		}
	}

	// Check for other errors
	if err != nil {
		return nil, CompileError{Message: fmt.Sprintf("pdflatex failed: %v", err), Log: logOutput}
	}

	// Read the generated PDF
	pdfPath := filepath.Join(dir, letterPDFFilename)
	pdfBytes, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, CompileError{Message: fmt.Sprintf("failed to read generated PDF: %v", err), Log: logOutput}
	}

	// Verify we got a valid PDF (check magic header)
	if len(pdfBytes) < 5 || string(pdfBytes[:5]) != "%PDF-" {
		return nil, CompileError{Message: "generated file is not a valid PDF", Log: logOutput}
	}

	return pdfBytes, nil
}
