package pipeline

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// -----------------------------------------------------------------------------
// Locale Configuration
// -----------------------------------------------------------------------------
//
// Maps BCP 47 locale tags to LaTeX babel language options.
// Easily extensible: just add new entries to the map.

var localeToBabel = map[string]string{
	"de":    "ngerman",
	"de-DE": "ngerman",
	"de-AT": "naustrian",
	"de-CH": "nswissgerman",
	"en":    "english",
	"en-US": "american",
	"en-GB": "british",
	"en-AU": "australian",
	"fr":    "french",
	"fr-FR": "french",
	"es":    "spanish",
	"es-ES": "spanish",
	"it":    "italian",
	"it-IT": "italian",
	"nl":    "dutch",
	"nl-NL": "dutch",
	"pt":    "portuguese",
	"pt-BR": "brazilian",
}

// getBabelLanguage returns the babel language option for a BCP 47 locale.
// Falls back to "english" if the locale is not recognized.
func getBabelLanguage(locale string) string {
	// Try exact match first
	if babel, ok := localeToBabel[locale]; ok {
		return babel
	}

	// Try base language (e.g., "de" from "de-DE")
	if idx := strings.Index(locale, "-"); idx > 0 {
		base := locale[:idx]
		if babel, ok := localeToBabel[base]; ok {
			return babel
		}
	}

	// Default to English
	return "english"
}

// -----------------------------------------------------------------------------
// Preparer Configuration
// -----------------------------------------------------------------------------

// PreparerConfig holds configuration for the preparer
type PreparerConfig struct {
	// TmpDir is the base directory for temporary files
	TmpDir string
}

// -----------------------------------------------------------------------------
// Prepared Result
// -----------------------------------------------------------------------------

// PreparedJob represents a prepared LaTeX compilation job
type PreparedJob struct {
	// Dir is the temporary directory containing all files
	Dir string
	// TexFile is the path to the main .tex file
	TexFile string
	// StampFile is the path to the stamp PDF (empty if no stamp)
	StampFile string
}

// Cleanup removes the temporary directory and all its contents
func (p *PreparedJob) Cleanup() error {
	if p.Dir != "" {
		return os.RemoveAll(p.Dir)
	}
	return nil
}

// -----------------------------------------------------------------------------
// Preparer
// -----------------------------------------------------------------------------

// Preparer creates temporary directories with LaTeX files
type Preparer struct {
	cfg PreparerConfig
}

// NewPreparer creates a new preparer with the given configuration
func NewPreparer(cfg PreparerConfig) *Preparer {
	if cfg.TmpDir == "" {
		cfg.TmpDir = "tmp"
	}
	return &Preparer{cfg: cfg}
}

// Prepare creates a temporary directory with a LaTeX file ready for compilation.
// Returns a PreparedJob that must be cleaned up after use (call Cleanup()).
func (p *Preparer) Prepare(req *LetterRequest, contentLatex string) (*PreparedJob, error) {
	// Ensure base tmp directory exists
	if err := os.MkdirAll(p.cfg.TmpDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create base temp directory: %v", err)
	}

	// Create a unique job directory
	dirPath, err := os.MkdirTemp(p.cfg.TmpDir, "letter_")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %v", err)
	}

	job := &PreparedJob{
		Dir: dirPath,
	}

	// Write stamp file if present
	if len(req.StampPDF) > 0 {
		stampPath := filepath.Join(dirPath, "stamp.pdf")
		if err := os.WriteFile(stampPath, req.StampPDF, 0644); err != nil {
			_ = job.Cleanup()
			return nil, fmt.Errorf("failed to write stamp file: %v", err)
		}
		job.StampFile = stampPath
	}

	// Generate LaTeX content
	latexContent := p.generateLatex(req, contentLatex, job.StampFile != "")

	// Write LaTeX file
	texPath := filepath.Join(dirPath, "letter.tex")
	if err := os.WriteFile(texPath, []byte(latexContent), 0644); err != nil {
		_ = job.Cleanup()
		return nil, fmt.Errorf("failed to write tex file: %v", err)
	}
	job.TexFile = texPath

	return job, nil
}

// generateLatex creates the complete LaTeX document
func (p *Preparer) generateLatex(req *LetterRequest, contentLatex string, hasStamp bool) string {
	var sb strings.Builder

	babelLang := getBabelLanguage(req.Locale)

	// Document header
	sb.WriteString(`% !TEX encoding = UTF-8
% !TEX program = pdflatex

\documentclass[
    version=last,
    paper=a4,
    fontsize=11pt,
    `)
	sb.WriteString(babelLang)
	sb.WriteString(`,
    fromalign=right,
    parskip=half
]{scrlttr2}

\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{babel}
\usepackage[scaled]{helvet}
\renewcommand\familydefault{\sfdefault}
\usepackage{lmodern}
\usepackage{graphicx}
\usepackage[normalem]{ulem}
\usepackage{enumitem}
\usepackage{hyperref}
\hypersetup{colorlinks=true, linkcolor=black, urlcolor=black}
`)

	// Add background package and stamp setup if stamp is present
	if hasStamp {
		sb.WriteString(`
% Stamp overlay setup
\usepackage{eso-pic}
\usepackage{pdfpages}

% Add stamp as background on first page only
\AddToShipoutPictureBG*{%
    \AtPageUpperLeft{%
        \raisebox{-\height}{\includegraphics[width=\paperwidth,height=\paperheight]{stamp.pdf}}%
    }%
}
`)
	}

	sb.WriteString("\n")

	// Sender data (omitted if stamp is used)
	if !hasStamp {
		if req.SenderName != "" {
			sb.WriteString(`\setkomavar{fromname}{`)
			sb.WriteString(EscapeLatex(req.SenderName))
			sb.WriteString("}\n")
		}
		if req.SenderAddress != "" {
			sb.WriteString(`\setkomavar{fromaddress}{`)
			sb.WriteString(EscapeLatexMultiline(req.SenderAddress))
			sb.WriteString("}\n")
		}
	}

	// Date
	sb.WriteString(`\setkomavar{date}{`)
	sb.WriteString(p.formatDate(req.Date, req.Locale))
	sb.WriteString("}\n")

	// Subject
	sb.WriteString(`\setkomavar{subject}{`)
	sb.WriteString(EscapeLatexMultiline(req.Subject))
	sb.WriteString("}\n")

	// Begin document
	sb.WriteString("\n\\begin{document}\n\n")

	// Recipient block
	sb.WriteString("\\begin{letter}{")
	if hasStamp {
		// Empty placeholder box to maintain layout with stamp overlay
		sb.WriteString(`\parbox[t][4.5cm][c]{8.5cm}{}`)
	} else {
		sb.WriteString(EscapeLatex(req.RecipientName))
		sb.WriteString(" \\\\\n")
		sb.WriteString(EscapeLatexMultiline(req.RecipientAddress))
	}
	sb.WriteString("}\n\n")

	// Opening/Salutation
	sb.WriteString(`\opening{`)
	sb.WriteString(EscapeLatex(req.Salutation))
	sb.WriteString("}\n\n")

	// Main content (already converted to LaTeX)
	sb.WriteString(contentLatex)
	sb.WriteString("\n\n")

	// Signature
	sb.WriteString(`\setkomavar{signature}{`)
	signature := req.Signature
	if signature == "" && !hasStamp {
		signature = req.SenderName
	}
	sb.WriteString(EscapeLatexMultiline(signature))
	sb.WriteString("}\n\n")

	// Closing
	sb.WriteString(`\closing{`)
	sb.WriteString(EscapeLatex(req.Closing))
	sb.WriteString("}\n\n")

	// End document
	sb.WriteString("\\end{letter}\n\\end{document}\n")

	return sb.String()
}

// formatDate formats a date string (yyyy-mm-dd) according to the locale
func (p *Preparer) formatDate(dateStr string, locale string) string {
	// Parse the date
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		// If parsing fails, return as-is (already validated earlier)
		return EscapeLatex(dateStr)
	}

	// Format based on locale
	switch {
	case strings.HasPrefix(locale, "de"):
		// German: dd.mm.yyyy
		return t.Format("02.01.2006")
	case strings.HasPrefix(locale, "en-GB"), strings.HasPrefix(locale, "en-AU"):
		// British/Australian: dd/mm/yyyy
		return t.Format("02/01/2006")
	case strings.HasPrefix(locale, "fr"):
		// French: dd/mm/yyyy
		return t.Format("02/01/2006")
	case strings.HasPrefix(locale, "es"), strings.HasPrefix(locale, "it"), strings.HasPrefix(locale, "pt"):
		// Spanish, Italian, Portuguese: dd/mm/yyyy
		return t.Format("02/01/2006")
	default:
		// US English and others: mm/dd/yyyy or Month dd, yyyy
		return t.Format("January 2, 2006")
	}
}
