# Agentic RAG Benchmark Harness

Benchmark suite cho chatbot **Agentic RAG "Lexi"** (Planner → Generator → Validator pipeline,
`services/agentic_rag_service.py`).

## Kiến trúc được đo

```
Question ─► Planner (JSON plan: topic/keywords/difficulty/language)
        ─► Generator (Qdrant retrieval + LLM draft)
        ─► Validator (age-appropriateness + dedup)
        ─► Response {response, sources, cached, agent_trace}
```

- Retrieval: Qdrant Cloud Inference (`all-MiniLM-L6-v2`, safety filter, VN→EN lexicon expansion)
- LLM: ModelRouter cascade (TokenRouter → BAI fallback), circuit breaker, tenacity retry
- Cache: 24h TTL (bypass mặc định khi benchmark để đo cold-run)

## Sử dụng

Chạy từ thư mục `backend/` với Python 3.12 (env có đủ `langchain_openai`, `qdrant_client`):

```bash
# 1. Sinh dataset golden-QA (60 câu, deterministic seed=42)
#    --from-qdrant: làm giàu golden_context từ corpus Qdrant sống
python -m benchmarks.generate_dataset --from-qdrant

# 2. Baseline run đầy đủ (60 câu + LLM-judge, ~35 phút)
python -m benchmarks.run_benchmark

# 3. Quick run (~30 câu)
python -m benchmarks.run_benchmark --quick

# 4. A/B so sánh generator model trên core subset (18 câu × 3 model)
#    (yêu cầu credentials cho phép đa model — xem "Trạng thái provider")
python -m benchmarks.run_benchmark --ab

# 5. Black-box HTTP mode (cần uvicorn đang chạy)
python -m benchmarks.run_benchmark --mode http --base-url http://localhost:8000

# 6. Smoke test nhanh (13 câu) với validator rule deterministic:
python -m benchmarks.run_benchmark --dataset benchmarks/data/smoke_qa.jsonl --validator rule --tag mytag
```

### Cờ `--validator` (Tier 2 — content protection)

| Giá trị | Hành vi |
|---------|---------|
| `rule` | Validator tất định (`services/rag_content_rules.py`): banned terms, coverage, jaccard dedup, refusal-without-grounding → chỉ escalate lên LLM khi nghi vấn. p50 ≈ 1ms. |
| `llm` | Ép dùng LLM-validator cho mọi draft (hành vi legacy trước Tier 2) — dùng để A/B latency. |
| (bỏ trống) | Theo `settings.VALIDATOR_MODE` (mặc định production = `rule`). |

Cờ này monkeypatch `settings.VALIDATOR_MODE` trong phiên benchmark (không đổi production)
và mode hiệu dụng được ghi vào `config` của mọi row trong raw JSONL.

### Chạy với provider phụ (Kilo Code gateway, model `:free`)

Key + override đặt ở file env NGOÀI repo (không bao giờ commit), ví dụ
`%LOCALAPPDATA%\...\bench_kilo.env` với `TOKENROUTER_BASE_URL=https://api.kilo.ai/api/gateway/v1`,
`MODEL_*` trỏ model `:free`, `BAI_API_KEY=""` để loại BAI khỏi cascade. OS env thắng `.env`
(pydantic-settings priority) → không cần sửa code:

```bash
set -a; source /path/to/bench_kilo.env; set +a
python -m benchmarks.run_benchmark --dataset benchmarks/data/smoke_qa.jsonl \
  --generator-model nex-agi/nex-n2.5-pro:free --judge-model nex-agi/nex-n2.5-pro:free \
  --validator rule --delay 1.5 --tag kilofix1
```

### Dataset distribution (60 câu)

| Nhóm | Số câu | Mô tả |
|------|--------|-------|
| `vi_kid` | 24 | Câu hỏi tiếng Việt tự nhiên kiểu trẻ em 5-10 tuổi |
| `en` | 12 | Câu hỏi tiếng Anh in-domain |
| `ood` | 12 | Câu ngoài corpus → kỳ vọng chatbot từ chối đúng cách |
| `consistency_a/b` | 6+6 | 6 cặp hỏi cùng con vật, 2 cách diễn đạt → đo consistency |

### Metrics

- **Retrieval**: hit@1, hit@3, MRR (từ `sources[]` trong response)
- **Answer quality**: LLM-as-judge — faithfulness (0-1), hallucination (bool),
  error taxonomy (`fabricated_fact` / `wrong_animal` / `wrong_language` /
  `ungrounded_claim` / `refusal_miss`), kèm lý do trích dẫn
- **Refusal accuracy**: câu OOD được từ chối đúng cách ("Mình chưa biết từ này...")
- **Consistency**: cặp câu hỏi cùng ý → trả lời nhất quán về dữ kiện chính
- **Performance**: latency per-stage (planner/generator/retrieval/validator) + E2E p50/p95
- **Agentic behavior**: planner JSON validity, fallback rate, validator edit rate,
  cache hit, pipeline errors (từ `agent_trace[]`)
- **Token usage**: prompt/completion/total (qua LangChain callbacks)

### Outputs

```
benchmarks/results/raw_<tag>_<ts>.jsonl   # raw per-question records
benchmarks/results/summary_<ts>.csv       # flat CSV (Excel/Sheets friendly)
benchmarks/results/summary_<ts>.json      # aggregate JSON
benchmarks/results/dashboard_<ts>.html    # single-file HTML dashboard (offline OK)
docs/report/BENCHMARK_DASHBOARD_<ts>.html # bản copy cho báo cáo tốt nghiệp
```

Dashboard là một file HTML tự chứa (inline CSS/JS, không CDN) — mở offline được,
table sortable, biểu đồ latency per-question dạng stacked bar.

## Trạng thái provider (cập nhật 2026-09-12)

| Provider | Model | Trạng thái khi benchmark |
|----------|-------|--------------------------|
| TokenRouter | qwen3.8-max-free | ❌ 503 "No available channel" |
| TokenRouter | deepseek-v4-pro-0813-free | ❌ 503 "No available channel" |
| TokenRouter | nemotron-3-nano:free | ❌ 403 credit limit $0 |
| BAI | glm-5.3-flash | ✅ duy nhất khả dụng |
| BAI | các model khác (47 models) | ❌ 403 "Deposit required" |
| Kilo Code gateway (`api.kilo.ai`, OpenAI-compatible) | model trả phí | ❌ 401 `PAID_MODEL_AUTH_REQUIRED` (key chưa có credit) |
| Kilo Code gateway | `:free` (17 model) | ✅ hoạt động — `nex-agi/nex-n2.5-pro:free` tốt nhất (VN thiếu nhi + JSON), `nemotron-3-ultra-550b:free` fallback; quota RPD không lộ qua header, model free có thể hết hạn giữa ngày |

Hệ quả:
1. **Baseline run** chạy end-to-end nhờ fallback cascade → mọi stage thực tế phục vụ
   bởi `bai/glm-5.3-flash`. `agent_trace` ghi model thật nên kết quả trung thực.
2. **A/B đa model** chưa chạy được — cần nạp credit BAI (unlock premium models) hoặc
   TokenRouter hồi phục. Harness đã sẵn sàng: A/B so sánh `bai/<model>` qua prefix.
3. **Self-bias caveat**: khi judge = generator = glm-5.3-flash, điểm faithfulness
   có thể thiên lệch. Judge dùng temperature thấp + tiêu chí nghiêm ngặt, nhưng
   cần nêu caveat khi trích dẫn trong báo cáo tốt nghiệp.

## Thiết kế kỹ thuật

- **Không sửa production code**: instrumentation patch instance-level
  (`_planner`/`_generator`/`_validator` timing), module-level factory patch
  (token callbacks, `bai/` prefix routing), cache bypass qua method replacement.
- **Rate-limit friendly**: chạy tuần tự + `--delay` (mặc định 1s) + pipeline tự có
  `INTER_AGENT_DELAY=1s` giữa các agent.
- **Deterministic dataset**: seed cố định → golden_qa.jsonl tái lập được, commit vào git.
- **Judge JSON parsing**: fence-tolerant, enum-normalized, fail → `None` (không crash).
- **Không đụng DB**: benchmark gọi service trực tiếp (không qua API layer) nên
  không ghi chat log; PG lỗi → graceful degradation ("Không có lịch sử").

## Hạn chế đã biết

1. Token usage chỉ chính xác ở in-process mode (HTTP mode không parse được usage).
2. HTTP mode không có retrieved context text → judge chỉ dựa golden_context.
3. Judge fallback cascade đi qua các model TokenRouter đã down → thêm ~2-5s latency
   cho mỗi lần judge (retry nhanh vì 503/403 là permanent error, không retry).
4. Một số con vật không có docs trong corpus (vd: `lion`) → retrieval miss thật,
   không phải lỗi dataset.
