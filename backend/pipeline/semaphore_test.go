package pipeline

import "testing"

func TestSemaphoreLimitsConcurrency(t *testing.T) {
	s := NewSemaphore(SemaphoreConfig{MaxConcurrent: 2})

	release1, ok := s.TryAcquire()
	if !ok {
		t.Fatal("first acquire should succeed")
	}
	_, ok = s.TryAcquire()
	if !ok {
		t.Fatal("second acquire should succeed")
	}
	if _, ok := s.TryAcquire(); ok {
		t.Fatal("third acquire should fail with capacity 2")
	}

	release1()
	if _, ok := s.TryAcquire(); !ok {
		t.Fatal("acquire after release should succeed")
	}
}

func TestSemaphoreDefaultCapacity(t *testing.T) {
	s := NewSemaphore(SemaphoreConfig{MaxConcurrent: 0})

	for i := range 2 {
		if _, ok := s.TryAcquire(); !ok {
			t.Fatalf("acquire %d should succeed with default capacity", i+1)
		}
	}
	if _, ok := s.TryAcquire(); ok {
		t.Fatal("default capacity should be 2")
	}
}
