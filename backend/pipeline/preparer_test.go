package pipeline

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetBabelLanguage(t *testing.T) {
	tests := []struct {
		locale string
		want   string
	}{
		{"de", "ngerman"},
		{"de-DE", "ngerman"},
		{"de-AT", "naustrian"},
		{"de-CH", "nswissgerman"},
		{"en-US", "american"},
		{"en-GB", "british"},
		{"fr-FR", "french"},
		// base-language fallback for unmapped regions
		{"de-LU", "ngerman"},
		{"en-CA", "english"},
		// unknown languages fall back to english
		{"ja-JP", "english"},
		{"xx", "english"},
	}

	for _, tt := range tests {
		t.Run(tt.locale, func(t *testing.T) {
			if got := getBabelLanguage(tt.locale); got != tt.want {
				t.Errorf("getBabelLanguage(%q) = %q, want %q", tt.locale, got, tt.want)
			}
		})
	}
}

func TestFormatDate(t *testing.T) {
	p := NewPreparer(PreparerConfig{TmpDir: t.TempDir()})

	tests := []struct {
		locale string
		want   string
	}{
		{"de-DE", "01.07.2026"},
		{"de", "01.07.2026"},
		{"en-GB", "01/07/2026"},
		{"en-AU", "01/07/2026"},
		{"fr-FR", "01/07/2026"},
		{"es-ES", "01/07/2026"},
		{"it-IT", "01/07/2026"},
		{"pt-BR", "01/07/2026"},
		{"en-US", "July 1, 2026"},
		{"ja-JP", "July 1, 2026"},
	}

	for _, tt := range tests {
		t.Run(tt.locale, func(t *testing.T) {
			if got := p.formatDate("2026-07-01", tt.locale); got != tt.want {
				t.Errorf("formatDate(2026-07-01, %q) = %q, want %q", tt.locale, got, tt.want)
			}
		})
	}
}

func TestPrepareManualMode(t *testing.T) {
	tmpDir := t.TempDir()
	p := NewPreparer(PreparerConfig{TmpDir: tmpDir})

	req := validManualRequest()
	req.Subject = "Subject with 100% & specials"

	job, err := p.Prepare(req, "Content body")
	if err != nil {
		t.Fatalf("Prepare failed: %v", err)
	}
	defer func() { _ = job.Cleanup() }()

	if job.StampFile != "" {
		t.Errorf("manual mode should not have a stamp file, got %q", job.StampFile)
	}

	texBytes, err := os.ReadFile(job.TexFile)
	if err != nil {
		t.Fatalf("failed to read tex file: %v", err)
	}
	tex := string(texBytes)

	for _, want := range []string{
		`\setkomavar{fromname}{Max Mustermann}`,
		`\setkomavar{fromaddress}{Musterweg 1\\12345 Musterstadt}`,
		`\setkomavar{date}{01.07.2026}`,
		`\setkomavar{subject}{Subject with 100\% \& specials}`,
		`\setkomavar{signature}{Max Mustermann}`,
		"Erika Musterfrau",
		`ngerman`,
		"Content body",
		`\opening{Sehr geehrte Damen und Herren,}`,
		`\closing{Mit freundlichen Grüßen}`,
	} {
		if !strings.Contains(tex, want) {
			t.Errorf("tex file missing %q", want)
		}
	}

	if strings.Contains(tex, "eso-pic") {
		t.Error("manual mode must not set up the stamp overlay")
	}
}

func TestPrepareStampMode(t *testing.T) {
	tmpDir := t.TempDir()
	p := NewPreparer(PreparerConfig{TmpDir: tmpDir})

	req := validManualRequest()
	req.Mode = ModeStamp
	req.StampPDF = []byte("%PDF-1.4 fake stamp")

	job, err := p.Prepare(req, "Body")
	if err != nil {
		t.Fatalf("Prepare failed: %v", err)
	}
	defer func() { _ = job.Cleanup() }()

	if job.StampFile == "" {
		t.Fatal("stamp mode must write a stamp file")
	}
	stampBytes, err := os.ReadFile(job.StampFile)
	if err != nil {
		t.Fatalf("failed to read stamp file: %v", err)
	}
	if string(stampBytes) != "%PDF-1.4 fake stamp" {
		t.Error("stamp file content mismatch")
	}

	texBytes, err := os.ReadFile(job.TexFile)
	if err != nil {
		t.Fatalf("failed to read tex file: %v", err)
	}
	tex := string(texBytes)

	if !strings.Contains(tex, "eso-pic") {
		t.Error("stamp mode must set up the stamp overlay")
	}
	if !strings.Contains(tex, `\parbox`) {
		t.Error("stamp mode must use the placeholder recipient box")
	}
	if strings.Contains(tex, "fromname") {
		t.Error("stamp mode must not emit sender data")
	}
	if strings.Contains(tex, "Erika Musterfrau") {
		t.Error("stamp mode must not emit the recipient block")
	}
}

func TestPrepareCleanup(t *testing.T) {
	p := NewPreparer(PreparerConfig{TmpDir: t.TempDir()})

	job, err := p.Prepare(validManualRequest(), "Body")
	if err != nil {
		t.Fatalf("Prepare failed: %v", err)
	}

	if err := job.Cleanup(); err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}
	if _, err := os.Stat(job.Dir); !os.IsNotExist(err) {
		t.Errorf("job directory still exists after cleanup: %v", err)
	}
}

func TestPrepareCreatesUniqueDirs(t *testing.T) {
	p := NewPreparer(PreparerConfig{TmpDir: t.TempDir()})

	a, err := p.Prepare(validManualRequest(), "Body")
	if err != nil {
		t.Fatalf("Prepare failed: %v", err)
	}
	defer func() { _ = a.Cleanup() }()
	b, err := p.Prepare(validManualRequest(), "Body")
	if err != nil {
		t.Fatalf("Prepare failed: %v", err)
	}
	defer func() { _ = b.Cleanup() }()

	if a.Dir == b.Dir {
		t.Error("two prepared jobs share the same directory")
	}
	if filepath.Dir(a.Dir) != filepath.Dir(b.Dir) {
		t.Error("jobs should share the same base directory")
	}
}
