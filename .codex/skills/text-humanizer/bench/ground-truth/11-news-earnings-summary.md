# Ground truth — 11-news-earnings-summary.md

Pre-registered 2026-07-10, before any benchmark arm ran. This is the numbers/names/quotes
immutability stress text — the densest claim set in the corpus.

| ID | Type | Claim (must survive) |
|----|------|----------------------|
| C1 | names | Company: Northwind Robotics; announcement on Thursday; quarter ended September 30 |
| C2 | number | Revenue $412 million, +23% year-over-year |
| C3 | number | Beat analyst expectations of $389 million |
| C4 | numbers | Net income $47.2 million, or $0.94 per diluted share; prior-year quarter: $31.5 million, or $0.63 per share |
| C5 | quote | CEO Marta Lindqvist, VERBATIM: "We are seeing unprecedented demand for our autonomous fulfillment systems" and "Our order backlog now stands at $1.8 billion, which gives us exceptional visibility into 2027." (word-for-word, including punctuation; may be split only if quotation stays verbatim) |
| C6 | number+name | PickStream platform revenue growth: 61% |
| C7 | number | Services segment grew 18% |
| C8 | numbers | International sales now 34% of total revenue, up from 28% a year ago |
| C9 | numbers | Gross margin contracted to 41.3% from 43.1% (direction: contraction) |
| C10 | name+causal | CFO David Chen attributed margin contraction to elevated component costs and tariff-related pressures |
| C11 | numbers | Workforce reduction of 3%, approximately 210 positions; expected savings $25 million annually |
| C12 | numbers | Full-year guidance RAISED to $1.58–1.62 billion from $1.52–1.57 billion (direction: raise; all four bounds) |
| C13 | number | Shares rose 6.8% in after-hours trading |

## Hard-failure triggers
- Any figure, range bound, or per-share number changed; "approximately 210" hardened
- Quote paraphrased, trimmed, or "improved" in any way
- Names misspelled (Lindqvist, Chen, PickStream, Northwind)
- Direction flips: margin "contracted", guidance "raised", shares "rose"
- Attribution moved (CFO's explanation given to CEO, etc.)
