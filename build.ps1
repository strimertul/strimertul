$APPVERSION=git describe --tags --always
go build -ldflags "-X main.appVersion=$APPVERSION"