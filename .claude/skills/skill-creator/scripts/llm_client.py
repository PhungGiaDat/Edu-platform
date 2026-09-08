"""LLM client factory — works with any OpenAI-compatible API.

Supports any provider that exposes an OpenAI-compatible endpoint:
  - OpenAI:    base_url=https://api.openai.com/v1
  - Ollama:    base_url=http://localhost:11434/v1, api_key=ollama
  - ZhipuAI:   base_url=https://open.bigmodel.cn/api/paas/v4
  - DeepSeek:  base_url=https://api.deepseek.com/v1
  - Mistral:   base_url=https://api.mistral.ai/v1
  - (any OpenAI-compatible endpoint)

Config resolution order (first non-empty value wins):
  1. Explicit argument to create_client()
  2. LLM_API_BASE_URL / LLM_API_KEY env vars
  3. OPENAI_API_BASE_URL / OPENAI_API_KEY env vars
"""

import os

from openai import OpenAI


def create_client(api_base_url: str | None = None, api_key: str | None = None) -> OpenAI:
    """Create an OpenAI-compatible client.

    Args:
        api_base_url: Base URL for the API. None = use env var or OpenAI default.
        api_key: API key. None = use env var or 'no-key' for local models.

    Returns:
        OpenAI client configured for the target provider.
    """
    base_url = (
        api_base_url
        or os.environ.get("LLM_API_BASE_URL")
        or os.environ.get("OPENAI_API_BASE_URL")
    )
    key = (
        api_key
        or os.environ.get("LLM_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or "no-key"   # local models (Ollama etc.) don't need a real key
    )

    return OpenAI(api_key=key, base_url=base_url)
