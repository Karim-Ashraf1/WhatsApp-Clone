package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
)

const (
	defaultQuality = 23
	port           = 8080
)

func main() {
	http.HandleFunc("/compress", handleCompression)
	http.HandleFunc("/health", handleHealth)

	log.Printf("Video Compression Service starting on port %d...\n", port)
	err := http.ListenAndServe(fmt.Sprintf(":%d", port), nil)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func handleCompression(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse multipart form (max 32MB files)
	err := r.ParseMultipartForm(32 << 20)
	if err != nil {
		sendErrorResponse(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get the file from the request
	file, handler, err := r.FormFile("video")
	if err != nil {
		sendErrorResponse(w, "No video file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type (basic check)
	if !isVideoFile(handler.Filename) {
		sendErrorResponse(w, "File is not a recognized video format", http.StatusBadRequest)
		return
	}

	// Read the entire file into memory
	fileBytes, err := ioutil.ReadAll(file)
	if err != nil {
		sendErrorResponse(w, "Failed to read uploaded file", http.StatusInternalServerError)
		return
	}

	// Get desired quality
	qualityStr := r.FormValue("quality")
	quality := defaultQuality // Default quality

	if qualityStr != "" {
		q, err := strconv.Atoi(qualityStr)
		if err == nil && q >= 0 && q <= 51 {
			quality = q
		}
	}

	// Compress the video using ffmpeg with in-memory processing
	compressedBytes, err := compressVideoInMemory(fileBytes, quality, handler.Filename)
	if err != nil {
		sendErrorResponse(w, fmt.Sprintf("Compression failed: %v", err), http.StatusInternalServerError)
		return
	}

	// Set appropriate headers
	w.Header().Set("Content-Type", getContentType(handler.Filename))
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=compressed_%s", handler.Filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(compressedBytes)))

	// Send the compressed video directly in the response
	w.Write(compressedBytes)
}

func compressVideoInMemory(videoBytes []byte, quality int, filename string) ([]byte, error) {
	// Create a temporary file for the input
	tempInFile, err := ioutil.TempFile("", "input-*"+filepath.Ext(filename))
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary input file: %w", err)
	}
	defer os.Remove(tempInFile.Name())
	defer tempInFile.Close()

	// Write the input bytes to the temp file
	if _, err := tempInFile.Write(videoBytes); err != nil {
		return nil, fmt.Errorf("failed to write to temporary input file: %w", err)
	}
	tempInFile.Close() // Close to ensure all data is written

	// Create a temporary file for the output
	tempOutFile, err := ioutil.TempFile("", "output-*"+filepath.Ext(filename))
	if err != nil {
		return nil, fmt.Errorf("failed to create temporary output file: %w", err)
	}
	defer os.Remove(tempOutFile.Name())
	defer tempOutFile.Close()

	// Run ffmpeg to compress the video
	qualityStr := strconv.Itoa(quality)
	cmd := exec.Command("ffmpeg", "-i", tempInFile.Name(), "-vcodec", "libx264", "-crf", qualityStr, "-y", tempOutFile.Name())

	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg error: %w, details: %s", err, stderr.String())
	}

	// Read the output file into memory
	tempOutFile.Close() // Close before reading
	compressedBytes, err := ioutil.ReadFile(tempOutFile.Name())
	if err != nil {
		return nil, fmt.Errorf("failed to read compressed video: %w", err)
	}

	return compressedBytes, nil
}

func getContentType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".mp4":
		return "video/mp4"
	case ".avi":
		return "video/x-msvideo"
	case ".mov":
		return "video/quicktime"
	case ".wmv":
		return "video/x-ms-wmv"
	case ".flv":
		return "video/x-flv"
	case ".webm":
		return "video/webm"
	case ".mkv":
		return "video/x-matroska"
	default:
		return "application/octet-stream"
	}
}

func sendErrorResponse(w http.ResponseWriter, message string, statusCode int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"message": message,
	})
}

func isVideoFile(filename string) bool {
	ext := filepath.Ext(filename)
	videoExts := map[string]bool{
		".mp4":  true,
		".avi":  true,
		".mov":  true,
		".wmv":  true,
		".mkv":  true,
		".webm": true,
		".flv":  true,
	}
	return videoExts[ext]
}
