{ pkgs, ... }:

{
  packages = [
    pkgs.bun
    pkgs.git
    pkgs.zig
  ];

  languages.nix.enable = true;
  languages.typescript.enable = true;

  scripts.fallow = {
    exec = ''
      bunx fallow "$@"
    '';
    description = "Run Fallow codebase intelligence";
  };

  enterTest = ''
    bun --version >/dev/null
    zig version >/dev/null
    bunx fallow --version >/dev/null
  '';
}
