# Benchmark Baseline

Captured: 2026-06-27
Command: `bun run bench`

| Suite | Benchmark | Iterations | Duration ms | Ops/sec |
| --- | --- | ---: | ---: | ---: |
| app-state | search-text-input | 500000 | 172.94 | 2891138 |
| app-state | search-selection-down | 500000 | 220.89 | 2263579 |
| app-state | detail-toggle-shiny | 500000 | 40.65 | 12300971 |
| app-state | detail-cycle-description | 500000 | 24.01 | 20822132 |
| app-state | detail-load-species-transition | 500000 | 27.90 | 17923343 |
| detail-building | build-forms-pikachu | 100000 | 38.06 | 2627194 |
| detail-building | build-forms-charizard | 100000 | 42.92 | 2330114 |
| detail-building | build-default-detail-pikachu | 100000 | 212.10 | 471479 |
| detail-building | build-form-detail-charizard-mega-x | 100000 | 188.95 | 529244 |
| evolution-chart | linear-pikachu-chain | 500000 | 297.39 | 1681299 |
| evolution-chart | branching-eevee-chain | 500000 | 2858.48 | 174918 |
| pokeapi-validation | pokemon | 100000 | 160.45 | 623252 |
| pokeapi-validation | species | 100000 | 183.26 | 545675 |
| pokeapi-validation | evolutionChain | 100000 | 178.46 | 560353 |
| query-cache-storage | file-storage-read-small | 1000 | 22.46 | 44520 |
| query-cache-storage | file-storage-read-large | 1000 | 88.21 | 11337 |
| query-cache-storage | file-storage-write-small | 1000 | 23.13 | 43236 |
| query-cache-storage | file-storage-write-large | 1000 | 156.07 | 6407 |
| search | single-char-p | 100 | 0.06 | 1788205 |
| search | name-pikachu | 100 | 0.03 | 2990699 |
| search | alias-pika | 100 | 0.03 | 3244646 |
| search | dex-001 | 100 | 0.04 | 2682691 |
| search | symbol-nidoran | 100 | 0.05 | 2100796 |
| search | punctuation-mr-mime | 100 | 0.04 | 2769546 |
| search | late-dex-pecharunt | 100 | 0.03 | 3521499 |
| search | exact-name | 100 | 0.02 | 6257822 |
| search | exact-dex | 100 | 0.02 | 6540222 |
| search | exact-miss | 100 | 0.01 | 7427213 |
| sprite-rendering | xterm-color-index | 500 | 1.33 | 375662 |
| sprite-rendering | render-png-small-16x16 | 500 | 25.03 | 19977 |
| sprite-rendering | render-png-medium-64x64 | 500 | 91.96 | 5437 |
| startup | import-search-module | 25 | 518.19 | 48 |
| startup | import-ui-root | 25 | 7558.98 | 3 |
| startup | create-initial-search-state | 25 | 1557.47 | 16 |
| startup | create-initial-detail-state | 25 | 1523.89 | 16 |
| type-matchups | single-electric | 1000000 | 576.31 | 1735186 |
| type-matchups | dual-water-flying | 1000000 | 768.30 | 1301569 |
| type-matchups | dual-fire-flying | 1000000 | 800.64 | 1249006 |
| type-matchups | dual-ghost-steel | 1000000 | 955.41 | 1046673 |
