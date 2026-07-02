package pipeline

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

// SemaphoreConfig controls the global compile semaphore
type SemaphoreConfig struct {
	// MaxConcurrent is the maximum number of concurrent expensive jobs
	MaxConcurrent int
}

// Semaphore manages concurrent access to expensive operations using a channel
type Semaphore struct {
	ch chan struct{}
}

var (
	globalSemaphore     *Semaphore
	globalSemaphoreOnce sync.Once
)

// InitSemaphore initializes the global semaphore with the given configuration.
// It is safe to call multiple times; only the first call takes effect.
// Should be called during application startup.
func InitSemaphore(cfg SemaphoreConfig) {
	maxConcurrent := cfg.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 2 // sensible default
	}

	globalSemaphoreOnce.Do(func() {
		globalSemaphore = &Semaphore{
			ch: make(chan struct{}, maxConcurrent),
		}
	})
}

// TryAcquire attempts to acquire a semaphore slot without blocking.
// Returns a release function and true if successful.
// Returns nil and false if no slots are available.
func (s *Semaphore) TryAcquire() (release func(), ok bool) {
	select {
	case s.ch <- struct{}{}:
		return func() { <-s.ch }, true
	default:
		return nil, false
	}
}

// TryAcquireCompileSlot attempts to acquire a compile slot without blocking.
// If successful, returns a release function that MUST be called when done (use defer).
// If not, it writes a 503 Service Unavailable response and returns nil, false.
//
// Usage:
//
//	release, ok := pipeline.TryAcquireCompileSlot(c)
//	if !ok {
//	    return // response already sent
//	}
//	defer release()
//	// ... do expensive work ...
func TryAcquireCompileSlot(c *gin.Context) (release func(), ok bool) {
	if c == nil {
		return nil, false
	}

	// Ensure semaphore is initialized (fallback to default if not)
	if globalSemaphore == nil {
		InitSemaphore(SemaphoreConfig{MaxConcurrent: 2})
	}

	release, ok = globalSemaphore.TryAcquire()
	if !ok {
		c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
			"error": "Server is busy. Please try again in a moment.",
			"code":  "server_busy",
		})
		return nil, false
	}

	return release, true
}
