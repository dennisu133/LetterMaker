package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"lettermaker-backend/pipeline"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// letterCompiler compiles a prepared job into a PDF.
// Satisfied by *pipeline.Compiler; an interface so tests can stub compilation.
type letterCompiler interface {
	Compile(job *pipeline.PreparedJob) (*pipeline.CompileResult, error)
}

// NewRouter builds the Gin engine with all middleware, pipeline components
// and routes configured. Callers must set the Gin mode beforehand.
func NewRouter(config Config) (*gin.Engine, error) {
	r := gin.Default()

	// Trust a platform-set client IP header (e.g. Cloudflare) if configured
	r.TrustedPlatform = config.TrustedPlatform

	// Set trusted proxies (nil means trust no proxies)
	if len(config.TrustedProxies) == 0 {
		if err := r.SetTrustedProxies(nil); err != nil {
			return nil, fmt.Errorf("failed to set trusted proxies: %w", err)
		}
	} else {
		if err := r.SetTrustedProxies(config.TrustedProxies); err != nil {
			return nil, fmt.Errorf("failed to set trusted proxies: %w", err)
		}
	}

	// Configure CORS
	// Set CORS_ORIGINS="none" to disable (when nginx handles CORS)
	// Set CORS_ORIGINS="*" to allow all origins (not recommended for production)
	// Set CORS_ORIGINS="http://localhost:5173,https://yourdomain.com" for specific origins
	if len(config.CORS.AllowedOrigins) > 0 {
		corsConfig := cors.Config{
			AllowMethods:     []string{"GET", "POST", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
			ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
			AllowCredentials: true,
			MaxAge:           12 * time.Hour,
		}

		// Check for wildcard
		if len(config.CORS.AllowedOrigins) == 1 && config.CORS.AllowedOrigins[0] == "*" {
			corsConfig.AllowAllOrigins = true
			log.Println("[WARN] CORS: Allowing all origins - not recommended for production")
		} else {
			corsConfig.AllowOrigins = config.CORS.AllowedOrigins
			log.Printf("[INFO] CORS: Allowing origins: %v", config.CORS.AllowedOrigins)
		}

		r.Use(cors.New(corsConfig))
	} else {
		log.Println("[INFO] CORS: Disabled")
	}

	// Rate limiting only guards the expensive create route; keeping
	// /api/health exempt so uptime monitors don't trip the limiter.
	rateLimit := pipeline.RateLimitMiddleware(config.RateLimit)

	// Create pipeline components with config
	semaphore := pipeline.NewSemaphore(config.Semaphore)
	validator := pipeline.NewValidator(config.Validation)
	preparer := pipeline.NewPreparer(config.Preparer)
	compiler := pipeline.NewCompiler(config.Compiler)

	// Routes
	r.POST("/api/create", rateLimit, handleCreateLetter(validator, preparer, compiler, semaphore))
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	return r, nil
}

// handleCreateLetter returns a handler that processes letter creation requests.
//
// Pipeline steps:
//  1. rate limiting (handled by middleware)                -> Error: 429
//  2. payload validation                                   -> Error: 422
//  3. parsing (prosemirror > latex)                        -> Error: 422
//  4. semaphore acquisition                                -> Error: 503
//  5. preparing (create temp dir with aux files)           -> Error: 500 / 507 / 508
//  6. calling pdflatex (and merging stamp if provided)     -> Error: 500 / 408
//  7. responding with the final PDF
func handleCreateLetter(validator *pipeline.Validator, preparer *pipeline.Preparer, compiler letterCompiler, semaphore *pipeline.Semaphore) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Step 2: Bind and validate request
		var req pipeline.LetterRequest
		if err := c.ShouldBind(&req); err != nil {
			log.Printf("[ERROR] Failed to bind request: %v", err)
			c.String(http.StatusUnprocessableEntity, err.Error())
			return
		}

		// Validate the request (including stamp file if present)
		if err := validator.ValidateRequest(&req, c.FormFile); err != nil {
			log.Printf("[ERROR] Validation failed: %v", err)
			c.String(http.StatusUnprocessableEntity, err.Error())
			return
		}

		// Step 3: Parse ProseMirror content to LaTeX
		contentLatex, err := pipeline.ParseProseMirrorToLatex(req.Content)
		if err != nil {
			log.Printf("[ERROR] ProseMirror parsing failed: %v", err)
			c.String(http.StatusUnprocessableEntity, err.Error())
			return
		}

		// Step 4: Acquire semaphore slot
		release, ok := semaphore.TryAcquire()
		if !ok {
			log.Printf("[WARN] Server busy, semaphore full")
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{
				"error": "Server is busy. Please try again in a moment.",
				"code":  "server_busy",
			})
			return
		}
		defer release()

		// Step 5: Prepare temp directory with LaTeX file
		job, err := preparer.Prepare(&req, contentLatex)
		if err != nil {
			log.Printf("[ERROR] Prepare failed: %v", err)
			c.String(http.StatusInternalServerError, err.Error())
			return
		}
		defer func() {
			if err := job.Cleanup(); err != nil {
				log.Printf("[WARN] Failed to cleanup temp directory %s: %v", job.Dir, err)
			}
		}()

		// Step 6: Compile PDF
		result, err := compiler.Compile(job)
		if err != nil {
			log.Printf("[ERROR] Compile failed: %v", err)
			status := http.StatusInternalServerError
			if compileErr, ok := err.(pipeline.CompileError); ok {
				// Log the full LaTeX output for debugging
				if compileErr.Log != "" {
					log.Printf("[DEBUG] pdflatex output:\n%s", compileErr.Log)
				}
				if compileErr.IsTimeout {
					status = http.StatusRequestTimeout
				}
			}
			c.String(status, err.Error())
			return
		}

		// Step 7: Respond with PDF
		c.Header("Content-Type", "application/pdf")
		c.Header("Content-Disposition", "attachment; filename=letter.pdf")
		c.Data(http.StatusOK, "application/pdf", result.PDF)
	}
}
