package utils

import "os"

type ByDate []os.DirEntry

func (f ByDate) Len() int {
	return len(f)
}

func (f ByDate) Swap(i, j int) {
	f[i], f[j] = f[j], f[i]
}

func (f ByDate) Less(i, j int) bool {
	firstInfo, _ := f[i].Info()
	secondInfo, _ := f[j].Info()
	return firstInfo.ModTime().Before(secondInfo.ModTime())
}
