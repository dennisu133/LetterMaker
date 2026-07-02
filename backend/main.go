package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

// shutdownTimeout is how long in-flight requests (e.g. running pdflatex
// compiles) get to finish after SIGINT/SIGTERM before the server exits.
const shutdownTimeout = 15 * time.Second

func checkPdflatex() {
	if _, err := exec.LookPath("pdflatex"); err != nil {
		log.Fatalf("pdflatex is not installed or not in PATH: %v", err)
	}
}

func main() {
	checkPdflatex()

	config := LoadConfig()
	if err := config.Validate(); err != nil {
		log.Fatalf("Invalid configuration:\n%v", err)
	}

	// Set Gin mode before creating the engine
	gin.SetMode(config.GinMode)

	r, err := NewRouter(config)
	if err != nil {
		log.Fatal("Failed to build router: ", err)
	}

	srv := &http.Server{
		Addr:    config.Addr(),
		Handler: r,
	}

	// Shut down gracefully on SIGINT/SIGTERM so in-flight compiles finish
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("Starting LetterMaker backend on %s", config.Addr())
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		log.Fatal("Failed to start server: ", err)
	case <-ctx.Done():
		log.Println("Shutdown signal received, draining connections...")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, context.DeadlineExceeded) {
		log.Printf("[WARN] Graceful shutdown failed: %v", err)
	}
	log.Println("Server stopped")
}
