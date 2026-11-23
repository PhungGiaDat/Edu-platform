"""Benchmark report generation: CSV + single-file HTML dashboard.

The dashboard is fully self-contained (inline CSS + vanilla JS, no CDN) so it
opens offline and can be screenshotted directly into graduation documents.
"""
from __future__ import annotations

import csv
import html
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def _fmt(value: Any, suffix: str = "", digits: int = 2, dash: str = "—") -> str:
    if value is None:
        return dash
    if isinstance(value, float):
        return f"{value:.{digits}f}{suffix}"
    return f"{value}{suffix}"


def _fmt_ms(seconds: Optional[float]) -> str:
    if seconds is None:
        return "—"
    return f"{seconds * 1000:.0f} ms"


def _pct(value: Optional[float]) -> str:
    if value is None:
        return "—"
    return f"{value * 100:.1f}%"


def write_csv(rows: List[Dict[str, Any]], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    columns = [
        "id", "category", "question", "expected_animal_en", "config_generator", "mode",
        "response", "hit1", "hit3", "mrr", "faithfulness", "hallucination",
        "error_types", "refusal_correct", "consistent", "e2e_ms", "planner_ms",
        "generator_ms", "validator_ms", "retrieval_ms", "total_tokens", "cached", "error",
    ]
    with path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            latency = row.get("latency") or {}
            judge = row.get("judge") or {}
            writer.writerow(
                {
                    "id": row.get("id"),
                    "category": row.get("category"),
                    "question": row.get("question"),
                    "expected_animal_en": row.get("expected_animal_en") or "",
                    "config_generator": (row.get("config") or {}).get("generator_model") or "default",
                    "mode": (row.get("config") or {}).get("mode"),
                    "response": (row.get("response") or "").replace("\n", " "),
                    "hit1": row.get("hit1"),
                    "hit3": row.get("hit3"),
                    "mrr": row.get("mrr"),
                    "faithfulness": judge.get("faithfulness") if "faithfulness" in judge else "",
                    "hallucination": judge.get("hallucination") if "hallucination" in judge else "",
                    "error_types": ";".join(judge.get("error_types") or []),
                    "refusal_correct": judge.get("refusal_correct") if "refusal_correct" in judge else "",
                    "consistent": judge.get("consistent") if "consistent" in judge else "",
                    "e2e_ms": round(latency.get("e2e") * 1000) if latency.get("e2e") is not None else "",
                    "planner_ms": round(latency.get("planner") * 1000) if latency.get("planner") is not None else "",
                    "generator_ms": round(latency.get("generator") * 1000) if latency.get("generator") is not None else "",
                    "validator_ms": round(latency.get("validator") * 1000) if latency.get("validator") is not None else "",
                    "retrieval_ms": round(latency.get("retrieval") * 1000) if latency.get("retrieval") is not None else "",
                    "total_tokens": (row.get("tokens") or {}).get("total", ""),
                    "cached": row.get("cached"),
                    "error": row.get("error") or "",
                }
            )
    return path


def _card(label: str, value: str, sub: str = "") -> str:
    sub_html = f'<div class="card-sub">{html.escape(sub)}</div>' if sub else ""
    return f'<div class="card"><div class="card-value">{value}</div><div class="card-label">{html.escape(label)}</div>{sub_html}</div>'


def _bar(label: str, pct_value: float, color: str) -> str:
    width = max(0.0, min(100.0, pct_value * 100))
    return (
        f'<div class="bar-row"><div class="bar-label">{html.escape(label)}</div>'
        f'<div class="bar-track"><div class="bar-fill" style="width:{width:.1f}%;background:{color}"></div></div>'
        f'<div class="bar-value">{pct_value * 100:.1f}%</div></div>'
    )


def _sortable_table(headers: List[str], rows_html: List[str], table_id: str) -> str:
    head_cells = "".join(
        f'<th onclick="sortTable(\'{table_id}\', {i})">{html.escape(h)}</th>' for i, h in enumerate(headers)
    )
    return (
        f'<div class="table-wrap"><table id="{table_id}" class="sortable">'
        f"<thead><tr>{head_cells}</tr></thead><tbody>{''.join(rows_html)}</tbody></table></div>"
    )


_DASHBOARD_TEMPLATE = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agentic RAG Benchmark Dashboard</title>
<style>
  :root {{
    --bg: #f6f7fb; --card: #ffffff; --ink: #1a2333; --muted: #64748b;
    --accent: #4f6df5; --good: #16a34a; --bad: #dc2626; --warn: #d97706;
    --border: #e2e8f0;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; padding: 24px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
         background: var(--bg); color: var(--ink); }}
  h1 {{ font-size: 22px; margin: 0 0 4px; }}
  h2 {{ font-size: 16px; margin: 28px 0 10px; border-left: 4px solid var(--accent); padding-left: 10px; }}
  .meta {{ color: var(--muted); font-size: 12.5px; margin-bottom: 20px; line-height: 1.6; }}
  .cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }}
  .card {{ background: var(--card); border: 1px solid var(--border); border-radius: 12px;
           padding: 14px 16px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }}
  .card-value {{ font-size: 24px; font-weight: 700; }}
  .card-label {{ font-size: 12px; color: var(--muted); margin-top: 2px; }}
  .card-sub {{ font-size: 11px; color: var(--muted); margin-top: 6px; }}
  .table-wrap {{ overflow-x: auto; background: var(--card); border: 1px solid var(--border);
                 border-radius: 12px; box-shadow: 0 1px 3px rgba(15,23,42,.06); }}
  table {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
  th, td {{ padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }}
  th {{ background: #f1f5f9; cursor: pointer; user-select: none; position: sticky; top: 0; }}
  th:hover {{ background: #e2e8f0; }}
  td.wrap {{ white-space: normal; min-width: 220px; max-width: 420px; }}
  tr:last-child td {{ border-bottom: none; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11.5px; font-weight: 600; }}
  .b-good {{ background: #dcfce7; color: var(--good); }}
  .b-bad {{ background: #fee2e2; color: var(--bad); }}
  .b-warn {{ background: #fef3c7; color: var(--warn); }}
  .b-muted {{ background: #f1f5f9; color: var(--muted); }}
  .bar-row {{ display: grid; grid-template-columns: 160px 1fr 64px; align-items: center;
              gap: 10px; margin: 6px 0; font-size: 13px; }}
  .bar-track {{ background: #eef2f7; border-radius: 99px; height: 12px; overflow: hidden; }}
  .bar-fill {{ height: 100%; border-radius: 99px; }}
  .bar-value {{ text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }}
  .stack {{ display: flex; height: 16px; border-radius: 4px; overflow: hidden; min-width: 120px; }}
  .stack div {{ height: 100%; }}
  .legend {{ display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--muted); margin: 8px 0; }}
  .legend span::before {{ content: ''; display: inline-block; width: 10px; height: 10px;
                          border-radius: 2px; margin-right: 5px; vertical-align: -1px; }}
  .lg-planner span::before {{ background: #4f6df5; }}
  .lg-generator span::before {{ background: #16a34a; }}
  .lg-validator span::before {{ background: #d97706; }}
  .lg-other span::before {{ background: #94a3b8; }}
  footer {{ margin-top: 32px; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 12px; }}
  @media print {{ body {{ background: #fff; padding: 0; }} .table-wrap {{ box-shadow: none; }} }}
</style>
</head>
<body>
<h1>Agentic RAG Benchmark — Dashboard</h1>
<div class="meta">{meta_html}</div>

<h2>Tổng quan</h2>
<div class="cards">{cards_html}</div>

<h2>Latency theo stage</h2>
<div class="table-wrap"><table>
<thead><tr><th>Stage</th><th>n</th><th>mean</th><th>p50</th><th>p95</th><th>min</th><th>max</th></tr></thead>
<tbody>{latency_rows_html}</tbody></table></div>

<h2>Latency từng câu hỏi (stacked, in-process runs)</h2>
<div class="legend">
  <span class="lg-planner">planner</span><span class="lg-generator">generator (llm+retrieval)</span>
  <span class="lg-validator">validator</span><span class="lg-other">other/overhead</span>
</div>
<div class="table-wrap"><table>
<thead><tr><th>#</th><th>ID</th><th>Category</th><th>Latency (ms, stacked)</th><th>E2E</th></tr></thead>
<tbody>{stack_rows_html}</tbody></table></div>

<h2>Hành vi agentic</h2>
<div class="table-wrap"><table>
<thead><tr><th>Chỉ số</th><th>Giá trị</th><th>Tỷ lệ</th></tr></thead>
<tbody>{agentic_rows_html}</tbody></table></div>

<h2>Phân loại lỗi (error taxonomy)</h2>
{taxonomy_html}

<h2>A/B so sánh Generator model</h2>
{ab_html}

<h2>Chi tiết từng câu hỏi</h2>
{detail_table}

<footer>{footer_html}</footer>

<script>
function sortTable(tableId, colIndex) {{
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const dir = table.dataset['dir' + colIndex] === 'asc' ? -1 : 1;
  table.dataset['dir' + colIndex] = dir === 1 ? 'asc' : 'desc';
  rows.sort((a, b) => {{
    const av = a.children[colIndex].dataset.v ?? a.children[colIndex].textContent.trim();
    const bv = b.children[colIndex].dataset.v ?? b.children[colIndex].textContent.trim();
    const an = parseFloat(av), bn = parseFloat(bv);
    if (!isNaN(an) && !isNaN(bn) && av !== '' && bv !== '') return (an - bn) * dir;
    return av.localeCompare(bv, 'vi') * dir;
  }});
  rows.forEach(r => tbody.appendChild(r));
}}
</script>
</body>
</html>"""


def build_dashboard(
    rows: List[Dict[str, Any]],
    summary: Dict[str, Any],
    ab_table: Optional[List[Dict[str, Any]]],
    meta: Dict[str, Any],
) -> str:
    """Render the single-file HTML dashboard."""
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    quality = summary["quality"]
    retrieval = summary["retrieval"]
    e2e = summary["latency"]["e2e"]
    agentic = summary["agentic"]

    meta_html = "<br>".join(html.escape(str(part)) for part in meta.get("lines", []))

    cards_html = "".join(
        [
            _card("E2E p50", _fmt_ms(e2e["p50"]), f"n={e2e['count']}"),
            _card("E2E p95", _fmt_ms(e2e["p95"])),
            _card("Hallucination rate", _pct(quality["hallucination_rate"]), f"judged={quality['judged_count']}"),
            _card("Hit@1", _pct(retrieval["hit1_rate"]), f"indomain={retrieval['indomain_count']}"),
            _card("Refusal accuracy", _pct(quality["refusal_accuracy"]), f"ood judged={quality['refusal_judged']}"),
            _card("Consistency", _pct(quality["consistency_rate"]), f"pairs={quality['consistency_pairs']}"),
            _card("Faithfulness (mean)", _fmt(quality["faithfulness_mean"])),
            _card("Tokens used", f"{summary['tokens']['total']:,}"),
        ]
    )

    latency_rows_html = ""
    for stage in ("planner", "generator", "retrieval", "validator", "e2e"):
        stats = summary["latency"][stage]
        latency_rows_html += (
            f"<tr><td>{stage}</td><td>{stats['count']}</td>"
            f"<td>{_fmt_ms(stats['mean'])}</td><td>{_fmt_ms(stats['p50'])}</td>"
            f"<td>{_fmt_ms(stats['p95'])}</td><td>{_fmt_ms(stats['min'])}</td>"
            f"<td>{_fmt_ms(stats['max'])}</td></tr>"
        )

    stack_rows_html = ""
    palette = {"planner": "#4f6df5", "generator": "#16a34a", "validator": "#d97706"}
    for idx, row in enumerate(rows, 1):
        latency = row.get("latency") or {}
        e2e_val = latency.get("e2e")
        if e2e_val is None or latency.get("planner") is None:
            continue
        planner = float(latency.get("planner") or 0)
        generator = float(latency.get("generator") or 0)
        validator = float(latency.get("validator") or 0)
        other = max(0.0, float(e2e_val) - planner - generator - validator)
        scale = 100.0 / max(float(e2e_val), 1e-9)
        segments = "".join(
            f'<div style="width:{value * scale:.1f}%;background:{color}"></div>'
            for value, color in ((planner, palette["planner"]), (generator, palette["generator"]),
                                 (validator, palette["validator"]), (other, "#94a3b8"))
            if value > 0
        )
        stack_rows_html += (
            f"<tr><td>{idx}</td><td>{html.escape(str(row.get('id')))}</td>"
            f"<td>{html.escape(str(row.get('category')))}</td>"
            f'<td><div class="stack">{segments}</div></td>'
            f"<td data-v='{float(e2e_val) * 1000:.0f}'>{_fmt_ms(float(e2e_val))}</td></tr>"
        )

    total = max(summary["total"], 1)
    agentic_items = [
        ("Planner thành công", agentic["planner_done"], agentic["planner_done"] / total),
        ("Planner fallback (JSON/LLM fail)", agentic["planner_fallback"], agentic["planner_fallback"] / total),
        ("Generator thành công", agentic["generator_done"], agentic["generator_done"] / total),
        ("Generator error", agentic["generator_error"], agentic["generator_error"] / total),
        ("Validator thành công", agentic["validator_done"], agentic["validator_done"] / total),
        ("Validator fallback", agentic["validator_fallback"], agentic["validator_fallback"] / total),
        ("Cache hit", agentic["cache_hit"], agentic["cache_hit"] / total),
        ("Pipeline error", agentic["pipeline_errors"], agentic["pipeline_errors"] / total),
    ]
    agentic_rows_html = "".join(
        f"<tr><td>{html.escape(label)}</td><td>{count}</td><td>{_pct(rate)}</td></tr>"
        for label, count, rate in agentic_items
    )

    taxonomy = quality["error_taxonomy"]
    taxonomy_colors = ["#dc2626", "#d97706", "#7c3aed", "#0891b2", "#be185d", "#64748b"]
    if taxonomy:
        max_count = max(taxonomy.values())
        taxonomy_html = "".join(
            _bar(f"{name} ({count})", count / max_count, taxonomy_colors[i % len(taxonomy_colors)])
            for i, (name, count) in enumerate(sorted(taxonomy.items(), key=lambda kv: -kv[1]))
        )
    else:
        taxonomy_html = '<div class="meta">Không phát hiện lỗi nào được phân loại.</div>'

    if ab_table:
        ab_rows_html = ""
        for item in ab_table:
            ab_rows_html += (
                f"<tr><td class='wrap'>{html.escape(str(item['generator_model']))}</td>"
                f"<td>{item['n']}</td><td>{_fmt_ms(item['e2e_p50'])}</td><td>{_fmt_ms(item['e2e_p95'])}</td>"
                f"<td>{_pct(item['hit1'])}</td><td>{_fmt(item['faithfulness_mean'])}</td>"
                f"<td>{_pct(item['hallucination_rate'])}</td><td>{_pct(item['refusal_accuracy'])}</td>"
                f"<td>{item['pipeline_errors']}</td><td>{item['tokens_total']:,}</td></tr>"
            )
        ab_html = (
            '<div class="table-wrap"><table><thead><tr><th>Generator model</th><th>n</th>'
            "<th>E2E p50</th><th>E2E p95</th><th>Hit@1</th><th>Faithfulness</th>"
            "<th>Hallucination</th><th>Refusal acc</th><th>Errors</th><th>Tokens</th></tr></thead>"
            f"<tbody>{ab_rows_html}</tbody></table></div>"
        )
    else:
        ab_html = '<div class="meta">Không chạy A/B (dùng cờ --ab để bật so sánh model).</div>'

    detail_rows_html = []
    for row in rows:
        judge = row.get("judge") or {}
        if "faithfulness" in judge:
            verdict_badge = (
                f"<span class='badge {'b-bad' if judge.get('hallucination') else 'b-good'}'>"
                f"{'HALLUC' if judge.get('hallucination') else 'OK'} {_fmt(judge.get('faithfulness'))}</span>"
            )
            reason = "; ".join(judge.get("reasons") or [])
        elif "refusal_correct" in judge:
            verdict_badge = (
                f"<span class='badge {'b-good' if judge.get('refusal_correct') else 'b-bad'}'>"
                f"{'REFUSAL OK' if judge.get('refusal_correct') else 'REFUSAL MISS'}</span>"
            )
            reason = "; ".join(judge.get("reasons") or [])
        elif "consistent" in judge:
            verdict_badge = (
                f"<span class='badge {'b-good' if judge.get('consistent') else 'b-warn'}'>"
                f"{'CONSISTENT' if judge.get('consistent') else 'INCONSISTENT'}</span>"
            )
            reason = "; ".join(judge.get("reasons") or [])
        else:
            verdict_badge = "<span class='badge b-muted'>—</span>"
            reason = ""
        if row.get("error"):
            verdict_badge += " <span class='badge b-bad'>ERROR</span>"
        latency = row.get("latency") or {}
        e2e_cell = (
            f"<td data-v='{float(latency['e2e']) * 1000:.0f}'>{_fmt_ms(float(latency['e2e']))}</td>"
            if latency.get("e2e") is not None
            else "<td data-v='0'>—</td>"
        )
        question = str(row.get("question") or "")
        response = str(row.get("response") or "").replace("\n", " ")
        if row.get("expected_animal_en"):
            hit_badge = (
                "<span class='badge b-good'>HIT</span>"
                if row.get("hit1")
                else "<span class='badge b-muted'>MISS</span>"
            )
        else:
            hit_badge = "—"
        detail_rows_html.append(
            "<tr>"
            f"<td>{html.escape(str(row.get('id')))}</td>"
            f"<td>{html.escape(str(row.get('category')))}</td>"
            f"<td class='wrap' title='{html.escape(question)}'>{html.escape(question[:70])}{'…' if len(question) > 70 else ''}</td>"
            f"<td>{hit_badge}</td>"
            f"<td>{verdict_badge}</td>"
            f"<td class='wrap' title='{html.escape(reason)}'>{html.escape(reason[:90])}{'…' if len(reason) > 90 else ''}</td>"
            f"<td class='wrap' title='{html.escape(response)}'>{html.escape(response[:80])}{'…' if len(response) > 80 else ''}</td>"
            f"{e2e_cell}"
            "</tr>"
        )
    detail_table = _sortable_table(
        ["ID", "Category", "Question", "Hit@1", "Verdict", "Lý do (judge)", "Response", "E2E"],
        detail_rows_html,
        "detail",
    )

    footer_html = (
        f"Generated {generated} · judge={html.escape(str(meta.get('judge_model', 'qwen/qwen3.8-max-free')))} · "
        f"mode={html.escape(str(meta.get('mode', 'inproc')))} · dataset={html.escape(str(meta.get('dataset', '')))}"
    )

    return _DASHBOARD_TEMPLATE.format(
        meta_html=meta_html,
        cards_html=cards_html,
        latency_rows_html=latency_rows_html,
        stack_rows_html=stack_rows_html,
        agentic_rows_html=agentic_rows_html,
        taxonomy_html=taxonomy_html,
        ab_html=ab_html,
        detail_table=detail_table,
        footer_html=footer_html,
    )


def write_dashboard(
    rows: List[Dict[str, Any]],
    summary: Dict[str, Any],
    ab_table: Optional[List[Dict[str, Any]]],
    meta: Dict[str, Any],
    path: Path,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(build_dashboard(rows, summary, ab_table, meta), encoding="utf-8")
    return path


def write_summary_json(summary: Dict[str, Any], ab_table: Optional[List[Dict[str, Any]]], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"summary": summary, "ab_table": ab_table, "generated_at": datetime.now().isoformat()}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
