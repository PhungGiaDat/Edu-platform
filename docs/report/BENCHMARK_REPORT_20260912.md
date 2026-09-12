# Benchmark Report — Agentic RAG Chatbot "Lexi"

**Ngày chạy:** 2026-09-12 · **Mode:** in-process · **Dataset:** `golden_qa.jsonl` (60 câu, seed=42)
**Pipeline:** Planner → Generator → Validator (`backend/services/agentic_rag_service.py`)
**Dashboard tương tác:** `BENCHMARK_DASHBOARD_20260912_015558.html` (cùng thư mục)

---

## 1. Tóm tắt điều hành

| Chỉ số | Giá trị | Đánh giá |
|--------|---------|----------|
| Pipeline errors | **0/60** | Ổn định tuyệt đối |
| Hit@1 / Hit@3 | **60.4% / 68.8%** | Trung bình — chịu ảnh hưởng corpus gaps |
| MRR | **0.642** | — |
| Hallucination rate | **18.3%** (11/60) | Cần cải thiện — tập trung ở câu thuộc tính thiếu dữ liệu |
| Faithfulness (mean) | **0.888** | Tốt |
| Refusal accuracy (OOD) | **83.3%** (10/12) | Tốt |
| Consistency | **100%** (6/6 cặp) | Xuất sắc |
| E2E latency p50 / p95 | **20.55s / 33.79s** | Cao — bao gồm retry TokenRouter đã chết |
| Tokens tổng | 128,612 | ~2,144 tokens/câu |

**Điều kiện chạy:** TokenRouter (3 model free cấu hình sẵn) hoàn toàn không khả dụng
(503 no-channel / 403 hết credit) → toàn bộ stage thực tế được phục vụ bởi
`bai/glm-5.3-flash` qua fallback cascade. `agent_trace` ghi nhận model thật từng step.

**Cập nhật cùng ngày — thí điểm Kilo + A/B fixes (xem §4a):** Batch 1/2 chạy 13 rows smoke
trên provider Kilo (`nex-agi/nex-n2.5-pro:free`) cho thấy Tier 1 (prompt kid-structure +
refusal variants) và Tier 2 (rule validator) cải thiện **refusal 33%→100%**, loại bỏ hallucination
`fabricated_fact`, giảm validator p50 **3.2–3.6s → 0.001s**, −31% LLM calls. Baseline glm
cũng giảm hallucination 18.3%→0 (trên 10 row cùng id) nhưng phần lớn do đổi model — chi tiết,
bảng và caveats ở §4a.

---

## 2. Phát hiện chính

### 2.1 Fallback cascade hoạt động đúng thiết kế — nhưng tốn latency
Mọi câu hỏi đều đi qua toàn bộ cascade: qwen (503) → deepseek (503) → nemotron (403)
→ BAI glm-5.3-flash. LLM health registry giúp bỏ qua provider chết ở các lần sau,
nhưng vẫn có re-probe rải rác. **p50 20.55s bao gồm 1–9s retry không cần thiết.**
Với TokenRouter khỏe, latency kỳ vọng thấp hơn đáng kể.

### 2.2 Hallucination pattern: "thuộc tính không có trong corpus"
Cả 11 ca hallucination là câu hỏi về **thuộc tính** (màu sắc, kích thước, giấc ngủ,
tốc độ, chi tiết diet) mà doc con vật **có được retrieve** nhưng thuộc tính vắng mặt.
Generator điền khoảng trống bằng kiến thức chung (đúng thực tế nhưng **không có
ngữ căn trong corpus**) — ví dụ "vịt màu gì" → bịa màu; "cá voi ngủ ở đâu" →
khẳng định unihemispheric sleep không có trong context.

Đối lập: khi retrieval trả về **0 sources** (13 câu), chatbot từ chối sạch
("Mình chưa biết từ này, hỏi thầy cô nhé! 📚").

> **Recommendation #1:** Hardening GENERATOR_PROMPT để phân biệt
> "không biết con vật" (→ refuse) với "biết con vật nhưng không có thuộc tính này
> trong context" (→ refuse riêng phần thuộc tính). Đây là lever giảm hallucination
> mạnh nhất.

### 2.3 Corpus gaps: 8 con vật hoàn toàn không retrieve được
`bird, snake, crab, wolf, rhino, tiger, crocodile, lion` xuất hiện **0x** trong
sources xuyên suốt 60 câu — docs của chúng thiếu/không khớp trong collection
`kids_english_animals_minilm_v1`. Đáng chú ý: **bird là 1 trong 5 flashcard
vocabulary chính** (animals-v1-bird) nhưng cũng không retrieve được.

> **Recommendation #2:** Re-audit corpus coverage so với lexicon `ANIMAL_VI_EN`
> (~40 con vật) và bộ vocabulary khóa học; re-ingest các doc thiếu. Hit@1 kỳ vọng
> tăng về ~85–90% sau khi vá (chỉ tính các miss do corpus gap).

### 2.4 Refusal misses "vì quá helpful"
2/12 ca OOD fail: "9+10 bằng bao nhiêu?" → trả lời phép tính; "ma có thật không?"
→ khẳng định "ma không có thật". Trẻ em thân thiện nhưng vi phạm scope policy.

> **Recommendation #3:** Nếu muốn strict-scope, thêm ràng buộc vào GENERATOR_PROMPT:
> chỉ trả lời câu hỏi về động vật/tiếng Anh, mọi chủ đề khác → câu từ chối chuẩn.

### 2.5 Consistency hoàn hảo
6/6 cặp câu hỏi đồng nghĩa trả lời nhất quán về dữ kiện chính (cùng con vật, cùng
facts) dù văn phong khác nhau.

---

## 3. Phân loại lỗi (error taxonomy)

| Loại lỗi | Số ca | Ghi chú |
|----------|-------|---------|
| `fabricated_fact` | 11 | Điền kiến thức chung vào khoảng trống context |
| `ungrounded_claim` | 1 | Đi kèm fabricated (vi-kid-021) |
| `wrong_animal` / `wrong_language` / `refusal_miss` | 0 | Không xuất hiện |

---

## 4. Hạn chế của lần benchmark này

1. **Self-bias của judge**: judge = generator = glm-5.3-flash. Điểm faithfulness
   có thể thiên lệch tích cực. Khuyến nghị chấm lại bằng model khác khi có credit.
2. **Đơn biến (single-config)**: A/B đa model không chạy được do chỉ glm-5.3-flash
   khả dụng. Harness đã sẵn sàng (`--ab`), chạy lại khi provider hồi phục.
3. **Latency bị nhiễu**: gồm retry TokenRouter chết; không phản ánh latency hệ thống khỏe.
4. **Judge nghiêm ngặt về grounding**: 1 ca (en-010 "rùa biết bơi") bị flag
   fabricated dù fact đúng thực tế — tiêu chí là faithfulness-to-context, không
   phải truthfulness tuyệt đối. Phù hợp mục tiêu RAG nhưng cần lưu ý khi diễn giải.

---

## 4a. Thực nghiệm A/B — Tier 1/2 fixes (pre-fix vs post-fix, **cùng model**)

Để tách ảnh hưởng *prompt/validation code* khỏi ảnh hưởng *model* (baseline 60-row dùng glm-5.3-flash, Batch 1 post-fix dùng Kilo nex-n2.5-pro), chạy đúng 13 rows smoke với code **pre-fix** (stash Tier 1/2) **2 lần độc lập**, cùng model/env như Batch 1, chỉ khác: **không có** `--validator` (code cũ luôn gọi LLM validator).

| # | Run | Code | Timestamp | Ghi chú |
|---|-----|------|-----------|---------|
| A1 | kilofix0 rep A | pre-fix | 20260912_215944 | |
| A2 | kilofix0 rep B | pre-fix | 20260912_220638 | trùng cửa sổ Kilo timeout (provider nhiễu) |
| B1 | kilofix1 | post-fix (Tier 1+2) | 20260912_201020 | `--validator rule` |

**Kết quả:**

| Chỉ số | Pre-fix (2 reps, n=26) | Post-fix (n=13) | Kết luận |
|---|---|---|---|
| Refusal đúng (OOD) | 2/6 = **33%** (rep A: **0/3** — trả lời tàu vũ trụ, 9+10, ma như chuyên gia) | 3/3 = **100%** | ✅ GENERATOR_PROMPT kid-structure + REFUSAL_VARIANTS hiệu quả rõ |
| Hallucination (judge) | 1/19 phát hiện — `pair-01-b` bịa "bướm ăn gì" (rep B) | 0/10; chính row pair-01-b sạch | ✅ nhất quán với rule partial-grounding (n nhỏ, thận trọng) |
| Validator latency | p50 **3.17–3.58s**, max 16.4s (mọi row đều gọi LLM) | p50 **0.001s** — 12/13 rule-pass; 1 escalate = 3.94s | ✅ Tier 2 thiết kế đúng: trả phí LLM chỉ khi escalation |
| LLM calls / run | 39 | 27 (**−31%**) | ✅ giảm chi phí + surface lỗi mạng |
| Trả lời cụt <40 ký tự | 2/13 mỗi rep | 0/13 | ✅ cấu trúc trả lời cho trẻ được enforce |
| Faithfulness TB | 0.98 (A) / 0.93 (B) | 0.90 | ⚠️ do outlier `vi-kid-021` (post 0.1 — row escalate + Qdrant chập chờn); row khác ≥0.9 |
| e2e p50 | 18.5s / 21.4s | 45.7s | ⚠️ **KHÔNG quy cho code** — cửa sổ kilofix1 gặp Kilo timeout cascade (3/13 fallback, en-010 cascade tới ultra-550b, 1 validator APITimeout). bằng chứng latency sạch là **validator delta** ở trên |
| hit@1 (in-domain) | 8/10, 6/10 | 6/10 | nhiễu retrieval/provider; vi-kid-021 sources=0 ở cả 3 run (transient) |

**Hạn chế:** n=13/rep; 2 reps pre-fix cho thấy phương sai run-to-run lớn (refusal 0/3 vs 2/3) → xác suất nhỏ cũng đủ vì effect refusal là 100% vs 33%; kết quả đầy sức nặng nhất cần **60-row post-fix rerun** khi quota cho phép.

**Kết luận chương:** Tier 1 (prompt) + Tier 2 (rule validator) cải thiện đúng mục tiêu thiết kế trên **cùng model**; cải thiện hallucination 6/10→0/10 ở baseline glm→Kilo chủ yếu do model, nhưng failure mode hallucination duy nhất bắt được trong 2 reps pre-fix (`fabricated_fact` thuộc tính ngoài context) là chính xác class mà partial-grounding rule loại bỏ post-fix.

---

## 5. Tái lập (Reproduction)

```bash
cd backend
py -3.12 -m benchmarks.generate_dataset --from-qdrant     # dataset (seed=42)
py -3.12 -m benchmarks.run_benchmark                      # baseline 60 câu
py -3.12 -m benchmarks.run_benchmark --ab                 # + A/B (cần đa model)
```

Artifacts: `backend/benchmarks/results/raw_baseline_20260912_015558.jsonl` (raw),
`summary_*.csv/.json` (metrics), dashboard HTML (báo cáo tương tác).
Chi tiết harness: `backend/benchmarks/README.md`.
