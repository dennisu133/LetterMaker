package main

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lettermaker-backend/pipeline"

	"github.com/gin-gonic/gin"
)

// stubCompiler implements letterCompiler without running pdflatex.
type stubCompiler struct {
	result *pipeline.CompileResult
	err    error
}

func (s stubCompiler) Compile(ctx context.Context, job *pipeline.PreparedJob) (*pipeline.CompileResult, error) {
	return s.result, s.err
}

func testValidationConfig() pipeline.ValidationConfig {
	return pipeline.ValidationConfig{
		MaxInputLen:    100,
		MaxTextAreaLen: 200,
		MaxContentLen:  10000,
		MaxStampBytes:  512 * 1024,
		MinStampBytes:  64,
	}
}

// newTestEngine wires the create handler with a stub compiler.
func newTestEngine(t *testing.T, compiler letterCompiler, semaphore *pipeline.Semaphore, maxBytes int64) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	validator := pipeline.NewValidator(testValidationConfig())
	preparer := pipeline.NewPreparer(pipeline.PreparerConfig{TmpDir: t.TempDir()})
	if semaphore == nil {
		semaphore = pipeline.NewSemaphore(pipeline.SemaphoreConfig{MaxConcurrent: 2})
	}

	r := gin.New()
	r.POST("/api/create", maxBodySize(maxBytes), handleCreateLetter(validator, preparer, compiler, semaphore))
	return r
}

// letterForm builds a multipart form for a valid manual-mode letter,
// with optional field overrides ("" removes the field).
func letterForm(t *testing.T, overrides map[string]string) (*bytes.Buffer, string) {
	t.Helper()

	fields := map[string]string{
		"mode":             "manual",
		"locale":           "de-DE",
		"date":             "2026-07-01",
		"subject":          "Testbetreff",
		"salutation":       "Hallo,",
		"content":          `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hallo Welt"}]}]}`,
		"closing":          "Mit freundlichen Grüßen",
		"signature":        "Max Mustermann",
		"senderName":       "Max Mustermann",
		"senderAddress":    "Musterweg 1\n12345 Musterstadt",
		"recipientName":    "Erika Musterfrau",
		"recipientAddress": "Beispielallee 2\n54321 Beispielstadt",
	}
	for k, v := range overrides {
		if v == "" {
			delete(fields, k)
		} else {
			fields[k] = v
		}
	}

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for k, v := range fields {
		if err := w.WriteField(k, v); err != nil {
			t.Fatalf("failed to write field %s: %v", k, err)
		}
	}
	if err := w.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}
	return &buf, w.FormDataContentType()
}

func postLetter(r *gin.Engine, body *bytes.Buffer, contentType string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/create", body)
	req.Header.Set("Content-Type", contentType)
	r.ServeHTTP(w, req)
	return w
}

func TestCreateLetterSuccess(t *testing.T) {
	pdf := []byte("%PDF-1.5 fake output")
	r := newTestEngine(t, stubCompiler{result: &pipeline.CompileResult{PDF: pdf}}, nil, 5*1024*1024)

	body, ct := letterForm(t, nil)
	w := postLetter(r, body, ct)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if got := w.Header().Get("Content-Type"); got != "application/pdf" {
		t.Errorf("unexpected content type: %s", got)
	}
	if got := w.Header().Get("Content-Disposition"); !strings.Contains(got, "letter.pdf") {
		t.Errorf("unexpected content disposition: %s", got)
	}
	if !bytes.Equal(w.Body.Bytes(), pdf) {
		t.Error("response body does not match compiled PDF")
	}
}

func TestCreateLetterErrorResponses(t *testing.T) {
	tests := []struct {
		name       string
		overrides  map[string]string
		wantStatus int
		wantCode   string
	}{
		{
			"missing subject",
			map[string]string{"subject": ""},
			http.StatusUnprocessableEntity, "validation_failed",
		},
		{
			"invalid mode",
			map[string]string{"mode": "carrier-pigeon"},
			http.StatusUnprocessableEntity, "validation_failed",
		},
		{
			"unparseable content",
			map[string]string{"content": "definitely not json"},
			http.StatusUnprocessableEntity, "invalid_content",
		},
		{
			"content is not a doc",
			map[string]string{"content": `{"type":"paragraph"}`},
			http.StatusUnprocessableEntity, "invalid_content",
		},
	}

	r := newTestEngine(t, stubCompiler{result: &pipeline.CompileResult{PDF: []byte("%PDF-")}}, nil, 5*1024*1024)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, ct := letterForm(t, tt.overrides)
			w := postLetter(r, body, ct)

			if w.Code != tt.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tt.wantStatus, w.Code, w.Body.String())
			}
			if !strings.Contains(w.Body.String(), tt.wantCode) {
				t.Errorf("body missing code %q: %s", tt.wantCode, w.Body.String())
			}
			if got := w.Header().Get("Content-Type"); !strings.Contains(got, "application/json") {
				t.Errorf("errors must be JSON, got content type %s", got)
			}
		})
	}
}

func TestCreateLetterBusy(t *testing.T) {
	semaphore := pipeline.NewSemaphore(pipeline.SemaphoreConfig{MaxConcurrent: 1})
	// Occupy the only slot so the request finds the server busy
	release, ok := semaphore.TryAcquire()
	if !ok {
		t.Fatal("failed to occupy semaphore")
	}
	defer release()

	r := newTestEngine(t, stubCompiler{result: &pipeline.CompileResult{PDF: []byte("%PDF-")}}, semaphore, 5*1024*1024)
	body, ct := letterForm(t, nil)
	w := postLetter(r, body, ct)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "server_busy") {
		t.Errorf("body missing code: %s", w.Body.String())
	}
}

func TestCreateLetterCompileFailure(t *testing.T) {
	r := newTestEngine(t, stubCompiler{err: pipeline.NewCompileError("pdflatex exploded", "log")}, nil, 5*1024*1024)
	body, ct := letterForm(t, nil)
	w := postLetter(r, body, ct)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "compile_failed") {
		t.Errorf("body missing code: %s", w.Body.String())
	}
	if strings.Contains(w.Body.String(), "exploded") {
		t.Errorf("internal error details leaked to client: %s", w.Body.String())
	}
}

func TestCreateLetterCompileTimeout(t *testing.T) {
	r := newTestEngine(t, stubCompiler{err: pipeline.NewCompileTimeoutError("log")}, nil, 5*1024*1024)
	body, ct := letterForm(t, nil)
	w := postLetter(r, body, ct)

	if w.Code != http.StatusRequestTimeout {
		t.Fatalf("expected 408, got %d", w.Code)
	}
	if !strings.Contains(w.Body.String(), "compile_timeout") {
		t.Errorf("body missing code: %s", w.Body.String())
	}
}

func TestCreateLetterBodyTooLarge(t *testing.T) {
	r := newTestEngine(t, stubCompiler{result: &pipeline.CompileResult{PDF: []byte("%PDF-")}}, nil, 64)
	body, ct := letterForm(t, nil)
	w := postLetter(r, body, ct)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d: %s", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Body.String(), "body_too_large") {
		t.Errorf("body missing code: %s", w.Body.String())
	}
}

// testRouterConfig returns a full config suitable for NewRouter tests.
func testRouterConfig(t *testing.T) Config {
	t.Helper()
	return Config{
		Host:    "127.0.0.1",
		Port:    "0",
		GinMode: gin.TestMode,
		RateLimit: pipeline.RateLimitConfig{
			RequestsPerSecond: 0.001,
			Burst:             2,
			EntryTTL:          15 * time.Minute,
			CleanupInterval:   time.Minute,
		},
		Validation:      testValidationConfig(),
		Semaphore:       pipeline.SemaphoreConfig{MaxConcurrent: 2},
		Preparer:        pipeline.PreparerConfig{TmpDir: t.TempDir()},
		Compiler:        pipeline.CompilerConfig{Timeout: 30 * time.Second},
		MaxRequestBytes: 5 * 1024 * 1024,
	}
}

func TestRouterHealthIsNotRateLimited(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r, err := NewRouter(testRouterConfig(t))
	if err != nil {
		t.Fatalf("NewRouter failed: %v", err)
	}

	// Exhaust the create route's rate limit ...
	for range 3 {
		body, ct := letterForm(t, nil)
		postLetter(r, body, ct)
	}
	body, ct := letterForm(t, nil)
	if w := postLetter(r, body, ct); w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected create route to be rate limited, got %d", w.Code)
	}

	// ... while health keeps answering
	for i := range 5 {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", "/api/health", nil))
		if w.Code != http.StatusOK {
			t.Fatalf("health request %d: expected 200, got %d", i+1, w.Code)
		}
	}
}
