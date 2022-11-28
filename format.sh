#!/bin/sh

# not until it reads the fucking editorconfig correctly
#dotnet jb cleanupcode UwuRadio.Server/**/*.cs

prettier --write clients/web/**/*
