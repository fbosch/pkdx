<div align="center">
  <img src="docs/pkdx-logo.png" alt="pkdx logo" width="150">
  <h1>pkdx</h1>
  <p>
    <a href="https://www.npmjs.com/package/@fbb.sh/pkdx"><img src="https://img.shields.io/npm/v/%40fbb.sh%2Fpkdx?logo=npm" alt="npm"></a>
    <a href="LICENSE"><img src="https://img.shields.io/npm/l/%40fbb.sh%2Fpkdx" alt="license"></a>
    <a href="docs/coverage.svg"><img src="docs/coverage.svg" alt="coverage"></a>
    <a href="https://github.com/fallow-rs/fallow"><img src="docs/fallow.svg" alt="fallow health"></a>
  </p>
</div>

A terminal Pokédex with fuzzy search, form selection, sprites, stats, abilities, evolutions, flavor text, and damage matchups.

## Requirements

- macOS, Linux, WSL, Git Bash, or Windows PowerShell/CMD
- Node.js 18 or newer when installing from npm or using `npx`
- A Unicode terminal with 24-bit color support
- Kitty graphics support for best sprite rendering, such as Kitty or WezTerm; other terminals fall back to block-rendered sprites
- Internet access

## Install

```bash
npm install -g @fbb.sh/pkdx
```

or run without installing:

```bash
npx @fbb.sh/pkdx
```

The npm package installs the native binary package for your platform. Supported npm binaries are macOS arm64/x64, glibc Linux arm64/x64, and Windows x64.

## Run

Start the app:

```bash
pkdx
```

or start with an initial query:

```bash
pkdx pikachu
```

## Screenshot

<p align="center">
  <img src="docs/example.png" alt="pkdx showing Politoed details">
</p>

## Credits

- [PokeAPI](https://pokeapi.co/) for Pokémon data.
- [PokéSprite](https://github.com/msikma/pokesprite) and [PokeAPI Sprites](https://github.com/PokeAPI/sprites) for sprite artwork and upstream sprite credits.
- [OpenTUI](https://github.com/anomalyco/opentui) for the terminal UI runtime.
- [Pokémon Database](https://pokemondb.net/) for external Pokédex links.

## License

MIT. See [`LICENSE`](LICENSE).
