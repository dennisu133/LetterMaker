package pipeline

import (
	"bytes"
	"fmt"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
)

func testValidationConfig() ValidationConfig {
	return ValidationConfig{
		MaxInputLen:    100,
		MaxTextAreaLen: 200,
		MaxContentLen:  10000,
		MaxStampBytes:  512 * 1024,
		MinStampBytes:  64,
	}
}

// validManualRequest returns a request that passes all validation rules.
func validManualRequest() *LetterRequest {
	return &LetterRequest{
		Mode:             ModeManual,
		Locale:           "de-DE",
		Date:             "2026-07-01",
		Subject:          "Kündigung",
		Salutation:       "Sehr geehrte Damen und Herren,",
		Content:          `{"type":"doc","content":[]}`,
		Closing:          "Mit freundlichen Grüßen",
		Signature:        "Max Mustermann",
		SenderName:       "Max Mustermann",
		SenderAddress:    "Musterweg 1\n12345 Musterstadt",
		RecipientName:    "Erika Musterfrau",
		RecipientAddress: "Beispielallee 2\n54321 Beispielstadt",
	}
}

// noFile is a getFile stub for requests without a stamp upload.
func noFile(name string) (*multipart.FileHeader, error) {
	return nil, fmt.Errorf("no file")
}

func TestValidateRequestManualModeValid(t *testing.T) {
	v := NewValidator(testValidationConfig())
	if err := v.ValidateRequest(validManualRequest(), noFile); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
}

func TestValidateRequestFieldErrors(t *testing.T) {
	long := strings.Repeat("x", 201)

	tests := []struct {
		name    string
		mutate  func(*LetterRequest)
		wantErr string
	}{
		{"nil-safe mode check", func(r *LetterRequest) { r.Mode = "other" }, "mode must be"},
		{"empty mode", func(r *LetterRequest) { r.Mode = "" }, "mode must be"},
		{"empty locale", func(r *LetterRequest) { r.Locale = "" }, "locale is required"},
		{"invalid locale", func(r *LetterRequest) { r.Locale = "not a locale!" }, "invalid locale"},
		{"oversized locale", func(r *LetterRequest) { r.Locale = strings.Repeat("a", 36) }, "at most 35"},
		{"empty date", func(r *LetterRequest) { r.Date = "" }, "date is required"},
		{"bad date format", func(r *LetterRequest) { r.Date = "01.07.2026" }, "yyyy-mm-dd"},
		{"impossible date", func(r *LetterRequest) { r.Date = "2026-02-30" }, "yyyy-mm-dd"},
		{"empty subject", func(r *LetterRequest) { r.Subject = " " }, "subject is required"},
		{"oversized subject", func(r *LetterRequest) { r.Subject = long }, "subject must be at most"},
		{"oversized salutation", func(r *LetterRequest) { r.Salutation = strings.Repeat("x", 101) }, "salutation must be at most"},
		{"oversized closing", func(r *LetterRequest) { r.Closing = strings.Repeat("x", 101) }, "closing must be at most"},
		{"empty signature", func(r *LetterRequest) { r.Signature = "" }, "signature is required"},
		{"oversized signature", func(r *LetterRequest) { r.Signature = long }, "signature must be at most"},
		{"empty content", func(r *LetterRequest) { r.Content = "" }, "content is required"},
		{"oversized content", func(r *LetterRequest) { r.Content = `{"pad":"` + strings.Repeat("x", 10001) + `"}` }, "content is too large"},
		{"empty recipient name", func(r *LetterRequest) { r.RecipientName = "" }, "recipient name is required"},
		{"oversized recipient name", func(r *LetterRequest) { r.RecipientName = strings.Repeat("x", 101) }, "recipient name must be at most"},
		{"empty recipient address", func(r *LetterRequest) { r.RecipientAddress = "" }, "recipient address is required"},
		{"oversized recipient address", func(r *LetterRequest) { r.RecipientAddress = long }, "recipient address must be at most"},
		{"oversized sender name", func(r *LetterRequest) { r.SenderName = strings.Repeat("x", 101) }, "sender name must be at most"},
		{"oversized sender address", func(r *LetterRequest) { r.SenderAddress = long }, "sender address must be at most"},
	}

	v := NewValidator(testValidationConfig())
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := validManualRequest()
			tt.mutate(req)
			err := v.ValidateRequest(req, noFile)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("error %q does not contain %q", err.Error(), tt.wantErr)
			}
		})
	}
}

func TestValidateRequestOptionalFields(t *testing.T) {
	v := NewValidator(testValidationConfig())

	req := validManualRequest()
	req.Salutation = ""
	req.Closing = ""
	req.SenderName = ""
	req.SenderAddress = ""
	if err := v.ValidateRequest(req, noFile); err != nil {
		t.Fatalf("request without optional fields rejected: %v", err)
	}
}

func TestValidateRequestNormalizesFields(t *testing.T) {
	v := NewValidator(testValidationConfig())

	req := validManualRequest()
	req.Subject = "  padded  "
	req.Locale = "DE-de"
	if err := v.ValidateRequest(req, noFile); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if req.Subject != "padded" {
		t.Errorf("subject not trimmed: %q", req.Subject)
	}
	if req.Locale != "de-DE" {
		t.Errorf("locale not canonicalized: %q", req.Locale)
	}
}

func TestValidateRequestNil(t *testing.T) {
	v := NewValidator(testValidationConfig())
	if err := v.ValidateRequest(nil, noFile); err == nil {
		t.Fatal("expected error for nil request")
	}
}

// makeFileHeader builds a real multipart.FileHeader by round-tripping the
// content through an actual multipart request.
func makeFileHeader(t *testing.T, content []byte) *multipart.FileHeader {
	t.Helper()

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, err := w.CreateFormFile("stampFile", "stamp.pdf")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	if _, err := fw.Write(content); err != nil {
		t.Fatalf("failed to write form file: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("failed to close writer: %v", err)
	}

	req := httptest.NewRequest("POST", "/", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	_, fh, err := req.FormFile("stampFile")
	if err != nil {
		t.Fatalf("failed to read form file back: %v", err)
	}
	return fh
}

func TestValidateRequestStampMode(t *testing.T) {
	v := NewValidator(testValidationConfig())

	stampRequest := func() *LetterRequest {
		req := validManualRequest()
		req.Mode = ModeStamp
		return req
	}

	t.Run("missing stamp file", func(t *testing.T) {
		err := v.ValidateRequest(stampRequest(), noFile)
		if err == nil || !strings.Contains(err.Error(), "stamp file is required") {
			t.Errorf("expected missing-stamp error, got %v", err)
		}
	})

	t.Run("stamp too small", func(t *testing.T) {
		fh := makeFileHeader(t, []byte("tiny"))
		err := v.ValidateRequest(stampRequest(), func(string) (*multipart.FileHeader, error) { return fh, nil })
		if err == nil || !strings.Contains(err.Error(), "too small") {
			t.Errorf("expected too-small error, got %v", err)
		}
	})

	t.Run("stamp too large", func(t *testing.T) {
		fh := makeFileHeader(t, bytes.Repeat([]byte("x"), 512*1024+1))
		err := v.ValidateRequest(stampRequest(), func(string) (*multipart.FileHeader, error) { return fh, nil })
		if err == nil || !strings.Contains(err.Error(), "too large") {
			t.Errorf("expected too-large error, got %v", err)
		}
	})

	t.Run("corrupt PDF", func(t *testing.T) {
		fh := makeFileHeader(t, bytes.Repeat([]byte("not a pdf "), 20))
		err := v.ValidateRequest(stampRequest(), func(string) (*multipart.FileHeader, error) { return fh, nil })
		if err == nil || !strings.Contains(err.Error(), "invalid or corrupted PDF") {
			t.Errorf("expected corrupt-pdf error, got %v", err)
		}
	})
}
