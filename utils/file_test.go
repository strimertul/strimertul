package utils

import (
	"io/fs"
	"sort"
	"testing"
	"time"
)

func TestByDate(t *testing.T) {
	// Create some mocked dir entries with predictable dates
	entries := []fs.DirEntry{
		MockDirEntry{MockFileInfo{"a", 1, false, time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)}},
		MockDirEntry{MockFileInfo{"b", 2, false, time.Date(2020, 1, 4, 0, 0, 0, 0, time.UTC)}},
		MockDirEntry{MockFileInfo{"c", 3, false, time.Date(2020, 1, 3, 0, 0, 0, 0, time.UTC)}},
	}

	// Sort them by date
	sort.Sort(ByDate(entries))

	// Check the order
	if entries[0].Name() != "a" {
		t.Error("Expected a to be first")
	}
	if entries[1].Name() != "c" {
		t.Error("Expected c to be second")
	}
	if entries[2].Name() != "b" {
		t.Error("Expected b to be third")
	}
}

// Mock a DirEntry instance
type MockDirEntry struct {
	info MockFileInfo
}

func (m MockDirEntry) Type() fs.FileMode {
	return m.info.Mode()
}

func (m MockDirEntry) Name() string {
	return m.info.Name()
}

func (m MockDirEntry) Size() int64 {
	return m.info.Size()
}

func (m MockDirEntry) IsDir() bool {
	return m.info.IsDir()
}

func (m MockDirEntry) Info() (fs.FileInfo, error) {
	return m.info, nil
}

type MockFileInfo struct {
	name    string
	size    int64
	isDir   bool
	modTime time.Time
}

func (m MockFileInfo) IsDir() bool {
	return m.isDir
}

func (m MockFileInfo) Sys() any {
	return nil
}

func (m MockFileInfo) Name() string {
	return m.name
}

func (m MockFileInfo) Size() int64 {
	return m.size
}

func (m MockFileInfo) Mode() fs.FileMode {
	return fs.FileMode(0)
}

func (m MockFileInfo) ModTime() time.Time {
	return m.modTime
}
