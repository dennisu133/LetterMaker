package main

import (
	"log"
	"net/http"
	"os/exec"
	"time"

	"lettermaker-backend/pipeline"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func checkPdflatex() {
	if _, err := exec.LookPath("pdflatex"); err != nil {
		log.Fatalf("pdflatex is not installed or not in PATH: %v", err)
	}
}

func main() {
	checkPdflatex()

	config := LoadConfig()

	// Set Gin mode before creating the engine
	gin.SetMode(config.GinMode)

	r := gin.Default()

	// Set trusted proxies (nil means trust no proxies)
	if len(config.TrustedProxies) == 0 {
		if err := r.SetTrustedProxies(nil); err != nil {
			log.Fatal("Failed to set trusted proxies:", err)
		}
	} else {
		if err := r.SetTrustedProxies(config.TrustedProxies); err != nil {
			log.Fatal("Failed to set trusted proxies:", err)
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

	// Apply rate limiting middleware
	r.Use(pipeline.RateLimitMiddleware(config.RateLimit))

	// Initialize semaphore for concurrency limiting
	pipeline.InitSemaphore(config.Semaphore)

	// Create validator with config
	validator := pipeline.NewValidator(config.Validation)

	// Create preparer with config
	preparer := pipeline.NewPreparer(config.Preparer)

	// Create compiler with config
	compiler := pipeline.NewCompiler(config.Compiler)

	// Routes
	r.POST("/api/create", handleCreateLetter(validator, preparer, compiler))
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Printf("Starting LetterMaker backend on %s", config.Addr())
	if err := r.Run(config.Addr()); err != nil {
		log.Fatal("Failed to start server:", err)
	}
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
func handleCreateLetter(validator *pipeline.Validator, preparer *pipeline.Preparer, compiler *pipeline.Compiler) gin.HandlerFunc {
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
		release, ok := pipeline.TryAcquireCompileSlot(c)
		if !ok {
			log.Printf("[WARN] Server busy, semaphore full")
			return // 503 response already sent
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
