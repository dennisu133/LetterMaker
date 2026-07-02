package pipeline

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func testRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		RequestsPerSecond: 0.001, // effectively no refill during the test
		Burst:             2,
		EntryTTL:          15 * time.Minute,
		CleanupInterval:   time.Minute,
	}
}

func TestIPLimiterStoreReusesEntries(t *testing.T) {
	store := newIPLimiterStore(testRateLimitConfig())

	a1 := store.get("10.0.0.1")
	a2 := store.get("10.0.0.1")
	b := store.get("10.0.0.2")

	if a1 != a2 {
		t.Error("same IP should get the same limiter")
	}
	if a1 == b {
		t.Error("different IPs should get different limiters")
	}
}

func TestIPLimiterStoreRemovesExpired(t *testing.T) {
	store := newIPLimiterStore(testRateLimitConfig())

	store.get("10.0.0.1")
	store.get("10.0.0.2")

	// A cutoff in the future expires everything seen so far
	store.removeExpired(time.Now().Add(time.Second))

	store.mu.Lock()
	remaining := len(store.entries)
	store.mu.Unlock()
	if remaining != 0 {
		t.Errorf("expected all entries removed, %d remain", remaining)
	}
}

func TestRateLimitMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/", RateLimitMiddleware(testRateLimitConfig()), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	do := func() *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "192.0.2.1:1234"
		r.ServeHTTP(w, req)
		return w
	}

	// Burst of 2 allows two requests, the third gets limited
	for i := range 2 {
		if w := do(); w.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i+1, w.Code)
		}
	}
	w := do()
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 after burst, got %d", w.Code)
	}
	if body := w.Body.String(); !strings.Contains(body, "rate_limited") {
		t.Errorf("429 body missing code: %s", body)
	}
}

func TestRateLimitMiddlewareIgnoresSpoofedHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	// Trust no proxies: forwarding headers must be ignored
	if err := r.SetTrustedProxies(nil); err != nil {
		t.Fatalf("SetTrustedProxies: %v", err)
	}
	r.GET("/", RateLimitMiddleware(testRateLimitConfig()), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	do := func(spoofed string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = "192.0.2.1:1234"
		req.Header.Set("X-Forwarded-For", spoofed)
		r.ServeHTTP(w, req)
		return w
	}

	// Rotating the spoofed header must NOT reset the limit,
	// because all requests come from the same untrusted peer.
	do("1.1.1.1")
	do("2.2.2.2")
	if w := do("3.3.3.3"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("spoofed X-Forwarded-For bypassed rate limiting: got %d", w.Code)
	}
}
