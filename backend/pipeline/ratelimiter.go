package pipeline

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimitConfig controls per-IP token bucket behavior
type RateLimitConfig struct {
	// RequestsPerSecond is the sustained rate allowed per IP
	RequestsPerSecond float64
	// Burst is the maximum burst size (tokens)
	Burst int
	// EntryTTL is how long to keep an IP limiter entry without seeing traffic
	EntryTTL time.Duration
	// CleanupInterval controls how often we scan for and remove expired entries
	CleanupInterval time.Duration
}

// ipLimiterEntry holds a rate limiter and its last access time
type ipLimiterEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// ipLimiterStore manages per-IP rate limiters with TTL cleanup
type ipLimiterStore struct {
	mu      sync.Mutex
	entries map[string]*ipLimiterEntry

	cfg            RateLimitConfig
	cleanupStarted bool
}

// newIPLimiterStore creates a new store with the given configuration
func newIPLimiterStore(cfg RateLimitConfig) *ipLimiterStore {
	return &ipLimiterStore{
		entries: make(map[string]*ipLimiterEntry),
		cfg:     cfg,
	}
}

// get retrieves or creates a rate limiter for the given IP
func (s *ipLimiterStore) get(ip string) *rate.Limiter {
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	// Start cleanup goroutine once
	if !s.cleanupStarted && s.cfg.CleanupInterval > 0 && s.cfg.EntryTTL > 0 {
		s.cleanupStarted = true
		go s.cleanupLoop()
	}

	if e, ok := s.entries[ip]; ok {
		e.lastSeen = now
		return e.limiter
	}

	lim := rate.NewLimiter(rate.Limit(s.cfg.RequestsPerSecond), s.cfg.Burst)
	s.entries[ip] = &ipLimiterEntry{
		limiter:  lim,
		lastSeen: now,
	}
	return lim
}

// cleanupLoop periodically removes expired entries
func (s *ipLimiterStore) cleanupLoop() {
	ticker := time.NewTicker(s.cfg.CleanupInterval)
	defer ticker.Stop()

	for range ticker.C {
		cutoff := time.Now().Add(-s.cfg.EntryTTL)

		s.mu.Lock()
		for ip, e := range s.entries {
			if e.lastSeen.Before(cutoff) {
				delete(s.entries, ip)
			}
		}
		s.mu.Unlock()
	}
}

// ClientIP extracts the best-effort real client IP for rate limiting.
//
// Priority (cascading for Cloudflare → nginx proxy manager setup):
//  1. CF-Connecting-IP (Cloudflare)
//  2. X-Forwarded-For (first value in the chain)
//  3. X-Real-IP
//  4. RemoteAddr
func ClientIP(r *http.Request) string {
	if r == nil {
		return ""
	}

	// Cloudflare header - most reliable when using Cloudflare proxy
	if ip := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); ip != "" {
		if parsed := net.ParseIP(ip); parsed != nil {
			return parsed.String()
		}
	}

	// Standard proxy chain: client, proxy1, proxy2, ...
	// Take the first (leftmost) IP which should be the original client
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		for part := range strings.SplitSeq(xff, ",") {
			ip := strings.TrimSpace(part)
			if parsed := net.ParseIP(ip); parsed != nil {
				return parsed.String()
			}
			// Only check the first entry
			break
		}
	}

	// X-Real-IP is sometimes set by nginx
	if xrip := strings.TrimSpace(r.Header.Get("X-Real-IP")); xrip != "" {
		if parsed := net.ParseIP(xrip); parsed != nil {
			return parsed.String()
		}
	}

	// Fallback: RemoteAddr (ip:port)
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil {
		if parsed := net.ParseIP(host); parsed != nil {
			return parsed.String()
		}
	}

	// Last resort: return whatever was in RemoteAddr
	return strings.TrimSpace(r.RemoteAddr)
}

// RateLimitMiddleware creates a Gin middleware that enforces per-IP rate limiting.
// If exceeded, responds with 429 Too Many Requests.
func RateLimitMiddleware(cfg RateLimitConfig) gin.HandlerFunc {
	store := newIPLimiterStore(cfg)

	return func(c *gin.Context) {
		ip := ClientIP(c.Request)
		if ip == "" {
			// No IP -> treat as suspicious, rate limit under "unknown" bucket
			ip = "unknown"
		}

		lim := store.get(ip)
		if !lim.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please wait and try again.",
				"code":  "rate_limited",
			})
			return
		}

		c.Next()
	}
}
