package pipeline

// SemaphoreConfig controls the compile semaphore
type SemaphoreConfig struct {
	// MaxConcurrent is the maximum number of concurrent expensive jobs
	MaxConcurrent int
}

// Semaphore manages concurrent access to expensive operations using a channel
type Semaphore struct {
	ch chan struct{}
}

// NewSemaphore creates a semaphore with the given configuration.
func NewSemaphore(cfg SemaphoreConfig) *Semaphore {
	maxConcurrent := cfg.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 2 // sensible default
	}
	return &Semaphore{
		ch: make(chan struct{}, maxConcurrent),
	}
}

// TryAcquire attempts to acquire a semaphore slot without blocking.
// Returns a release function and true if successful; the release function
// MUST be called when done (use defer).
// Returns nil and false if no slots are available.
func (s *Semaphore) TryAcquire() (release func(), ok bool) {
	select {
	case s.ch <- struct{}{}:
		return func() { <-s.ch }, true
	default:
		return nil, false
	}
}
