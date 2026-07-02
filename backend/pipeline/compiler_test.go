package pipeline

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

// requirePdflatex skips tests that need a real TeX installation.
func requirePdflatex(t *testing.T) {
	t.Helper()
	if testing.Short() {
		t.Skip("skipping pdflatex test in short mode")
	}
	if _, err := exec.LookPath("pdflatex"); err != nil {
		t.Skip("pdflatex not installed")
	}
}

// prepareTestJob renders a valid manual-mode letter into a temp dir.
func prepareTestJob(t *testing.T) *PreparedJob {
	t.Helper()
	p := NewPreparer(PreparerConfig{TmpDir: t.TempDir()})
	contentLatex, err := ParseProseMirrorToLatex(`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hallo Welt & 100%"}]}]}`)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}
	job, err := p.Prepare(validManualRequest(), contentLatex)
	if err != nil {
		t.Fatalf("prepare failed: %v", err)
	}
	t.Cleanup(func() { _ = job.Cleanup() })
	return job
}

func TestCompileProducesPDF(t *testing.T) {
	requirePdflatex(t)

	c := NewCompiler(CompilerConfig{Timeout: 60 * time.Second})
	result, err := c.Compile(context.Background(), prepareTestJob(t))
	if err != nil {
		if compileErr, ok := err.(CompileError); ok && compileErr.Log != "" {
			t.Fatalf("compile failed: %v\npdflatex log:\n%s", err, compileErr.Log)
		}
		t.Fatalf("compile failed: %v", err)
	}
	if !bytes.HasPrefix(result.PDF, []byte("%PDF-")) {
		t.Error("output does not look like a PDF")
	}
}

func TestCompileTimeout(t *testing.T) {
	requirePdflatex(t)

	c := NewCompiler(CompilerConfig{Timeout: time.Millisecond})
	_, err := c.Compile(context.Background(), prepareTestJob(t))
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
	compileErr, ok := err.(CompileError)
	if !ok || !compileErr.IsTimeout {
		t.Errorf("expected timeout CompileError, got %v", err)
	}
}

func TestCompileCanceledContext(t *testing.T) {
	requirePdflatex(t)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // canceled before the compile starts

	c := NewCompiler(CompilerConfig{Timeout: 60 * time.Second})
	_, err := c.Compile(ctx, prepareTestJob(t))
	if err == nil {
		t.Fatal("expected error for canceled context, got nil")
	}
	if compileErr, ok := err.(CompileError); ok && compileErr.IsTimeout {
		t.Error("caller cancellation must not be reported as a compile timeout")
	}
}

func TestCompileInvalidLatex(t *testing.T) {
	requirePdflatex(t)

	dir := t.TempDir()
	texPath := filepath.Join(dir, "letter.tex")
	if err := os.WriteFile(texPath, []byte(`\documentclass{article}\begin{document}\undefinedmacro\end{document}`), 0644); err != nil {
		t.Fatalf("failed to write tex file: %v", err)
	}

	c := NewCompiler(CompilerConfig{Timeout: 60 * time.Second})
	_, err := c.Compile(context.Background(), &PreparedJob{Dir: dir, TexFile: texPath})
	if err == nil {
		t.Fatal("expected error for invalid LaTeX, got nil")
	}
	compileErr, ok := err.(CompileError)
	if !ok {
		t.Fatalf("expected CompileError, got %T", err)
	}
	if compileErr.IsTimeout {
		t.Error("LaTeX error must not be reported as timeout")
	}
	if compileErr.Log == "" {
		t.Error("compile error should carry the pdflatex log")
	}
}

func TestCompileInvalidJob(t *testing.T) {
	c := NewCompiler(CompilerConfig{})
	if _, err := c.Compile(context.Background(), nil); err == nil {
		t.Error("expected error for nil job")
	}
	if _, err := c.Compile(context.Background(), &PreparedJob{}); err == nil {
		t.Error("expected error for job without tex file")
	}
}
