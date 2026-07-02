package pipeline

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// -----------------------------------------------------------------------------
// Compiler Configuration
// -----------------------------------------------------------------------------

// CompilerConfig holds configuration for the LaTeX compiler
type CompilerConfig struct {
	// Timeout is the maximum duration for pdflatex to complete
	Timeout time.Duration
}

// -----------------------------------------------------------------------------
// Compile Result
// -----------------------------------------------------------------------------

// CompileResult holds the result of a LaTeX compilation
type CompileResult struct {
	// PDF contains the generated PDF bytes
	PDF []byte
	// Log contains the pdflatex output (for debugging)
	Log string
}

// -----------------------------------------------------------------------------
// Compiler Error
// -----------------------------------------------------------------------------

// CompileError represents an error during compilation
type CompileError struct {
	Message   string
	Log       string
	IsTimeout bool
}

func (e CompileError) Error() string {
	return e.Message
}

// NewCompileError creates a new compile error
func NewCompileError(message string, log string) CompileError {
	return CompileError{
		Message: message,
		Log:     log,
	}
}

// NewCompileTimeoutError creates a timeout error
func NewCompileTimeoutError(log string) CompileError {
	return CompileError{
		Message:   "PDF compilation timed out",
		Log:       log,
		IsTimeout: true,
	}
}

// -----------------------------------------------------------------------------
// Compiler
// -----------------------------------------------------------------------------

// Compiler runs pdflatex to generate PDFs
type Compiler struct {
	cfg CompilerConfig
}

// NewCompiler creates a new compiler with the given configuration
func NewCompiler(cfg CompilerConfig) *Compiler {
	if cfg.Timeout <= 0 {
		cfg.Timeout = 30 * time.Second // sensible default
	}
	return &Compiler{cfg: cfg}
}

// Compile runs pdflatex on the prepared job and returns the generated PDF.
// The job's temporary directory should be cleaned up by the caller after
// the PDF has been sent to the client.
func (c *Compiler) Compile(job *PreparedJob) (*CompileResult, error) {
	if job == nil || job.TexFile == "" {
		return nil, NewCompileError("invalid job: missing tex file", "")
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), c.cfg.Timeout)
	defer cancel()

	// Get the directory and filename
	// Use absolute path for output directory to avoid pdflatex issues
	dir, err := filepath.Abs(job.Dir)
	if err != nil {
		return nil, NewCompileError(fmt.Sprintf("failed to resolve directory path: %v", err), "")
	}
	texFilename := filepath.Base(job.TexFile)

	// Build pdflatex command
	// -interaction=nonstopmode: don't stop on errors, try to complete
	// -halt-on-error: stop on first error (but don't wait for input)
	// -output-directory: output files to the same directory
	cmd := exec.CommandContext(ctx, "pdflatex",
		"-interaction=nonstopmode",
		"-halt-on-error",
		"-output-directory", dir,
		texFilename,
	)
	cmd.Dir = dir

	// Capture stdout and stderr
	var outputBuf bytes.Buffer
	cmd.Stdout = &outputBuf
	cmd.Stderr = &outputBuf

	// Run pdflatex
	err = cmd.Run()
	logOutput := outputBuf.String()

	// Check for timeout
	if ctx.Err() == context.DeadlineExceeded {
		return nil, NewCompileTimeoutError(logOutput)
	}

	// Check for other errors
	if err != nil {
		return nil, NewCompileError(
			fmt.Sprintf("pdflatex failed: %v", err),
			logOutput,
		)
	}

	// Read the generated PDF
	pdfPath := filepath.Join(dir, "letter.pdf")
	pdfBytes, err := os.ReadFile(pdfPath)
	if err != nil {
		return nil, NewCompileError(
			fmt.Sprintf("failed to read generated PDF: %v", err),
			logOutput,
		)
	}

	// Verify we got a valid PDF (check magic header)
	if len(pdfBytes) < 5 || string(pdfBytes[:5]) != "%PDF-" {
		return nil, NewCompileError(
			"generated file is not a valid PDF",
			logOutput,
		)
	}

	return &CompileResult{
		PDF: pdfBytes,
		Log: logOutput,
	}, nil
}
