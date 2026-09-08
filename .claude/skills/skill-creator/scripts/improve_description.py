#!/usr/bin/env python3
"""Improve a skill description based on eval results.

Takes eval results (from run_eval.py) and generates an improved description
using any OpenAI-compatible LLM. Works with OpenAI, Ollama, ZhipuAI, DeepSeek,
Mistral, or any provider that exposes an OpenAI-compatible chat completions API.

Usage:
    python improve_description.py \\
        --eval-results results.json \\
        --skill-path ./my-skill \\
        --model gpt-4o

    # With a local model via Ollama
    python improve_description.py \\
        --eval-results results.json \\
        --skill-path ./my-skill \\
        --api-base-url http://localhost:11434/v1 --api-key ollama \\
        --model llama3.1:8b
"""

import argparse
import json
import re
import sys
from pathlib import Path

from scripts.llm_client import create_client
from scripts.utils import parse_skill_md

# ──────────────────────────────────────────────────────────────
# Prompts
# ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an expert at optimizing AI skill/tool descriptions for accurate triggering.

A "skill" is a specialized capability that an AI assistant can invoke when a user's
query matches the skill's purpose. The skill's description is what the assistant reads
to decide whether to use the skill — so the description must be precise, specific,
and "pushy" about when to trigger.

Think carefully before writing your answer. Consider:
- What user intents genuinely need this skill
- What queries should NOT trigger this skill
- How to generalize from failed cases without overfitting
- How to make the description distinctive and immediately recognizable
"""

IMPROVE_PROMPT_TEMPLATE = """\
You are optimizing the description for a skill called "{skill_name}".

Current description:
"{current_description}"

Current scores ({scores_summary}):
{failures_section}

Skill content (for context on what the skill does):
<skill_content>
{skill_content}
</skill_content>

{history_section}

Based on the failures above, write a new improved description. Guidelines:
- Phrase it as an instruction: "Use this skill for..." not "This skill does..."
- Focus on the user's intent, not implementation details
- Generalize from failures — do NOT just enumerate the specific failed queries
- Be distinctive so the assistant can immediately recognize when to trigger
- Stay under 200 words (the description is injected into every prompt)
- If you've tried many approaches, change the structure significantly

Respond with ONLY the new description text inside <new_description> tags. Nothing else.

Example format:
<new_description>
Use this skill when the user wants to create, edit, or analyze Word documents...
</new_description>"""


def _build_failures_section(eval_results: dict) -> str:
    """Build the failed/false-trigger summary for the prompt."""
    failed_triggers = [r for r in eval_results["results"] if r["should_trigger"] and not r["pass"]]
    false_triggers = [r for r in eval_results["results"] if not r["should_trigger"] and not r["pass"]]

    lines = []
    if failed_triggers:
        lines.append("FAILED TO TRIGGER (should have triggered but didn't):")
        for r in failed_triggers:
            lines.append(f'  - "{r["query"]}" (triggered {r["triggers"]}/{r["runs"]} times)')
    if false_triggers:
        lines.append("FALSE TRIGGERS (triggered but shouldn't have):")
        for r in false_triggers:
            lines.append(f'  - "{r["query"]}" (triggered {r["triggers"]}/{r["runs"]} times)')
    if not lines:
        lines.append("(No failures — all queries passed)")

    return "\n".join(lines)


def _build_history_section(history: list[dict]) -> str:
    """Build the previous-attempts section for the prompt."""
    if not history:
        return ""

    lines = ["PREVIOUS ATTEMPTS (do NOT repeat these — try something structurally different):\n"]
    for h in history:
        train_s = f"{h.get('train_passed', h.get('passed', 0))}/{h.get('train_total', h.get('total', 0))}"
        lines.append(f'Attempt (score: {train_s}):')
        lines.append(f'  Description: "{h["description"]}"')
        if "results" in h:
            failed = [r for r in h["results"] if not r["pass"]]
            if failed:
                lines.append("  Still failing:")
                for r in failed[:5]:  # cap at 5 to keep prompt lean
                    lines.append(f'    - [{r["should_trigger"]}] "{r["query"][:70]}"')
        lines.append("")

    return "\n".join(lines)


def _parse_description(text: str) -> str:
    """Extract description from <new_description> tags, or use the full response."""
    match = re.search(r"<new_description>(.*?)</new_description>", text, re.DOTALL)
    if match:
        return match.group(1).strip().strip('"')
    # Fallback: use full response, cleaned up
    return text.strip().strip('"')


def _shorten_if_needed(
    client,
    model: str,
    original_prompt: str,
    original_response: str,
    description: str,
    max_chars: int = 1024,
) -> str:
    """If description exceeds max_chars, ask the model to shorten it."""
    if len(description) <= max_chars:
        return description

    shorten_prompt = (
        f"Your description is {len(description)} characters, which exceeds the "
        f"{max_chars} character limit. Rewrite it to be under {max_chars} characters "
        "while preserving the most important trigger keywords and intent coverage. "
        "Respond with only the new description in <new_description> tags."
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": original_prompt},
            {"role": "assistant", "content": original_response},
            {"role": "user", "content": shorten_prompt},
        ],
        max_tokens=512,
        temperature=0.3,
    )

    shortened = _parse_description(response.choices[0].message.content)
    return shortened if len(shortened) <= max_chars else shortened[:max_chars]


# ──────────────────────────────────────────────────────────────
# Main function
# ──────────────────────────────────────────────────────────────

def improve_description(
    skill_name: str,
    skill_content: str,
    current_description: str,
    eval_results: dict,
    history: list[dict],
    model: str,
    api_base_url: str | None = None,
    api_key: str | None = None,
    log_dir: Path | None = None,
    iteration: int | None = None,
    test_results: dict | None = None,
) -> str:
    """Generate an improved skill description based on eval failures.

    Args:
        skill_name: Name of the skill.
        skill_content: Full content of SKILL.md (for context).
        current_description: The description currently being tested.
        eval_results: Output from run_eval.py (train set).
        history: List of previous description attempts.
        model: LLM model identifier.
        api_base_url: OpenAI-compatible API base URL.
        api_key: API key.
        log_dir: If set, write the prompt/response transcript here.
        iteration: Current iteration number (for log filenames).
        test_results: Optional test set results (informational only).

    Returns:
        Improved description string.
    """
    client = create_client(api_base_url, api_key)

    # Build scores summary
    train_score = f"{eval_results['summary']['passed']}/{eval_results['summary']['total']}"
    if test_results:
        test_score = f"{test_results['summary']['passed']}/{test_results['summary']['total']}"
        scores_summary = f"train={train_score}, test={test_score}"
    else:
        scores_summary = f"train={train_score}"

    prompt = IMPROVE_PROMPT_TEMPLATE.format(
        skill_name=skill_name,
        current_description=current_description,
        scores_summary=scores_summary,
        failures_section=_build_failures_section(eval_results),
        skill_content=skill_content,
        history_section=_build_history_section(history),
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1024,
        temperature=0.7,
    )

    raw_response = response.choices[0].message.content
    description = _parse_description(raw_response)

    # Enforce 1024-char limit
    description = _shorten_if_needed(client, model, prompt, raw_response, description)

    # Save transcript if log_dir provided
    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        transcript = {
            "iteration": iteration,
            "model": model,
            "prompt": prompt,
            "response": raw_response,
            "parsed_description": description,
            "char_count": len(description),
        }
        log_file = log_dir / f"improve_iter_{iteration or 'unknown'}.json"
        log_file.write_text(json.dumps(transcript, indent=2))

    return description


# ──────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Improve a skill description based on eval results"
    )
    parser.add_argument("--eval-results", required=True,
                        help="Path to eval results JSON (from run_eval.py)")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--model", required=True, help="LLM model identifier")
    parser.add_argument("--history", default=None,
                        help="Path to history JSON (previous attempts)")
    parser.add_argument("--api-base-url", default=None,
                        help="OpenAI-compatible API base URL (overrides LLM_API_BASE_URL env var)")
    parser.add_argument("--api-key", default=None,
                        help="API key (overrides LLM_API_KEY env var)")
    parser.add_argument("--verbose", action="store_true",
                        help="Print current/improved descriptions to stderr")
    args = parser.parse_args()

    skill_path = Path(args.skill_path)
    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    eval_results = json.loads(Path(args.eval_results).read_text())
    history = json.loads(Path(args.history).read_text()) if args.history else []

    name, _, content = parse_skill_md(skill_path)
    current_description = eval_results["description"]

    if args.verbose:
        print(f"Skill: {name}", file=sys.stderr)
        print(f"Model: {args.model}", file=sys.stderr)
        print(f"Current: {current_description}", file=sys.stderr)
        summary = eval_results["summary"]
        print(f"Score: {summary['passed']}/{summary['total']}", file=sys.stderr)

    new_description = improve_description(
        skill_name=name,
        skill_content=content,
        current_description=current_description,
        eval_results=eval_results,
        history=history,
        model=args.model,
        api_base_url=args.api_base_url,
        api_key=args.api_key,
    )

    if args.verbose:
        print(f"Improved: {new_description}", file=sys.stderr)

    output = {
        "description": new_description,
        "history": history + [{
            "description": current_description,
            "passed": eval_results["summary"]["passed"],
            "failed": eval_results["summary"]["failed"],
            "total": eval_results["summary"]["total"],
            "results": eval_results["results"],
        }],
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
