"""Agentic RAG benchmark harness for the Lexi chatbot.

Modules:
    generate_dataset  — build data/golden_qa.jsonl (deterministic, seeded)
    instrumentation   — timed/token-counted AgenticRAGService wrapper
    judge             — LLM-as-judge verdicts (faithfulness / refusal / consistency)
    metrics           — retrieval + answer + perf aggregation
    run_benchmark     — CLI runner (in-process or HTTP mode, baseline + A/B)
    report            — CSV + single-file HTML dashboard
"""
