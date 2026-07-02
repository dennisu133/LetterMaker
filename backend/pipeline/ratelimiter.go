package pipeline

import (
	"net/http"
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
		s.removeExpired(time.Now().Add(-s.cfg.EntryTTL))
	}
}

// removeExpired deletes all entries last seen before the cutoff
func (s *ipLimiterStore) removeExpired(cutoff time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for ip, e := range s.entries {
		if e.lastSeen.Before(cutoff) {
			delete(s.entries, ip)
		}
	}
}

// RateLimitMiddleware creates a Gin middleware that enforces per-IP rate limiting.
// If exceeded, responds with 429 Too Many Requests.
//
// The client IP comes from Gin's ClientIP, which only honors forwarding
// headers (X-Forwarded-For, or the engine's TrustedPlatform header) when the
// request arrives from a configured trusted proxy. Anything else would let
// direct clients spoof arbitrary IPs and bypass rate limiting.
func RateLimitMiddleware(cfg RateLimitConfig) gin.HandlerFunc {
	store := newIPLimiterStore(cfg)

	return func(c *gin.Context) {
		ip := c.ClientIP()
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
