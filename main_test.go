package main

import (
	"encoding/json"
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
			foundRating = true
		}
	}

	if !foundPath {
		t.Error("Path rule missing or incorrect")
	}
	if !foundRating {
		t.Error("Rating rule missing or incorrect")
	}
}