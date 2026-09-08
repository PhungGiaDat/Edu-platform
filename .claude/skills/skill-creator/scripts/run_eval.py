#!/usr/bin/env python3
"""Run trigger evaluation for a skill description.

Tests whether an LLM would trigger (use) a skill for a set of queries.
Works with any OpenAI-compatible API — no dependency on Claude Code or
any specific AI provider.

Outputs results as JSON.

Usage:
    python run_eval.py --eval-set evals.json --skill-path ./my-skill --model gpt-4o
    python run_eval.py --eval-set evals.json --skill-path ./my-skill \\
        --api-base-url http://localhost:11434/v1 --api-key ollama --model llama3.1:8b

Eval set format (evals.json):
    [
        {"query": "create a word document", "should_trigger": true},
        {"query": "write a python script", "should_trigger": false}
    ]
"""

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from scripts.llm_client import create_client
from scripts.utils import parse_skill_md

# ──────────────────────────────────────────────────────────────
# Core evaluation logic
# ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a routing assistant. Your job is to decide whether a specialized "
    "skill should be invoked for a given user query. You will be shown one skill "
    "and one query. Answer with only YES or NO."
)

USER_PROMPT_TEMPLATE = """\
Available skill:
  Name: {skill_name}
  Description: {skill_description}

User query: {query}

Should the "{skill_name}" skill be used to handle this query?
Answer with only YES or NO."""


def run_single_query(
    query: str,
    skill_name: str,
    skill_description: str,
    model: str,
    api_base_url: str | None,
    api_key: str | None,
    timeout: int,
) -> bool:
    """Ask the LLM whether it would trigger the skill for this query.

    Returns True if the LLM answers YES, False otherwise.
    """
    client = create_client(api_base_url, api_key)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(
                skill_name=skill_name,
                skill_description=skill_description,
                query=query,
            )},
        ],
        max_tokens=5,
        temperature=0,
        timeout=timeout,
    )

    answer = response.choices[0].message.content.strip().upper()
    return answer.startswith("YES")


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    model: str,
    num_workers: int,
    timeout: int,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    api_base_url: str | None = None,
    api_key: str | None = None,
) -> dict:
    """Run the full eval set and return results.

    Args:
        eval_set: List of {"query": str, "should_trigger": bool} entries.
        skill_name: Name of the skill being evaluated.
        description: Skill description to test.
        model: LLM model identifier.
        num_workers: Number of parallel threads.
        timeout: Per-request timeout in seconds.
        runs_per_query: How many times to run each query (for reliability).
        trigger_threshold: Fraction of runs that must return YES to count as triggered.
        api_base_url: OpenAI-compatible API base URL.
        api_key: API key.

    Returns:
        Dict with per-query results and summary statistics.
    """
    query_triggers: dict[str, list[bool]] = {}
    query_items: dict[str, dict] = {}

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        future_to_query = {}
        for item in eval_set:
            query_items[item["query"]] = item
            for _ in range(runs_per_query):
                future = executor.submit(
                    run_single_query,
                    item["query"],
                    skill_name,
                    description,
                    model,
                    api_base_url,
                    api_key,
                    timeout,
                )
                future_to_query[future] = item["query"]

        for future in as_completed(future_to_query):
            query = future_to_query[future]
            if query not in query_triggers:
                query_triggers[query] = []
            try:
                query_triggers[query].append(future.result())
            except Exception as e:
                print(f"Warning: query failed ({e})", file=sys.stderr)
                query_triggers[query].append(False)

    results = []
    for query, triggers in query_triggers.items():
        item = query_items[query]
        trigger_rate = sum(triggers) / len(triggers)
        should_trigger = item["should_trigger"]
        did_pass = (
            trigger_rate >= trigger_threshold if should_trigger
            else trigger_rate < trigger_threshold
        )
        results.append({
            "query": query,
            "should_trigger": should_trigger,
            "trigger_rate": trigger_rate,
            "triggers": sum(triggers),
            "runs": len(triggers),
            "pass": did_pass,
        })

    passed = sum(1 for r in results if r["pass"])
    total = len(results)

    return {
        "skill_name": skill_name,
        "description": description,
        "results": results,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
        },
    }


# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Evaluate whether an LLM triggers a skill for a set of queries"
    )
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--model", required=True, help="LLM model identifier")
    parser.add_argument("--description", default=None, help="Override description to test")
    parser.add_argument("--api-base-url", default=None,
                        help="OpenAI-compatible API base URL (overrides LLM_API_BASE_URL env var)")
    parser.add_argument("--api-key", default=None,
                        help="API key (overrides LLM_API_KEY env var)")
    parser.add_argument("--num-workers", type=int, default=10,
                        help="Number of parallel threads (default: 10)")
    parser.add_argument("--timeout", type=int, default=30,
                        help="Timeout per request in seconds (default: 30)")
    parser.add_argument("--runs-per-query", type=int, default=3,
                        help="Runs per query for reliability (default: 3)")
    parser.add_argument("--trigger-threshold", type=float, default=0.5,
                        help="YES rate to count as triggered (default: 0.5)")
    parser.add_argument("--verbose", action="store_true", help="Print progress to stderr")
    args = parser.parse_args()

    eval_set = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, original_description, _ = parse_skill_md(skill_path)
    description = args.description or original_description

    if args.verbose:
        print(f"Skill: {name}", file=sys.stderr)
        print(f"Model: {args.model}", file=sys.stderr)
        print(f"Description: {description}", file=sys.stderr)
        print(f"Queries: {len(eval_set)} × {args.runs_per_query} runs", file=sys.stderr)

    t0 = time.time()
    output = run_eval(
        eval_set=eval_set,
        skill_name=name,
        description=description,
        model=args.model,
        num_workers=args.num_workers,
        timeout=args.timeout,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        api_base_url=args.api_base_url,
        api_key=args.api_key,
    )
    elapsed = time.time() - t0

    if args.verbose:
        summary = output["summary"]
        print(f"\nResults ({elapsed:.1f}s): {summary['passed']}/{summary['total']} passed", file=sys.stderr)
        for r in output["results"]:
            status = "PASS" if r["pass"] else "FAIL"
            rate_str = f"{r['triggers']}/{r['runs']}"
            print(f"  [{status}] rate={rate_str} expected={r['should_trigger']}: {r['query'][:70]}",
                  file=sys.stderr)

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
