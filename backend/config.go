package main

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"lettermaker-backend/pipeline"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// CORSConfig holds CORS configuration
type CORSConfig struct {
	// AllowedOrigins is a list of origins that are allowed to make requests
	// Use "*" to allow all origins (not recommended for production)
	// Use "none" to disable CORS (when behind a reverse proxy that handles it)
	AllowedOrigins []string
}

// Config holds the application configuration
type Config struct {
	Host           string
	Port           string
	TrustedProxies []string

	// TrustedPlatform is the header to take the client IP from when running
	// behind a trusted hosting platform (e.g. Cloudflare's CF-Connecting-IP).
	// Empty means no platform header is trusted.
	TrustedPlatform string

	// Gin mode: "debug", "release", or "test"
	GinMode string

	// CORS configuration
	CORS CORSConfig

	// Rate limiting configuration
	RateLimit pipeline.RateLimitConfig

	// Validation configuration
	Validation pipeline.ValidationConfig

	// Semaphore configuration (concurrency limiting)
	Semaphore pipeline.SemaphoreConfig

	// Preparer configuration
	Preparer pipeline.PreparerConfig

	// Compiler configuration
	Compiler pipeline.CompilerConfig

	// Request size limit in bytes
	MaxRequestBytes int64
}

// LoadConfig loads configuration from environment variables
func LoadConfig() Config {
	// Load .env file if it exists (ignores error if file doesn't exist)
	// This allows using environment variables directly in production
	_ = godotenv.Load()

	config := Config{
		Host:    getEnv("HOST", "127.0.0.1"),
		Port:    getEnv("PORT", "8080"),
		GinMode: getEnv("GIN_MODE", "debug"),

		RateLimit: pipeline.RateLimitConfig{
			RequestsPerSecond: getEnvFloat("RATE_LIMIT_RPS", 0.2), // ~1 request per 5 seconds
			Burst:             getEnvInt("RATE_LIMIT_BURST", 2),   // allow short bursts
			EntryTTL:          getEnvDuration("RATE_LIMIT_TTL", 15*time.Minute),
			CleanupInterval:   getEnvDuration("RATE_LIMIT_CLEANUP", 2*time.Minute),
		},

		Validation: pipeline.ValidationConfig{
			MaxInputLen:    getEnvInt("MAX_INPUT_LEN", 100),          // short fields (salutation, closing, names)
			MaxTextAreaLen: getEnvInt("MAX_TEXT_AREA_LEN", 200),      // longer fields (subject, signature, addresses)
			MaxContentLen:  getEnvInt("MAX_CONTENT_LEN", 10000),      // ProseMirror content character limit
			MaxStampBytes:  getEnvInt64("MAX_STAMP_BYTES", 512*1024), // 512 KiB
			MinStampBytes:  getEnvInt64("MIN_STAMP_BYTES", 1024),     // 1 KiB
		},

		Semaphore: pipeline.SemaphoreConfig{
			MaxConcurrent: getEnvInt("MAX_CONCURRENT_COMPILES", 2),
		},

		Preparer: pipeline.PreparerConfig{
			TmpDir: getEnv("TMP_DIR", "tmp"),
		},

		Compiler: pipeline.CompilerConfig{
			Timeout: getEnvDuration("COMPILE_TIMEOUT", 30*time.Second),
		},

		MaxRequestBytes: getEnvInt64("MAX_REQUEST_BYTES", 5*1024*1024), // 5 MiB
	}

	// Parse CORS allowed origins from comma-separated string
	corsOrigins := getEnv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
	if corsOrigins != "" && corsOrigins != "none" {
		for origin := range strings.SplitSeq(corsOrigins, ",") {
			if trimmed := strings.TrimSpace(origin); trimmed != "" {
				config.CORS.AllowedOrigins = append(config.CORS.AllowedOrigins, trimmed)
			}
		}
	}

	// Trusted platform header for client IPs. Only set this when the app is
	// exclusively reachable through the named platform, since the header is
	// trusted unconditionally.
	switch platform := getEnv("TRUSTED_PLATFORM", ""); strings.ToLower(platform) {
	case "", "none":
		// no platform header trusted
	case "cloudflare":
		config.TrustedPlatform = "CF-Connecting-IP"
	case "google-app-engine":
		config.TrustedPlatform = "X-Appengine-Remote-Addr"
	case "fly":
		config.TrustedPlatform = "Fly-Client-IP"
	default:
		// treat as a literal header name (e.g. X-Real-IP set by nginx)
		config.TrustedPlatform = platform
	}

	// Parse trusted proxies from comma-separated string
	proxiesStr := getEnv("TRUSTED_PROXIES", "127.0.0.1")
	if proxiesStr != "" && proxiesStr != "none" {
		for proxy := range strings.SplitSeq(proxiesStr, ",") {
			if trimmed := strings.TrimSpace(proxy); trimmed != "" {
				config.TrustedProxies = append(config.TrustedProxies, trimmed)
			}
		}
	}

	return config
}

// Addr returns the full address string for the server to listen on
func (c Config) Addr() string {
	return c.Host + ":" + c.Port
}

// Validate checks the configuration for values that would silently break
// the service (e.g. a burst of 0 blocks every request forever).
// It returns all problems found joined into a single error.
func (c Config) Validate() error {
	var errs []error

	fail := func(format string, args ...any) {
		errs = append(errs, fmt.Errorf(format, args...))
	}

	if port, err := strconv.Atoi(c.Port); err != nil || port < 1 || port > 65535 {
		fail("PORT must be a number between 1 and 65535, got %q", c.Port)
	}
	if c.GinMode != gin.DebugMode && c.GinMode != gin.ReleaseMode && c.GinMode != gin.TestMode {
		fail("GIN_MODE must be 'debug', 'release' or 'test', got %q", c.GinMode)
	}

	if c.RateLimit.RequestsPerSecond <= 0 {
		fail("RATE_LIMIT_RPS must be positive, got %v", c.RateLimit.RequestsPerSecond)
	}
	if c.RateLimit.Burst < 1 {
		fail("RATE_LIMIT_BURST must be at least 1 (0 would block all requests), got %d", c.RateLimit.Burst)
	}
	if c.RateLimit.EntryTTL <= 0 {
		fail("RATE_LIMIT_TTL must be positive, got %v", c.RateLimit.EntryTTL)
	}
	if c.RateLimit.CleanupInterval <= 0 {
		fail("RATE_LIMIT_CLEANUP must be positive, got %v", c.RateLimit.CleanupInterval)
	}

	if c.Validation.MaxInputLen < 1 {
		fail("MAX_INPUT_LEN must be at least 1, got %d", c.Validation.MaxInputLen)
	}
	if c.Validation.MaxTextAreaLen < 1 {
		fail("MAX_TEXT_AREA_LEN must be at least 1, got %d", c.Validation.MaxTextAreaLen)
	}
	if c.Validation.MaxContentLen < 1 {
		fail("MAX_CONTENT_LEN must be at least 1, got %d", c.Validation.MaxContentLen)
	}
	if c.Validation.MinStampBytes < 0 {
		fail("MIN_STAMP_BYTES must not be negative, got %d", c.Validation.MinStampBytes)
	}
	if c.Validation.MaxStampBytes <= c.Validation.MinStampBytes {
		fail("MAX_STAMP_BYTES (%d) must be greater than MIN_STAMP_BYTES (%d)",
			c.Validation.MaxStampBytes, c.Validation.MinStampBytes)
	}

	if c.Semaphore.MaxConcurrent < 1 {
		fail("MAX_CONCURRENT_COMPILES must be at least 1, got %d", c.Semaphore.MaxConcurrent)
	}
	if c.Compiler.Timeout <= 0 {
		fail("COMPILE_TIMEOUT must be positive, got %v", c.Compiler.Timeout)
	}
	if c.MaxRequestBytes < 1 {
		fail("MAX_REQUEST_BYTES must be at least 1, got %d", c.MaxRequestBytes)
	}

	return errors.Join(errs...)
}

// getEnv returns the value of an environment variable or a default value
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

// getEnvInt returns the value of an environment variable as an int or a default value
func getEnvInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.Atoi(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// getEnvInt64 returns the value of an environment variable as an int64 or a default value
func getEnvInt64(key string, defaultValue int64) int64 {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.ParseInt(value, 10, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// getEnvFloat returns the value of an environment variable as a float64 or a default value
func getEnvFloat(key string, defaultValue float64) float64 {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := strconv.ParseFloat(value, 64); err == nil {
			return parsed
		}
	}
	return defaultValue
}

// getEnvDuration returns the value of an environment variable as a duration or a default value
// Accepts formats like "15m", "2h", "30s"
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value, exists := os.LookupEnv(key); exists {
		if parsed, err := time.ParseDuration(value); err == nil {
			return parsed
		}
	}
	return defaultValue
}
