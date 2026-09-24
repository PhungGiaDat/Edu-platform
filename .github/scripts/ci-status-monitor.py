#!/usr/bin/env python3
"""Mirror public backend GitHub Actions progress into one Docker log stream."""

import json
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen


API = "https://api.github.com/repos/PhungGiaDat/Edu-platform"
RUNS_URL = f"{API}/actions/workflows/365373933/runs?per_page=1"
HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "edu-platform-ci-status"}


def fetch(url):
    with urlopen(Request(url, headers=HEADERS), timeout=10) as response:
        return json.load(response)


def status_lines(run, jobs):
    sha = run["head_sha"]
    short = sha[:12]
    state = run.get("conclusion") or run["status"]
    lines = {"run": f"[CI] Run #{run['run_number']} commit {sha}: {state} - {run['html_url']}"}
    for job in jobs:
        job_state = job.get("conclusion") or job["status"]
        lines[f"job:{job['id']}"] = f"[CI] {short} | {job['name']}: {job_state}"
        for step in job.get("steps") or []:
            if step["status"] == "pending":
                continue
            step_state = step.get("conclusion") or step["status"]
            lines[f"step:{job['id']}:{step['number']}"] = (
                f"[CI] {short} | {job['name']} > {step['name']}: {step_state}"
            )
    return lines


def self_test():
    run = {
        "head_sha": "a" * 40, "status": "in_progress", "conclusion": None,
        "run_number": 7, "html_url": "https://github.com/example/actions/runs/7",
    }
    jobs = [{"id": 1, "name": "Test", "status": "in_progress", "conclusion": None,
             "steps": [{"number": 1, "name": "pytest", "status": "completed", "conclusion": "success"}]}]
    lines = status_lines(run, jobs)
    assert "commit " + "a" * 40 in lines["run"]
    assert "Test > pytest: success" in lines["step:1:1"]
    run["status"], run["conclusion"] = "completed", "failure"
    assert lines["run"] != status_lines(run, jobs)["run"]
    print("CI status monitor self-test passed")


def monitor():
    print("[CI] Monitoring public backend workflow; updates may lag by 1-2 minutes.", flush=True)
    seen = {}
    run_id = None
    while True:
        delay = 120  # 30 idle requests/hour, leaving room under GitHub's public API limit.
        try:
            runs = fetch(RUNS_URL)["workflow_runs"]
            if not runs:
                if run_id is not None:
                    print("[CI] No backend workflow runs found", flush=True)
                run_id, seen = None, {}
            else:
                run = runs[0]
                if run["id"] != run_id:
                    run_id, seen = run["id"], {}
                changed = status_lines(run, {})["run"] != seen.get("run")
                jobs = []
                if run["status"] != "completed" or changed:
                    jobs = fetch(f"{API}/actions/runs/{run_id}/jobs?per_page=100")["jobs"]
                for key, line in status_lines(run, jobs).items():
                    if seen.get(key) != line:
                        print(line, flush=True)
                        seen[key] = line
                if run["status"] != "completed":
                    delay = 30
        except HTTPError as error:
            if error.code in (403, 429):
                reset = int(error.headers.get("X-RateLimit-Reset", "0"))
                delay = max(180, reset - time.time() + 5)
            print(f"[CI] GitHub API returned HTTP {error.code}; retrying in {int(delay)}s", flush=True)
        except Exception as error:
            print(f"[CI] GitHub API unavailable ({type(error).__name__}); retrying in {delay}s", flush=True)
        time.sleep(delay)


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        self_test()
    else:
        monitor()
