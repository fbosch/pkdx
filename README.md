<div align="center">
  <img src="docs/pkdx-logo.png" alt="pkdx logo" width="150">
  <h1>pkdx</h1>
  <p>
    <a href="https://www.npmjs.com/package/@fbb.sh/pkdx"><img src="https://img.shields.io/npm/v/%40fbb.sh%2Fpkdx?logo=npm" alt="npm"></a>
    <a href="LICENSE"><img src="https://img.shields.io/npm/l/%40fbb.sh%2Fpkdx" alt="license"></a>
    <a href="docs/coverage.svg"><img src="docs/coverage.svg" alt="coverage"></a>
  </p>
</div>

`pkdx` is a terminal Pokédex for quickly looking up Pokémon species without leaving the command line.

It supports fuzzy species search, form selection, shiny sprites, damage matchups, abilities, evolutions, and flavor text.

<p align="center">
  <img src="docs/pkdx-politoed.svg" alt="pkdx showing Politoed details">
</p>

## Requirements

- macOS, Linux, WSL, Git Bash, or Windows PowerShell/CMD
- A modern terminal such as Kitty, Ghostty, WezTerm, Alacritty, or iTerm2
- Internet access

## Install

```bash
npm install -g @fbb.sh/pkdx
```

## Run

Start the app:

```bash
pkdx
```

or start with an initial query:

```bash
pkdx pikachu
```

## Credits

- [PokeAPI](https://pokeapi.co/) for Pokémon data.
- [PokéSprite](https://github.com/msikma/pokesprite) and [PokeAPI Sprites](https://github.com/PokeAPI/sprites) for sprite artwork and upstream sprite credits.
- [OpenTUI](https://github.com/anomalyco/opentui) for the terminal UI runtime.
- [Pokémon Database](https://pokemondb.net/) for external Pokédex links.

## License

MIT. See [`LICENSE`](LICENSE).
