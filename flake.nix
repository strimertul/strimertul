{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShell = pkgs.mkShell {
          GOPRIVATE = "git.sr.ht";

          buildInputs = with pkgs; [
            wails
            go_1_19
            nodejs-18_x
          ];
        };
      });
}
