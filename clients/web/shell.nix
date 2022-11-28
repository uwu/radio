{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/02ac89b8e803881ab63c7727db631e63721ca370.tar.gz") {} }:
  pkgs.mkShell {
    nativeBuildInputs = with pkgs; [ nodejs-18_x nodePackages.pnpm ];
}