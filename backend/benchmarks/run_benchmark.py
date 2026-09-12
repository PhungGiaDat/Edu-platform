"""Agentic RAG benchmark runner.

Usage (run from backend/):
    # 1. Generate dataset (once):
    python -m benchmarks.generate_dataset --from-qdrant

    # 2. Baseline run (60 questions, in-process, judged):
    python -m benchmarks.run_benchmark

    # 3. Baseline + A/B generator-model comparison on the core subset:
    python -m benchmarks.run_benchmark --ab

    # 4. Black-box HTTP mode (requires running uvicorn):
    python -m benchmarks.run_benchmark --mode http --base-url http://localhost:8000

    # Quick smoke run (~30 rows):   --quick
    # Limit rows:                   --limit N
    # Custom generator model:       --generator-model bai/deepseek-v4-pro
    #
    # NOTE: TokenRouter free channels (qwen/deepseek/nemotron) are currently
    # unavailable — the pipeline falls back to BAI (glm-5.3-flash). A/B compares
    # BAI-hosted generators via the "bai/" prefix; the judge defaults to
    # bai/gemini-3.8-flash (cross-model, avoids generator self-bias).

Outputs (backend/benchmarks/results/ + docs/report/):
    raw_baseline_<ts>.jsonl     per-question raw records
    raw_ab_<ts>.jsonl           A/B records (when --ab)
    summary_<ts>.csv / .json    flat CSV + aggregate JSON
    dashboard_<ts>.html         single-file HTML dashboard
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
if not (Path.cwd() / ".env").exists():
    os.chdir(BACKEND_ROOT)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass

CATALOG_MODELS = [
    "qwen/qwen3.8-max-free",
    "deepseek/deepseek-v4-pro-0813-free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
]
# TokenRouter free channels are currently down (503 no-channel / 403 no-credit);
# the pipeline falls back to BAI. A/B therefore compares BAI-hosted generators.
AB_MODELS = [
    "bai/glm-5.3-flash",
    "bai/deepseek-v4-pro",
    "bai/gemini-3.5-flash",
]
# Only glm-5.3-flash is accessible on the current BAI account (other models
# require a deposit) — judge defaults to it; self-bias caveat applies when the
# generator is also glm-5.3-flash and is recorded in the dashboard meta.
DEFAULT_JUDGE_MODEL = "bai/glm-5.3-flash"
RESULTS_DIR = BACKEND_ROOT / "benchmarks" / "results"
DOCS_REPORT_DIR = BACKEND_ROOT.parent / "docs" / "report"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Agentic RAG benchmark runner")
    parser.add_argument("--mode", choices=["inproc", "http"], default="inproc")
    parser.add_argument("--base-url", default="http://localhost:8000", help="HTTP mode base URL")
    parser.add_argument(
        "--dataset", type=Path, default=BACKEND_ROOT / "benchmarks" / "data" / "golden_qa.jsonl"
    )
    parser.add_argument("--judge-model", default=DEFAULT_JUDGE_MODEL)
    parser.add_argument("--generator-model", default=None, help="Override generator model for the whole run")
    parser.add_argument(
        "--validator",
        choices=["rule", "llm"],
        default=None,
        help="Validator mode override: rule = deterministic content protection (new), "
        "llm = legacy always-LLM validation; default = application settings",
    )
    parser.add_argument("--no-cache", dest="no_cache", action="store_true", default=True)
    parser.add_argument("--use-cache", dest="no_cache", action="store_false")
    parser.add_argument("--ab", action="store_true", help="Run generator-model A/B on the core subset")
    parser.add_argument("--quick", action="store_true", help="Run a ~30-row subset")
    parser.add_argument("--limit", type=int, default=None, help="Cap total rows")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds between questions (free-tier pacing)")
    parser.add_argument("--tag", default=None, help="Filename tag (defaults to baseline/ab + timestamp)")
    return parser.parse_args()


def subset_rows(rows: List[Dict[str, Any]], quick: bool, limit: Optional[int]) -> List[Dict[str, Any]]:
    selected = rows
    if quick:
        caps = {"vi_kid": 12, "en": 6, "ood": 6, "consistency_a": 3, "consistency_b": 3}
        kept: List[Dict[str, Any]] = []
        counts: Dict[str, int] = {}
        for row in rows:
            category = row["category"]
            if counts.get(category, 0) < caps.get(category, 0):
                kept.append(row)
                counts[category] = counts.get(category, 0) + 1
        selected = kept
    if limit:
        selected = selected[:limit]
    return selected


def core_subset(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """A/B subset: first 6 vi_kid + 6 en + 6 ood rows (18)."""
    kept: List[Dict[str, Any]] = []
    counts: Dict[str, int] = {}
    caps = {"vi_kid": 6, "en": 6, "ood": 6}
    for row in rows:
        category = row["category"]
        if category in caps and counts.get(category, 0) < caps[category]:
            kept.append(row)
            counts[category] = counts.get(category, 0) + 1
    return kept


# ────────────────────────── runners ──────────────────────────


async def run_row_inproc(
    row: Dict[str, Any],
    pipeline: Any,
    generator_model: Optional[str],
    session_id: str,
) -> Dict[str, Any]:
    from benchmarks.metrics import hit_at_k, mrr

    result = await pipeline.run(row["question"], session_id, generator_model=generator_model)
    sources = result.get("sources") or []
    stage_times = result.get("stage_times") or {}
    return {
        "sources": sources,
        "latency": {
            "planner": stage_times.get("planner"),
            "generator": stage_times.get("generator"),
            "retrieval": stage_times.get("retrieval"),
            "validator": stage_times.get("validator"),
            "e2e": stage_times.get("e2e"),
        },
        "tokens": result.get("tokens"),
        "retrieved_docs": result.get("retrieved_docs") or [],
        "hit1": hit_at_k(sources, row.get("expected_animal_en"), 1),
        "hit3": hit_at_k(sources, row.get("expected_animal_en"), 3),
        "mrr": mrr(sources, row.get("expected_animal_en")),
        "_pipeline": result,
    }


async def run_row_http(row: Dict[str, Any], base_url: str) -> Dict[str, Any]:
    import httpx

    from benchmarks.metrics import hit_at_k, mrr

    url = f"{base_url.rstrip('/')}/api/v1/chat/rag"
    started = time.perf_counter()
    error: Optional[str] = None
    response_text = ""
    sources: List[Dict[str, Any]] = []
    trace: List[str] = []
    cached = False
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                url,
                json={
                    "question": row["question"],
                    "session_id": f"bench-{row['id']}-{int(time.time())}",
                },
            )
            resp.raise_for_status()
            payload = resp.json()
        response_text = payload.get("response", "")
        sources = payload.get("sources") or []
        trace = payload.get("agent_trace") or []
        cached = bool(payload.get("cached"))
    except Exception as exc:  # noqa: BLE001
        error = repr(exc)
    e2e = time.perf_counter() - started
    return {
        "sources": sources,
        "latency": {"e2e": None if error else e2e},
        "tokens": None,
        "retrieved_docs": [],
        "hit1": hit_at_k(sources, row.get("expected_animal_en"), 1),
        "hit3": hit_at_k(sources, row.get("expected_animal_en"), 3),
        "mrr": mrr(sources, row.get("expected_animal_en")),
        "_pipeline": {
            "response": response_text,
            "agent_trace": trace,
            "cached": cached,
        },
        "error": error,
    }


async def judge_row(
    record: Dict[str, Any], row: Dict[str, Any], judge_model: str
) -> None:
    """Attach the appropriate judge verdict to `record` (in-place)."""
    from benchmarks import judge as judge_mod

    response_text = record.get("response") or ""
    if record.get("error"):
        return

    try:
        if row["category"] == "ood":
            verdict = await judge_mod.judge_refusal(row["question"], response_text, judge_model)
            if verdict:
                record["judge"] = verdict
            return

        context_docs = record.get("retrieved_docs") or []
        verdict = await judge_mod.judge_faithfulness(
            question=row["question"],
            response=response_text,
            context_docs=context_docs,
            golden_context=row.get("golden_context"),
            judge_model=judge_model,
        )
        if verdict:
            record["judge"] = verdict
    except Exception as exc:  # noqa: BLE001
        print(f"  [judge-error] {row['id']}: {exc!r}")


def build_record(
    row: Dict[str, Any],
    partial: Dict[str, Any],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    pipeline_result = partial.pop("_pipeline")
    return {
        "id": row["id"],
        "category": row["category"],
        "pair_id": row.get("pair_id"),
        "question": row["question"],
        "expected_animal_en": row.get("expected_animal_en"),
        "config": config,
        "response": pipeline_result.get("response"),
        "sources": partial["sources"],
        "agent_trace": pipeline_result.get("agent_trace") or [],
        "cached": bool(pipeline_result.get("cached")),
        "latency": partial["latency"],
        "tokens": partial.get("tokens"),
        "retrieved_docs": partial.get("retrieved_docs") or [],
        "hit1": partial["hit1"],
        "hit3": partial["hit3"],
        "mrr": partial["mrr"],
        "judge": {},
        "error": partial.get("error"),
    }


async def run_suite(
    rows: List[Dict[str, Any]],
    args: argparse.Namespace,
    generator_model: Optional[str],
    tag: str,
) -> List[Dict[str, Any]]:
    """Run + judge a list of rows; returns benchmark records."""
    if args.validator:
        from settings import settings as app_settings

        app_settings.VALIDATOR_MODE = args.validator

    pipeline = None
    if args.mode == "inproc":
        from benchmarks.instrumentation import InstrumentedPipeline

        pipeline = InstrumentedPipeline(no_cache=args.no_cache)

    records: List[Dict[str, Any]] = []
    config = {
        "mode": args.mode,
        "generator_model": generator_model or "default",
        "judge_model": args.judge_model,
        "no_cache": args.no_cache if args.mode == "inproc" else None,
        "validator_mode": args.validator or "settings",
    }

    total = len(rows)
    for index, row in enumerate(rows, 1):
        print(f"[{tag}] {index}/{total} {row['id']} ({row['category']}): {row['question'][:60]}")
        started = time.perf_counter()
        try:
            if args.mode == "inproc":
                session_id = f"bench-{row['id']}-{int(time.time())}"
                partial = await run_row_inproc(row, pipeline, generator_model, session_id)
            else:
                partial = await run_row_http(row, args.base_url)
        except Exception as exc:  # noqa: BLE001
            print(f"  [run-error] {row['id']}: {exc!r}")
            partial = {
                "sources": [], "latency": {"e2e": None}, "tokens": None,
                "retrieved_docs": [], "hit1": False, "hit3": False, "mrr": 0.0,
                "error": repr(exc), "_pipeline": {"response": "", "agent_trace": [], "cached": False},
            }

        record = build_record(row, partial, config)
        trace = record["agent_trace"]
        cached_note = " CACHED" if record["cached"] else ""
        e2e_note = (
            f"{record['latency']['e2e'] * 1000:.0f}ms" if record["latency"].get("e2e") is not None else "ERR"
        )
        print(
            f"  -> {e2e_note}{cached_note}"
            f" | hit1={record['hit1']} | sources={len(record['sources'])}"
            f" | trace={' > '.join(trace[:4])}"
        )

        await judge_row(record, row, args.judge_model)
        if record.get("judge"):
            print(f"  [judge] {json.dumps(record['judge'], ensure_ascii=False)[:180]}")
        records.append(record)
        elapsed = time.perf_counter() - started
        if index < total and elapsed < args.delay:
            await asyncio.sleep(args.delay - elapsed)

    # consistency pair judging (both answers available now)
    by_id = {record["id"]: record for record in records}
    from benchmarks import judge as judge_mod

    for row in rows:
        if row["category"] != "consistency_a":
            continue
        pair_id = row["pair_id"]
        record_a = by_id.get(f"{pair_id}-a")
        record_b = by_id.get(f"{pair_id}-b")
        if not record_a or not record_b:
            continue
        if record_a.get("error") or record_b.get("error"):
            continue
        verdict = await judge_mod.judge_consistency(
            record_a["question"], record_a.get("response") or "",
            record_b["question"], record_b.get("response") or "",
            args.judge_model,
        )
        if verdict:
            for record in (record_a, record_b):
                record["judge"] = {**record["judge"], **verdict}
            print(f"  [consistency] {pair_id}: {verdict['consistent']} ({'; '.join(verdict['reasons'])[:100]})")

    return records


def write_raw(records: List[Dict[str, Any]], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")
    return path


async def main_async(args: argparse.Namespace) -> int:
    from benchmarks.metrics import summarize, summarize_ab
    from benchmarks.report import write_csv, write_dashboard, write_summary_json

    # judge calls may use "bai/<model>" strings — ensure the routing patch is
    # active in every mode (inproc installs it again inside the pipeline).
    if args.mode != "inproc":
        from benchmarks.instrumentation import TokenCollector, install_token_collector

        install_token_collector(TokenCollector())

    print(f"[load] dataset: {args.dataset}")
    rows = [json.loads(line) for line in args.dataset.read_text(encoding="utf-8").splitlines() if line.strip()]
    rows = subset_rows(rows, args.quick, args.limit)
    print(f"[load] running {len(rows)} rows | mode={args.mode} | judge={args.judge_model}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    baseline_tag = args.tag or "baseline"

    baseline_records = await run_suite(rows, args, args.generator_model, baseline_tag)
    all_records = list(baseline_records)

    ab_table = None
    ab_records: List[Dict[str, Any]] = []
    if args.ab:
        core = core_subset(rows)
        print(f"\n[ab] generator-model A/B over {len(core)} core rows")
        for model in AB_MODELS:
            if args.generator_model and model == args.generator_model:
                continue  # baseline already covers this config
            print(f"[ab] generator = {model}")
            ab_records.extend(await run_suite(core, args, model, f"ab-{model.split('/')[-1][:20]}"))
        all_records.extend(ab_records)
        ab_pool = list(ab_records)
        if args.generator_model:
            # include matching baseline rows so this config shows up in the table
            ab_pool = [r for r in baseline_records if r["id"] in {row["id"] for row in core}] + ab_pool
        # the default (fallback-path) config is always shown for comparison
        default_pool = [r for r in baseline_records if r["id"] in {row["id"] for row in core}]
        for record in default_pool:
            record = dict(record)
            record["config"] = {**record["config"], "generator_model": "default (fallback path)"}
            ab_pool.append(record)
        ab_table = summarize_ab(ab_pool)

    summary = summarize(baseline_records)

    # ── outputs ──
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = write_raw(baseline_records, RESULTS_DIR / f"raw_{baseline_tag}_{timestamp}.jsonl")
    if ab_records:
        write_raw(ab_records, RESULTS_DIR / f"raw_ab_{timestamp}.jsonl")

    csv_path = write_csv(all_records, RESULTS_DIR / f"summary_{timestamp}.csv")
    summary_path = write_summary_json(summary, ab_table, RESULTS_DIR / f"summary_{timestamp}.json")

    meta_lines = [
        f"Run: {timestamp} | mode: {args.mode} | rows: {len(baseline_records)} "
        f"| generator: {args.generator_model or 'default (deepseek-v4-pro)'}",
        f"Dataset: {args.dataset.name} | cache: {'bypassed' if args.no_cache else 'enabled'} "
        f"| A/B: {'yes' if args.ab else 'no'}",
    ]
    dashboards: List[Path] = [
        write_dashboard(
            baseline_records, summary, ab_table,
            {"lines": meta_lines, "judge_model": args.judge_model, "mode": args.mode,
             "dataset": str(args.dataset.name)},
            RESULTS_DIR / f"dashboard_{timestamp}.html",
        )
    ]
    docs_copy = DOCS_REPORT_DIR / f"BENCHMARK_DASHBOARD_{timestamp}.html"
    try:
        DOCS_REPORT_DIR.mkdir(parents=True, exist_ok=True)
        docs_copy.write_text(dashboards[0].read_text(encoding="utf-8"), encoding="utf-8")
        dashboards.append(docs_copy)
    except OSError:
        pass

    print("\n========== SUMMARY ==========")
    print(f"rows={summary['total']} by_category={summary['by_category']}")
    q = summary["quality"]
    r = summary["retrieval"]
    lat = summary["latency"]["e2e"]
    print(
        f"hit@1={r['hit1_rate']} | mrr={r['mrr']} | hallucination={q['hallucination_rate']}"
        f" | faithfulness_mean={q['faithfulness_mean']} | refusal_acc={q['refusal_accuracy']}"
        f" | consistency={q['consistency_rate']}"
    )
    print(f"e2e p50={lat['p50']:.2f}s p95={lat['p95']:.2f}s | tokens={summary['tokens']['total']}")
    print(f"pipeline_errors={summary['agentic']['pipeline_errors']} | errors={summary['errors']}")
    print("\n[outputs]")
    for path in (raw_path, csv_path, summary_path, *dashboards):
        print(f"  {path}")
    return 0


def main() -> int:
    args = parse_args()
    try:
        return asyncio.run(main_async(args))
    except KeyboardInterrupt:
        print("\n[aborted] interrupted by user")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
