package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestMapToNavidromePath(t *testing.T) {
	root := "/Volumes/Files - SSD/Music"
	
	tests := []struct {
		input    string
		expected string
	}{
		{"/Volumes/Files - SSD/Music/Rock", "Rock"},
		{"/Volumes/Files - SSD/Music/Xmas/Traditional", "Xmas/Traditional"},
		{"/Volumes/Files - SSD/Music", ""},
	}

	for _, tt := range tests {
		result := mapToNavidromePath(tt.input, root)
		if result != tt.expected {
			t.Errorf("Path mapping failed. Input: %s, Expected: %s, Got: %s", tt.input, tt.expected, result)
		}
	}
}

func TestGenerateSmartJSON(t *testing.T) {
	client := &SubsonicClient{}
	
	name := "Heavy Rotation Rock"
	path := "Rock"
	rating := 4

	data, err := client.GenerateSmartJSON(name, path, rating)
	if err != nil {
		t.Fatalf("Failed to generate JSON: %v", err)
	}

	var sp SmartPlaylist
	if err := json.Unmarshal(data, &sp); err != nil {
		t.Fatalf("Generated invalid JSON: %v", err)
	}

	if sp.Name != name {
		t.Errorf("Expected name %s, got %s", name, sp.Name)
	}

	foundPath := false
	foundRating := false
	
	// Check Rules using the correct "Name" field
	for _, rule := range sp.Rules.All {
		if rule.Name == "path" && rule.Value == path {
			foundPath = true
		}
		// Logic: Rating > (min - 1)
		if rule.Name == "rating" && rule.Operator == "gt" {
			// JSON unmarshals numbers as float64
			expectedValue := float64(rating - 1)
			if ruleValue, ok := rule.Value.(float64); ok && ruleValue == expectedValue {
				foundRating = true
			} else {
				t.Errorf("Rating rule value incorrect. Expected: %v, Got: %v", expectedValue, rule.Value)
			}
		}
	}

	if !foundPath {
		t.Error("Path rule missing or incorrect")
	}
	if !foundRating {
		t.Error("Rating rule missing or incorrect")
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"My Playlist", "My Playlist"},
		{"Rock/Metal", "Rock-Metal"},
		{"Xmas: Traditional", "Xmas- Traditional"},
		{"What?", "What"},
		{"Best <Songs>", "Best Songs"},
		{"A|B", "A-B"},
		{"  Trimmed  ", "Trimmed"},
	}

	for _, tt := range tests {
		result := sanitizeFilename(tt.input)
		if result != tt.expected {
			t.Errorf("sanitizeFilename(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestSubsonicClientPing(t *testing.T) {
	// Mock server returning successful ping response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/ping" {
			t.Errorf("Expected path /rest/ping, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/xml")
		w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
			<subsonic-response status="ok" version="1.16.1"></subsonic-response>`))
	}))
	defer server.Close()

	client := &SubsonicClient{
		BaseURL:  server.URL,
		Username: "test",
		Password: "test",
	}

	err := client.Ping()
	if err != nil {
		t.Errorf("Ping failed unexpectedly: %v", err)
	}
}

func TestSubsonicClientPingError(t *testing.T) {
	// Mock server returning error response
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
			<subsonic-response status="failed" version="1.16.1">
				<error code="40" message="Wrong username or password"/>
			</subsonic-response>`))
	}))
	defer server.Close()

	client := &SubsonicClient{
		BaseURL:  server.URL,
		Username: "test",
		Password: "wrong",
	}

	err := client.Ping()
	if err == nil {
		t.Error("Expected Ping to return error for failed auth")
	}
}

func TestSubsonicClientStartScan(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/rest/startScan" {
			t.Errorf("Expected path /rest/startScan, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/xml")
		w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
			<subsonic-response status="ok" version="1.16.1">
				<scanStatus scanning="true" count="0"/>
			</subsonic-response>`))
	}))
	defer server.Close()

	client := &SubsonicClient{
		BaseURL:  server.URL,
		Username: "test",
		Password: "test",
	}

	err := client.StartScan()
	if err != nil {
		t.Errorf("StartScan failed unexpectedly: %v", err)
	}
}

func TestSubsonicClientNoURL(t *testing.T) {
	client := &SubsonicClient{
		BaseURL:  "",
		Username: "test",
		Password: "test",
	}

	err := client.Ping()
	if err == nil {
		t.Error("Expected error when BaseURL is empty")
	}
}

func TestWriteAndListAndDeletePlaylist(t *testing.T) {
	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "smartyp-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	playlistPath := filepath.Join(tmpDir, "playlists")

	// Test WritePlaylistFile
	content := []byte(`{"name":"Test Playlist","rules":{"all":[]}}`)
	err = WritePlaylistFile(playlistPath, "Test Playlist", content)
	if err != nil {
		t.Fatalf("WritePlaylistFile failed: %v", err)
	}

	// Verify file exists
	expectedFile := filepath.Join(playlistPath, "Test Playlist.nsp")
	if _, err := os.Stat(expectedFile); os.IsNotExist(err) {
		t.Errorf("Playlist file was not created at %s", expectedFile)
	}

	// Test ListSmartPlaylists
	playlists, err := ListSmartPlaylists(playlistPath)
	if err != nil {
		t.Fatalf("ListSmartPlaylists failed: %v", err)
	}

	if len(playlists) != 1 {
		t.Errorf("Expected 1 playlist, got %d", len(playlists))
	}

	if playlists[0].Name != "Test Playlist" {
		t.Errorf("Expected playlist name 'Test Playlist', got '%s'", playlists[0].Name)
	}

	if playlists[0].Filename != "Test Playlist.nsp" {
		t.Errorf("Expected filename 'Test Playlist.nsp', got '%s'", playlists[0].Filename)
	}

	// Test DeleteSmartPlaylist
	err = DeleteSmartPlaylist(playlistPath, "Test Playlist.nsp")
	if err != nil {
		t.Fatalf("DeleteSmartPlaylist failed: %v", err)
	}

	// Verify file is deleted
	if _, err := os.Stat(expectedFile); !os.IsNotExist(err) {
		t.Error("Playlist file was not deleted")
	}

	// Verify list is now empty
	playlists, err = ListSmartPlaylists(playlistPath)
	if err != nil {
		t.Fatalf("ListSmartPlaylists after delete failed: %v", err)
	}
	if len(playlists) != 0 {
		t.Errorf("Expected 0 playlists after delete, got %d", len(playlists))
	}
}

func TestDeleteSmartPlaylistSecurity(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "smartyp-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Test path traversal prevention
	tests := []struct {
		filename    string
		shouldError bool
	}{
		{"../../../etc/passwd", true},
		{"test/../../../etc/passwd", true},
		{"valid.nsp", false}, // This would fail because file doesn't exist, but passes security check
		{"not-nsp.txt", true},
	}

	for _, tt := range tests {
		err := DeleteSmartPlaylist(tmpDir, tt.filename)
		if tt.shouldError && err == nil {
			t.Errorf("DeleteSmartPlaylist(%q) should have returned error", tt.filename)
		}
	}
}

func TestGetPlaylistPath(t *testing.T) {
	// Test default behavior (no env var)
	os.Unsetenv("PLAYLIST_PATH")
	musicRoot := "/path/to/music"
	result := getPlaylistPath(musicRoot)
	expected := filepath.Join(musicRoot, "playlists")
	if result != expected {
		t.Errorf("getPlaylistPath() = %q, want %q", result, expected)
	}

	// Test with env var override
	customPath := "/custom/playlist/path"
	os.Setenv("PLAYLIST_PATH", customPath)
	defer os.Unsetenv("PLAYLIST_PATH")

	result = getPlaylistPath(musicRoot)
	if result != customPath {
		t.Errorf("getPlaylistPath() with PLAYLIST_PATH = %q, want %q", result, customPath)
	}
}