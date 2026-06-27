# Benchmark Baseline

Captured: 2026-06-27
Command: `bun run bench`
Network: disabled by `test/support/disable-network.ts`

| Suite | Benchmark | Iterations | Duration ms | Ops/sec |
| --- | --- | ---: | ---: | ---: |
| app-state | search-text-input | 500000 | 119.47 | 4185317 |
| app-state | search-selection-down | 500000 | 192.69 | 2594816 |
| app-state | detail-toggle-shiny | 500000 | 39.77 | 12573377 |
| app-state | detail-cycle-description | 500000 | 22.24 | 22481410 |
| app-state | detail-load-species-transition | 500000 | 26.89 | 18594275 |
| detail-building | build-forms-pikachu | 100000 | 37.72 | 2650914 |
| detail-building | build-forms-charizard | 100000 | 42.69 | 2342500 |
| detail-building | build-default-detail-pikachu | 100000 | 151.40 | 660521 |
| detail-building | build-form-detail-charizard-mega-x | 100000 | 124.80 | 801314 |
| evolution-chart | linear-pikachu-chain | 500000 | 39.06 | 12801208 |
| evolution-chart | branching-eevee-chain | 500000 | 177.42 | 2818209 |
| pokeapi-validation | pokemon | 100000 | 143.25 | 698069 |
| pokeapi-validation | species | 100000 | 165.05 | 605875 |
| pokeapi-validation | evolutionChain | 100000 | 163.07 | 613229 |
| query-cache-storage | file-storage-read-small | 1000 | 20.40 | 49023 |
| query-cache-storage | file-storage-read-large | 1000 | 88.87 | 11252 |
| query-cache-storage | file-storage-write-small | 1000 | 21.41 | 46704 |
| query-cache-storage | file-storage-write-large | 1000 | 158.50 | 6309 |
| search | single-char-p | 100 | 0.06 | 1732022 |
| search | name-pikachu | 100 | 0.03 | 2967447 |
| search | alias-pika | 100 | 0.03 | 3007700 |
| search | dex-001 | 100 | 0.03 | 2934617 |
| search | symbol-nidoran | 100 | 0.05 | 2089384 |
| search | punctuation-mr-mime | 100 | 0.04 | 2761744 |
| search | late-dex-pecharunt | 100 | 0.03 | 3494304 |
| search | exact-name | 100 | 0.02 | 6314327 |
| search | exact-dex | 100 | 0.02 | 6387736 |
| search | exact-miss | 100 | 0.01 | 7380618 |
| sprite-rendering | xterm-color-index | 500 | 1.39 | 360165 |
| sprite-rendering | ascii-render-small-16x16 | 500 | 25.65 | 19494 |
| sprite-rendering | ascii-render-medium-64x64 | 500 | 90.86 | 5503 |
| sprite-rendering | builtin-image-prepare-cold-80x72 | 100 | 61.82 | 1618 |
| sprite-rendering | builtin-image-prepare-warm-80x72 | 500 | 0.47 | 1060862 |
| startup | import-search-module | 25 | 518.38 | 48 |
| startup | import-ui-root | 25 | 7462.18 | 3 |
| startup | create-initial-search-state | 25 | 1540.85 | 16 |
| startup | create-initial-detail-state | 25 | 1483.18 | 17 |
| type-matchups | single-electric | 1000000 | 138.11 | 7240853 |
| type-matchups | dual-water-flying | 1000000 | 285.98 | 3496799 |
| type-matchups | dual-fire-flying | 1000000 | 294.81 | 3392070 |
| type-matchups | dual-ghost-steel | 1000000 | 253.43 | 3945872 |
