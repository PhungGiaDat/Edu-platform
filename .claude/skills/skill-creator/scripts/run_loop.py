#!/usr/bin/env python3
"""Run the eval + improve loop until all pass or max iterations reached.

Combines run_eval.py and improve_description.py in a loop, tracking history
and returning the best description found. Supports train/test split to prevent
overfitting.

Works with any OpenAI-compatible API — no dependency on Claude Code or
any specific AI provider.

Usage:
    python run_loop.py \\
        --eval-set evals.json \\
        --skill-path ./my-skill \\
        --model gpt-4o \\
        --max-iterations 5 \\
        --verbose

    # With a local model
    python run_loop.py \\
        --eval-set evals.json \\
        --skill-path ./my-skill \\
        --api-base-url http://localhost:11434/v1 --api-key ollama \\
        --model llama3.1:8b
"""

import argparse
import json
import random
import sys
import tempfile
import time
import webbrowser
from pathlib import Path

from scripts.generate_report import generate_html
from scripts.improve_description import improve_description
from scripts.run_eval import run_eval
from scripts.utils import parse_skill_md


def split_eval_set(
    eval_set: list[dict],
    holdout: float,
    seed: int = 42,
) -> tuple[list[dict], list[dict]]:
    """Split eval set into train/test, stratified by should_trigger."""
    random.seed(seed)

    trigger = [e for e in eval_set if e["should_trigger"]]
    no_trigger = [e for e in eval_set if not e["should_trigger"]]
    random.shuffle(trigger)
    random.shuffle(no_trigger)

    n_trigger_test = max(1, int(len(trigger) * holdout))
    n_no_trigger_test = max(1, int(len(no_trigger) * holdout))

    test_set = trigger[:n_trigger_test] + no_trigger[:n_no_trigger_test]
    train_set = trigger[n_trigger_test:] + no_trigger[n_no_trigger_test:]
    return train_set, test_set


def run_loop(
    eval_set: list[dict],
    skill_path: Path,
    model: str,
    description_override: str | None = None,
    num_workers: int = 10,
    timeout: int = 30,
    max_iterations: int = 5,
    runs_per_query: int = 3,
    trigger_threshold: float = 0.5,
    holdout: float = 0.4,
    api_base_url: str | None = None,
    api_key: str | None = None,
    verbose: bool = False,
    live_report_path: Path | None = None,
    log_dir: Path | None = None,
) -> dict:
    """Run the eval + improvement loop.

    Args:
        eval_set: List of {"query": str, "should_trigger": bool} entries.
        skill_path: Path to the skill directory.
        model: LLM model identifier (used for both eval and improvement).
        description_override: Start with this description instead of SKILL.md's.
        num_workers: Parallel threads for eval queries.
        timeout: Per-request timeout in seconds.
        max_iterations: Maximum improvement iterations.
        runs_per_query: Runs per query for reliability.
        trigger_threshold: YES rate threshold to count as triggered.
        holdout: Fraction of eval set held out for testing (0 to disable).
        api_base_url: OpenAI-compatible API base URL.
        api_key: API key.
        verbose: Print iteration progress to stderr.
        live_report_path: Write live HTML report here during the loop.
        log_dir: Directory to save per-iteration transcripts.

    Returns:
        Dict with best description, scores, and full history.
    """
    name, original_description, content = parse_skill_md(skill_path)
    current_description = description_override or original_description

    # Train/test split
    if holdout > 0:
        train_set, test_set = split_eval_set(eval_set, holdout)
        if verbose:
            print(f"Split: {len(train_set)} train, {len(test_set)} test (holdout={holdout})",
                  file=sys.stderr)
    else:
        train_set = eval_set
        test_set = []

    history = []
    exit_reason = "unknown"

    for iteration in range(1, max_iterations + 1):
        if verbose:
            print(f"\n{'='*60}", file=sys.stderr)
            print(f"Iteration {iteration}/{max_iterations}", file=sys.stderr)
            print(f"Description: {current_description}", file=sys.stderr)

        # Run eval on train + test in one batch for parallelism
        all_queries = train_set + test_set
        t0 = time.time()
        all_results = run_eval(
            eval_set=all_queries,
            skill_name=name,
            description=current_description,
            model=model,
            num_workers=num_workers,
            timeout=timeout,
            runs_per_query=runs_per_query,
            trigger_threshold=trigger_threshold,
            api_base_url=api_base_url,
            api_key=api_key,
        )
        eval_elapsed = time.time() - t0

        # Split results back into train/test
        train_queries = {q["query"] for q in train_set}
        train_result_list = [r for r in all_results["results"] if r["query"] in train_queries]
        test_result_list = [r for r in all_results["results"] if r["query"] not in train_queries]

        train_passed = sum(1 for r in train_result_list if r["pass"])
        train_total = len(train_result_list)
        train_summary = {"passed": train_passed, "failed": train_total - train_passed, "total": train_total}
        train_results = {"results": train_result_list, "summary": train_summary}

        if test_set:
            test_passed = sum(1 for r in test_result_list if r["pass"])
            test_total = len(test_result_list)
            test_summary = {"passed": test_passed, "failed": test_total - test_passed, "total": test_total}
            test_results = {"results": test_result_list, "summary": test_summary}
        else:
            test_results = None
            test_summary = None

        history.append({
            "iteration": iteration,
            "description": current_description,
            "train_passed": train_summary["passed"],
            "train_failed": train_summary["failed"],
            "train_total": train_summary["total"],
            "train_results": train_results["results"],
            "test_passed": test_summary["passed"] if test_summary else None,
            "test_failed": test_summary["failed"] if test_summary else None,
            "test_total": test_summary["total"] if test_summary else None,
            "test_results": test_results["results"] if test_results else None,
            # backward-compat keys for report generator
            "passed": train_summary["passed"],
            "failed": train_summary["failed"],
            "total": train_summary["total"],
            "results": train_results["results"],
        })

        if live_report_path:
            partial = {
                "original_description": original_description,
                "best_description": current_description,
                "best_score": "in progress",
                "iterations_run": len(history),
                "holdout": holdout,
                "train_size": len(train_set),
                "test_size": len(test_set),
                "history": history,
            }
            live_report_path.write_text(generate_html(partial, auto_refresh=True, skill_name=name))

        if verbose:
            def _print_stats(label, results, elapsed):
                pos = [r for r in results if r["should_trigger"]]
                neg = [r for r in results if not r["should_trigger"]]
                tp = sum(r["triggers"] for r in pos)
                fp = sum(r["triggers"] for r in neg)
                pos_runs = sum(r["runs"] for r in pos)
                neg_runs = sum(r["runs"] for r in neg)
                fn = pos_runs - tp
                tn = neg_runs - fp
                total = tp + tn + fp + fn
                prec = tp / (tp + fp) if (tp + fp) > 0 else 1.0
                rec = tp / (tp + fn) if (tp + fn) > 0 else 1.0
                acc = (tp + tn) / total if total > 0 else 0.0
                passed_q = sum(1 for r in results if r["pass"])
                print(f"{label}: {passed_q}/{len(results)} passed  "
                      f"precision={prec:.0%} recall={rec:.0%} accuracy={acc:.0%}"
                      + (f" ({elapsed:.1f}s)" if elapsed else ""),
                      file=sys.stderr)
                for r in results:
                    status = "PASS" if r["pass"] else "FAIL"
                    print(f"  [{status}] {r['triggers']}/{r['runs']} expected={r['should_trigger']}: "
                          f"{r['query'][:60]}", file=sys.stderr)

            _print_stats("Train", train_results["results"], eval_elapsed)
            if test_summary:
                _print_stats("Test ", test_results["results"], 0)

        if train_summary["failed"] == 0:
            exit_reason = f"all_passed (iteration {iteration})"
            if verbose:
                print(f"\nAll train queries passed on iteration {iteration}!", file=sys.stderr)
            break

        if iteration == max_iterations:
            exit_reason = f"max_iterations ({max_iterations})"
            break

        # Improve description (blind test scores from history to prevent leakage)
        if verbose:
            print("\nImproving description...", file=sys.stderr)

        t0 = time.time()
        blinded_history = [
            {k: v for k, v in h.items() if not k.startswith("test_")}
            for h in history
        ]
        current_description = improve_description(
            skill_name=name,
            skill_content=content,
            current_description=current_description,
            eval_results=train_results,
            history=blinded_history,
            model=model,
            api_base_url=api_base_url,
            api_key=api_key,
            log_dir=log_dir,
            iteration=iteration,
            test_results=test_results,
        )

        if verbose:
            print(f"Proposed ({time.time() - t0:.1f}s): {current_description}", file=sys.stderr)

    # Pick best by test score if available, otherwise train score
    if test_set:
        best = max(history, key=lambda h: h["test_passed"] or 0)
        best_score = f"{best['test_passed']}/{best['test_total']}"
    else:
        best = max(history, key=lambda h: h["train_passed"])
        best_score = f"{best['train_passed']}/{best['train_total']}"

    if verbose:
        print(f"\nExit: {exit_reason}", file=sys.stderr)
        print(f"Best score: {best_score} (iteration {best['iteration']})", file=sys.stderr)
        print(f"Best description: {best['description']}", file=sys.stderr)

    return {
        "exit_reason": exit_reason,
        "original_description": original_description,
        "best_description": best["description"],
        "best_score": best_score,
        "best_train_score": f"{best['train_passed']}/{best['train_total']}",
        "best_test_score": f"{best['test_passed']}/{best['test_total']}" if test_set else None,
        "final_description": current_description,
        "iterations_run": len(history),
        "holdout": holdout,
        "train_size": len(train_set),
        "test_size": len(test_set),
        "history": history,
    }


# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Run eval + improve loop for a skill description")
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--model", required=True, help="LLM model identifier")
    parser.add_argument("--description", default=None, help="Override starting description")
    parser.add_argument("--api-base-url", default=None,
                        help="OpenAI-compatible API base URL (overrides LLM_API_BASE_URL env var)")
    parser.add_argument("--api-key", default=None,
                        help="API key (overrides LLM_API_KEY env var)")
    parser.add_argument("--num-workers", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--max-iterations", type=int, default=5)
    parser.add_argument("--runs-per-query", type=int, default=3)
    parser.add_argument("--trigger-threshold", type=float, default=0.5)
    parser.add_argument("--holdout", type=float, default=0.4,
                        help="Fraction held out for testing (0 to disable)")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--report", default="auto",
                        help="HTML report path ('auto'=temp file, 'none'=disabled)")
    parser.add_argument("--results-dir", default=None,
                        help="Save results.json, report.html, logs/ here")
    args = parser.parse_args()

    eval_set = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, _, _ = parse_skill_md(skill_path)

    # Live report
    if args.report != "none":
        if args.report == "auto":
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            live_report_path = Path(tempfile.gettempdir()) / f"skill_report_{skill_path.name}_{timestamp}.html"
        else:
            live_report_path = Path(args.report)
        live_report_path.write_text(
            "<html><body><h1>Starting optimization loop...</h1>"
            "<meta http-equiv='refresh' content='5'></body></html>"
        )
        webbrowser.open(str(live_report_path))
    else:
        live_report_path = None

    results_dir = None
    if args.results_dir:
        timestamp = time.strftime("%Y-%m-%d_%H%M%S")
        results_dir = Path(args.results_dir) / timestamp
        results_dir.mkdir(parents=True, exist_ok=True)

    log_dir = results_dir / "logs" if results_dir else None

    output = run_loop(
        eval_set=eval_set,
        skill_path=skill_path,
        model=args.model,
        description_override=args.description,
        num_workers=args.num_workers,
        timeout=args.timeout,
        max_iterations=args.max_iterations,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        holdout=args.holdout,
        api_base_url=args.api_base_url,
        api_key=args.api_key,
        verbose=args.verbose,
        live_report_path=live_report_path,
        log_dir=log_dir,
    )

    json_output = json.dumps(output, indent=2)
    print(json_output)

    if results_dir:
        (results_dir / "results.json").write_text(json_output)

    if live_report_path:
        live_report_path.write_text(generate_html(output, auto_refresh=False, skill_name=name))
        print(f"\nReport: {live_report_path}", file=sys.stderr)

    if results_dir and live_report_path:
        (results_dir / "report.html").write_text(
            generate_html(output, auto_refresh=False, skill_name=name)
        )
        print(f"Results: {results_dir}", file=sys.stderr)


if __name__ == "__main__":
    main()
