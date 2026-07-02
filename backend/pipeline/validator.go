package pipeline

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"golang.org/x/text/language"
)

// ValidationConfig holds configurable validation limits
type ValidationConfig struct {
	// MaxInputLen is the maximum length for short input fields (e.g., salutation, closing)
	MaxInputLen int
	// MaxTextAreaLen is the maximum length for longer text fields (e.g., subject, signature, addresses)
	MaxTextAreaLen int
	// MaxContentLen is the maximum character length for the letter content
	MaxContentLen int
	// MaxStampBytes is the maximum size of an uploaded stamp PDF
	MaxStampBytes int64
	// MinStampBytes is the minimum size of a valid stamp PDF
	MinStampBytes int64
}

// Mode constants
const (
	ModeManual = "manual"
	ModeStamp  = "stamp"
)

// Fixed validation limits (not configurable)
const (
	MaxDateLen   = 10 // yyyy-mm-dd
	MaxLocaleLen = 35 // BCP 47 locale tags
)

// Expected stamp PDF metadata
// Note: pdfcpu reads Creator/Producer from the info dict, not XMP metadata.
// Title/Author are in XMP metadata which pdfcpu doesn't parse, so we search raw bytes.
const (
	ExpectedCreator  = "Deutsche Post AG"
	ExpectedProducer = "deutschepost"
	ExpectedTitle    = "INTERNETMARKEN"
)

// LetterRequest represents the incoming request payload
type LetterRequest struct {
	// Common fields
	Date       string `form:"date" json:"date"`
	Subject    string `form:"subject" json:"subject"`
	Salutation string `form:"salutation" json:"salutation"`
	Content    string `form:"content" json:"content"`
	Closing    string `form:"closing" json:"closing"`
	Signature  string `form:"signature" json:"signature"`
	Mode       string `form:"mode" json:"mode"`
	Locale     string `form:"locale" json:"locale"`

	// Manual mode fields
	SenderName       string `form:"senderName" json:"senderName"`
	SenderAddress    string `form:"senderAddress" json:"senderAddress"`
	RecipientName    string `form:"recipientName" json:"recipientName"`
	RecipientAddress string `form:"recipientAddress" json:"recipientAddress"`

	// Stamp mode: file is handled separately via multipart
	// StampPDF holds the validated PDF bytes after validation
	StampPDF []byte `form:"-" json:"-"`
}

// Validator performs request validation with configurable limits
type Validator struct {
	cfg ValidationConfig
}

// NewValidator creates a new validator with the given configuration
func NewValidator(cfg ValidationConfig) *Validator {
	return &Validator{cfg: cfg}
}

// ValidateRequest performs server-side validation for the letter request.
// For stamp mode, it reads and validates the uploaded stamp PDF.
// Returns nil if validation passes, or an error if it fails.
func (v *Validator) ValidateRequest(req *LetterRequest, getFile func(name string) (*multipart.FileHeader, error)) error {
	if req == nil {
		return fmt.Errorf("request is missing")
	}

	// Validate fields first (cheap)
	if err := v.validateLetterRequestFields(req); err != nil {
		return err
	}

	// Stamp-specific validation (reads the file)
	if req.Mode == ModeStamp {
		fh, err := getFile("stampFile")
		if err != nil {
			return fmt.Errorf("stamp file is required for stamp mode")
		}

		pdfBytes, err := v.readMultipartFileLimited(fh)
		if err != nil {
			return err
		}

		if err := validateStampPDF(pdfBytes); err != nil {
			return err
		}

		// Store validated PDF bytes in the request
		req.StampPDF = pdfBytes
	}

	return nil
}

// validateLetterRequestFields validates all fields of the letter request.
// Returns the first validation error encountered, or nil if all fields are valid.
func (v *Validator) validateLetterRequestFields(req *LetterRequest) error {
	if err := v.validateMode(req); err != nil {
		return err
	}
	if err := v.validateLocale(req); err != nil {
		return err
	}
	if err := v.validateDate(req); err != nil {
		return err
	}
	if err := v.validateSubject(req); err != nil {
		return err
	}
	if err := v.validateSalutation(req); err != nil {
		return err
	}
	if err := v.validateClosing(req); err != nil {
		return err
	}
	if err := v.validateSignature(req); err != nil {
		return err
	}
	if err := v.validateContent(req); err != nil {
		return err
	}

	// Mode-specific fields
	if req.Mode == ModeManual {
		if err := v.validateManualModeFields(req); err != nil {
			return err
		}
	}

	return nil
}

// validateMode validates the mode field
func (v *Validator) validateMode(req *LetterRequest) error {
	if req.Mode != ModeManual && req.Mode != ModeStamp {
		return fmt.Errorf("mode must be 'manual' or 'stamp'")
	}
	return nil
}

// validateLocale validates the locale field using BCP 47 language tag parsing
func (v *Validator) validateLocale(req *LetterRequest) error {
	req.Locale = strings.TrimSpace(req.Locale)

	if req.Locale == "" {
		return fmt.Errorf("locale is required")
	}

	if len(req.Locale) > MaxLocaleLen {
		return fmt.Errorf("locale must be at most %d characters", MaxLocaleLen)
	}

	tag, err := language.Parse(req.Locale)
	if err != nil {
		return fmt.Errorf("invalid locale format (expected BCP 47 tag like 'en-US' or 'de')")
	}

	base, _ := tag.Base()
	if base.String() == "und" {
		return fmt.Errorf("invalid locale: could not determine language")
	}

	// Normalize the locale to canonical form
	req.Locale = tag.String()
	return nil
}

// validateDate validates the date field
func (v *Validator) validateDate(req *LetterRequest) error {
	req.Date = strings.TrimSpace(req.Date)

	if req.Date == "" {
		return fmt.Errorf("date is required")
	}

	if len(req.Date) > MaxDateLen {
		return fmt.Errorf("date must be in yyyy-mm-dd format")
	}

	if _, err := time.Parse("2006-01-02", req.Date); err != nil {
		return fmt.Errorf("date must be in yyyy-mm-dd format")
	}
	return nil
}

// validateSubject validates the subject field
func (v *Validator) validateSubject(req *LetterRequest) error {
	req.Subject = strings.TrimSpace(req.Subject)

	if req.Subject == "" {
		return fmt.Errorf("subject is required")
	}

	if utf8.RuneCountInString(req.Subject) > v.cfg.MaxTextAreaLen {
		return fmt.Errorf("subject must be at most %d characters", v.cfg.MaxTextAreaLen)
	}
	return nil
}

// validateSalutation validates the optional salutation field
func (v *Validator) validateSalutation(req *LetterRequest) error {
	req.Salutation = strings.TrimSpace(req.Salutation)

	if req.Salutation != "" && utf8.RuneCountInString(req.Salutation) > v.cfg.MaxInputLen {
		return fmt.Errorf("salutation must be at most %d characters", v.cfg.MaxInputLen)
	}
	return nil
}

// validateClosing validates the optional closing field
func (v *Validator) validateClosing(req *LetterRequest) error {
	req.Closing = strings.TrimSpace(req.Closing)

	if req.Closing != "" && utf8.RuneCountInString(req.Closing) > v.cfg.MaxInputLen {
		return fmt.Errorf("closing must be at most %d characters", v.cfg.MaxInputLen)
	}
	return nil
}

// validateSignature validates the signature field
func (v *Validator) validateSignature(req *LetterRequest) error {
	req.Signature = strings.TrimSpace(req.Signature)

	if req.Signature == "" {
		return fmt.Errorf("signature is required")
	}

	if utf8.RuneCountInString(req.Signature) > v.cfg.MaxTextAreaLen {
		return fmt.Errorf("signature must be at most %d characters", v.cfg.MaxTextAreaLen)
	}
	return nil
}

// validateContent validates the content field (ProseMirror JSON)
func (v *Validator) validateContent(req *LetterRequest) error {
	req.Content = strings.TrimSpace(req.Content)

	if req.Content == "" {
		return fmt.Errorf("content is required")
	}

	if utf8.RuneCountInString(req.Content) > v.cfg.MaxContentLen {
		return fmt.Errorf("content is too large (max %d characters)", v.cfg.MaxContentLen)
	}

	// Quick check before attempting full parse
	if !looksLikeJSON(req.Content) {
		return fmt.Errorf("content must be valid JSON")
	}

	var tmp any
	if err := json.Unmarshal([]byte(req.Content), &tmp); err != nil {
		return fmt.Errorf("content must be valid JSON")
	}
	return nil
}

// validateManualModeFields validates fields specific to manual mode
func (v *Validator) validateManualModeFields(req *LetterRequest) error {
	req.RecipientName = strings.TrimSpace(req.RecipientName)
	req.RecipientAddress = strings.TrimSpace(req.RecipientAddress)
	req.SenderName = strings.TrimSpace(req.SenderName)
	req.SenderAddress = strings.TrimSpace(req.SenderAddress)

	// Recipient name (required)
	if req.RecipientName == "" {
		return fmt.Errorf("recipient name is required")
	}
	if utf8.RuneCountInString(req.RecipientName) > v.cfg.MaxInputLen {
		return fmt.Errorf("recipient name must be at most %d characters", v.cfg.MaxInputLen)
	}

	// Recipient address (required)
	if req.RecipientAddress == "" {
		return fmt.Errorf("recipient address is required")
	}
	if utf8.RuneCountInString(req.RecipientAddress) > v.cfg.MaxTextAreaLen {
		return fmt.Errorf("recipient address must be at most %d characters", v.cfg.MaxTextAreaLen)
	}

	// Sender name (optional)
	if req.SenderName != "" && utf8.RuneCountInString(req.SenderName) > v.cfg.MaxInputLen {
		return fmt.Errorf("sender name must be at most %d characters", v.cfg.MaxInputLen)
	}

	// Sender address (optional)
	if req.SenderAddress != "" && utf8.RuneCountInString(req.SenderAddress) > v.cfg.MaxTextAreaLen {
		return fmt.Errorf("sender address must be at most %d characters", v.cfg.MaxTextAreaLen)
	}

	return nil
}

// looksLikeJSON performs a quick check if a string appears to be JSON
func looksLikeJSON(s string) bool {
	s = strings.TrimSpace(s)
	return strings.HasPrefix(s, "{") || strings.HasPrefix(s, "[")
}

// readMultipartFileLimited reads an uploaded multipart file with a strict size cap
func (v *Validator) readMultipartFileLimited(fh *multipart.FileHeader) ([]byte, error) {
	if fh == nil {
		return nil, fmt.Errorf("missing file")
	}
	if fh.Size <= 0 {
		return nil, fmt.Errorf("file is empty")
	}
	if fh.Size > v.cfg.MaxStampBytes {
		return nil, fmt.Errorf("file is too large (max %d bytes)", v.cfg.MaxStampBytes)
	}
	if fh.Size < v.cfg.MinStampBytes {
		return nil, fmt.Errorf("file is too small to be a valid stamp PDF")
	}

	f, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file")
	}
	defer func() { _ = f.Close() }()

	// Read with limit + 1 to detect oversized files
	r := io.LimitReader(f, v.cfg.MaxStampBytes+1)
	b, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("failed to read file")
	}
	if int64(len(b)) > v.cfg.MaxStampBytes {
		return nil, fmt.Errorf("file is too large (max %d bytes)", v.cfg.MaxStampBytes)
	}

	return b, nil
}

// validateStampPDF validates that the PDF is a valid Deutsche Post INTERNETMARKE stamp.
// Uses pdfcpu library for reliable PDF parsing.
//
// Checks:
//   - Valid PDF structure
//   - Exactly 1 page
//   - Author is "Deutsche Post AG"
//   - Title contains "INTERNETMARKEN"
func validateStampPDF(pdfBytes []byte) error {
	reader := bytes.NewReader(pdfBytes)

	info, err := api.PDFInfo(reader, "", nil, false, model.NewDefaultConfiguration())
	if err != nil {
		return fmt.Errorf("invalid or corrupted PDF file")
	}

	if info.PageCount != 1 {
		return fmt.Errorf("stamp PDF must contain exactly 1 page (found %d)", info.PageCount)
	}

	if info.Creator != ExpectedCreator {
		return fmt.Errorf("stamp PDF must be from %s", ExpectedCreator)
	}

	if !strings.Contains(strings.ToLower(info.Producer), ExpectedProducer) {
		return fmt.Errorf("stamp PDF must be from %s", ExpectedCreator)
	}

	// Title is stored in XMP metadata which pdfcpu doesn't parse, so search raw bytes
	if !bytes.Contains(pdfBytes, []byte(ExpectedTitle)) {
		return fmt.Errorf("stamp PDF must be a Deutsche Post INTERNETMARKE")
	}

	return nil
}
