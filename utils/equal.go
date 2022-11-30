package utils

// Comparable is a workaround for Go incomplete implementation of generics
// See https://github.com/golang/go/issues/56548
type Comparable interface {
	Equals(Comparable) bool
}
