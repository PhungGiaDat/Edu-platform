# Ground truth — 02-blog-coffee-brewing.md

Pre-registered 2026-07-10, before any benchmark arm ran.

| ID | Type | Claim (must survive) |
|----|------|----------------------|
| C1 | claim | Good home coffee doesn't require a café; achievable with right knowledge and a few tools |
| C2 | list | Four key brewing variables: grind size, water temperature, brew time, ratio (all four; count "four" may be dropped, items may not) |
| C3 | number | 1:16 ratio — one gram of coffee to sixteen grams of water — as a starting point for most methods (attributed to "experts agree" — attribution may be reworded/cut, ratio must survive) |
| C4 | number+range | Ideal water temperature: between 90 and 96 degrees Celsius |
| C5 | causal | Too-hot water extracts bitter compounds |
| C6 | causal | Too-cool water leaves the cup sour and underdeveloped |
| C7 | number | Beans begin losing aromatic complexity within two weeks of roasting |
| C8 | advice | Buy whole beans in small batches; grind just before brewing |
| C9 | list | Methods mentioned: pour-over, French press, AeroPress, cold brew (may be trimmed only if no method claim is asserted about a specific one; safest: all four survive — auditor labels a dropped method name as `dropped`) |

## Hard-failure triggers
- Ratio changed (e.g., 1:15), temperature range shifted, or Celsius silently becomes Fahrenheit
- "Two weeks" changed or strengthened ("beans go stale in two weeks" is a strength change — original says *begin losing* complexity)
- C5/C6 direction swapped (hot↔sour)
- New brewing facts, gear recommendations, or personal anecdotes added
