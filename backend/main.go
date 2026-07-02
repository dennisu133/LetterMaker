package main

import (
	"log"
	"os/exec"

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

	r, err := NewRouter(config)
	if err != nil {
		log.Fatal("Failed to build router: ", err)
	}

	log.Printf("Starting LetterMaker backend on %s", config.Addr())
	if err := r.Run(config.Addr()); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
