package main

import (
	"strings"
	"testing"
	"time"
)

// loadIsolated runs LoadConfig from an empty directory so a developer's
// local .env file cannot leak into the assertions.
func loadIsolated(t *testing.T) Config {
	t.Helper()
	t.Chdir(t.TempDir())
	return LoadConfig()
}

func TestLoadConfigDefaults(t *testing.T) {
	config := loadIsolated(t)

	if config.Host != "127.0.0.1" || config.Port != "8080" {
		t.Errorf("unexpected default addr: %s", config.Addr())
	}
	if config.GinMode != "debug" {
		t.Errorf("unexpected default gin mode: %s", config.GinMode)
	}
	if config.TrustedPlatform != "" {
		t.Errorf("no platform header should be trusted by default, got %q", config.TrustedPlatform)
	}
	if got := config.CORS.AllowedOrigins; len(got) != 2 {
		t.Errorf("unexpected default CORS origins: %v", got)
	}
	if config.RateLimit.Burst != 2 || config.RateLimit.RequestsPerSecond != 0.2 {
		t.Errorf("unexpected default rate limit: %+v", config.RateLimit)
	}
	if config.Compiler.Timeout != 30*time.Second {
		t.Errorf("unexpected default compile timeout: %v", config.Compiler.Timeout)
	}
	if config.MaxRequestBytes != 5*1024*1024 {
		t.Errorf("unexpected default request size limit: %d", config.MaxRequestBytes)
	}

	if err := config.Validate(); err != nil {
		t.Errorf("default config must validate: %v", err)
	}
}

func TestLoadConfigFromEnvironment(t *testing.T) {
	t.Setenv("PORT", "9999")
	t.Setenv("GIN_MODE", "release")
	t.Setenv("CORS_ORIGINS", "https://example.com, https://other.example ")
	t.Setenv("TRUSTED_PROXIES", "none")
	t.Setenv("TRUSTED_PLATFORM", "cloudflare")
	t.Setenv("RATE_LIMIT_RPS", "1.5")
	t.Setenv("RATE_LIMIT_TTL", "1h")
	t.Setenv("MAX_CONCURRENT_COMPILES", "4")
	t.Setenv("MAX_REQUEST_BYTES", "1048576")

	config := loadIsolated(t)

	if config.Port != "9999" {
		t.Errorf("PORT not applied: %s", config.Port)
	}
	if config.GinMode != "release" {
		t.Errorf("GIN_MODE not applied: %s", config.GinMode)
	}
	if len(config.CORS.AllowedOrigins) != 2 || config.CORS.AllowedOrigins[1] != "https://other.example" {
		t.Errorf("CORS_ORIGINS not parsed/trimmed: %v", config.CORS.AllowedOrigins)
	}
	if len(config.TrustedProxies) != 0 {
		t.Errorf("TRUSTED_PROXIES=none should clear proxies: %v", config.TrustedProxies)
	}
	if config.TrustedPlatform != "CF-Connecting-IP" {
		t.Errorf("cloudflare platform not mapped: %q", config.TrustedPlatform)
	}
	if config.RateLimit.RequestsPerSecond != 1.5 {
		t.Errorf("RATE_LIMIT_RPS not applied: %v", config.RateLimit.RequestsPerSecond)
	}
	if config.RateLimit.EntryTTL != time.Hour {
		t.Errorf("RATE_LIMIT_TTL not applied: %v", config.RateLimit.EntryTTL)
	}
	if config.Semaphore.MaxConcurrent != 4 {
		t.Errorf("MAX_CONCURRENT_COMPILES not applied: %d", config.Semaphore.MaxConcurrent)
	}
	if config.MaxRequestBytes != 1048576 {
		t.Errorf("MAX_REQUEST_BYTES not applied: %d", config.MaxRequestBytes)
	}
}

func TestLoadConfigDisableCORS(t *testing.T) {
	t.Setenv("CORS_ORIGINS", "none")
	config := loadIsolated(t)
	if len(config.CORS.AllowedOrigins) != 0 {
		t.Errorf("CORS_ORIGINS=none should disable CORS: %v", config.CORS.AllowedOrigins)
	}
}

func TestLoadConfigInvalidValuesFallBack(t *testing.T) {
	t.Setenv("RATE_LIMIT_RPS", "not-a-number")
	t.Setenv("COMPILE_TIMEOUT", "soon")
	config := loadIsolated(t)
	if config.RateLimit.RequestsPerSecond != 0.2 {
		t.Errorf("unparseable RPS should fall back to default: %v", config.RateLimit.RequestsPerSecond)
	}
	if config.Compiler.Timeout != 30*time.Second {
		t.Errorf("unparseable timeout should fall back to default: %v", config.Compiler.Timeout)
	}
}

func TestConfigValidateRejectsBrokenValues(t *testing.T) {
	tests := []struct {
		name   string
		env    map[string]string
		wantIn string
	}{
		{"zero burst", map[string]string{"RATE_LIMIT_BURST": "0"}, "RATE_LIMIT_BURST"},
		{"negative rps", map[string]string{"RATE_LIMIT_RPS": "-1"}, "RATE_LIMIT_RPS"},
		{"bad port", map[string]string{"PORT": "notaport"}, "PORT"},
		{"port out of range", map[string]string{"PORT": "70000"}, "PORT"},
		{"bad gin mode", map[string]string{"GIN_MODE": "production"}, "GIN_MODE"},
		{"zero content length", map[string]string{"MAX_CONTENT_LEN": "0"}, "MAX_CONTENT_LEN"},
		{"stamp min above max", map[string]string{"MIN_STAMP_BYTES": "600000"}, "MAX_STAMP_BYTES"},
		{"zero compiles", map[string]string{"MAX_CONCURRENT_COMPILES": "0"}, "MAX_CONCURRENT_COMPILES"},
		{"zero request bytes", map[string]string{"MAX_REQUEST_BYTES": "0"}, "MAX_REQUEST_BYTES"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for k, v := range tt.env {
				t.Setenv(k, v)
			}
			config := loadIsolated(t)
			err := config.Validate()
			if err == nil {
				t.Fatal("expected validation error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantIn) {
				t.Errorf("error %q does not mention %s", err.Error(), tt.wantIn)
			}
		})
	}
}
