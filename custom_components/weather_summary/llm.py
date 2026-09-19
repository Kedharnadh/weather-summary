"""LLM text generation for weather summaries.

Mirrors the Android `ai/PromptBuilder.kt` and `ai/Providers.kt`. Supports four
backends, chosen in the config flow:

- "openai_compatible": any OpenAI-compatible chat endpoint (Ollama exposes one
  at e.g. 192.168.1.50:11434/v1). API key optional.
- "gemini": Google Gemini REST API (needs a key from aistudio.google.com/apikey).
- "homeassistant": use Home Assistant's configured LLM (get_ai_llm).
- "none": no AI — sensors always carry the deterministic fallback sentence.
"""

from __future__ import annotations

import logging
from typing import Any

import aiohttp

from .const import (
    CONF_LLM_GEMINI_KEY,
    CONF_SENTENCE_MODE,
    GEMINI_URL,
    LLM_GEMINI,
    LLM_HOME_ASSISTANT,
    LLM_NONE,
    LLM_OPENAI_COMPAT,
)
from .openmeteo import WeatherFacts, fallback_text

_LOGGER = logging.getLogger(__name__)

TIMEOUT = aiohttp.ClientTimeout(total=60)

EXAMPLES_SHORT = [
    "Rain starting in ~20 min, umbrella time.",
    "Light rain easing, should stop in ~10 min.",
    "Clear 26°, breezy; chance of drizzle after 6 pm.",
    "Sunny and hot, 34°; storms possible late evening.",
]

EXAMPLES_TINY = [
    "Rain in ~20 min.",
    "Rain stops in ~10 min.",
    "Clear 26°, breezy.",
    "Hot 34°; storms late.",
]

EXAMPLES_LONG = [
    "Rain starting in ~20 min, easing by early afternoon; after that it dries out and warms to 24°.",
    "Clear and breezy at 26° all day; a light shower chance returns after 6 pm.",
    "Sunny and hot, 34°; storms possible late evening, then cooler and calm tomorrow morning.",
]

_MAX_BY_MODE = {"tiny": 60, "short": 100, "long": 240}
_EXAMPLES_BY_MODE = {"tiny": EXAMPLES_TINY, "short": EXAMPLES_SHORT, "long": EXAMPLES_LONG}

VALID_MODES = set(_MAX_BY_MODE)


def sentence_mode(config: dict[str, Any]) -> str:
    """Current sentence mode, migrating the legacy tiny_sentence boolean."""
    mode = config.get(CONF_SENTENCE_MODE)
    if mode in VALID_MODES:
        return mode
    return "tiny" if config.get("tiny_sentence") else "short"


def build_prompt(facts: WeatherFacts, mode: str) -> str:
    """Assemble the same style of prompt the Android app uses."""
    max_chars = _MAX_BY_MODE.get(mode, 100)
    examples = _EXAMPLES_BY_MODE.get(mode, EXAMPLES_SHORT)
    sentence_rule = (
        "Keep it to ONE or TWO short sentences, max 240 characters total"
        if mode == "long"
        else f"ONE sentence, max {max_chars} characters"
    )

    lines = [
        "You write phone-widget weather sentences. Rules:",
        f"- {sentence_rule}, no emoji, no greeting, no units (write \"28°\").",
        "- Prioritise (in order): rain starting/stopping soon, extreme heat/cold, heavy wind/storm, otherwise keep it neutral.",
        "- Only mention things that are actually true from the facts.",
        "- Speak in present/next-hour terms.",
        "Examples:",
    ]
    lines += [f'- "{e}"' for e in examples]
    lines.append("")
    lines.append("Facts:")
    lines.append(
        f"current: {facts.temp_c:.1f}°"
        + (f" (feels {facts.feels_c:.1f}°)" if facts.feels_c is not None else "")
        + (f", humidity {facts.humidity_pct}%" if facts.humidity_pct is not None else "")
        + (f", wind {facts.wind_kmh:.0f} km/h" if facts.wind_kmh is not None else "")
        + f", condition: {facts.condition_label.lower()}"
    )
    lines.append(f"raining_now: {str(facts.is_raining_now).lower()}")
    lines.append(f"rain_start_in_min: {facts.rain_start_in_min if facts.rain_start_in_min is not None else 'none'}")
    lines.append(f"rain_stop_in_min: {facts.rain_stop_in_min if facts.rain_stop_in_min is not None else 'none'}")
    lines.append(f"precip_next_hour_mm: {facts.precip_next_hour_mm:.1f}")
    if facts.max_chance_rain_24h:
        lines.append(f"max_chance_rain_next_24h: {facts.max_chance_rain_24h[0]}% at {facts.max_chance_rain_24h[1]}")
    if facts.peak_temp_24h:
        lines.append(f"peak_temp_next_24h: {facts.peak_temp_24h[0]:.0f}° at {facts.peak_temp_24h[1]}")
    lines.append("")
    lines.append("Only output the sentence.")
    return "\n".join(lines)


async def generate_text(hass, config: dict[str, Any], prompt: str) -> str | None:
    """Generate a short sentence from a prompt using the configured backend."""
    provider = config.get("llm_provider", LLM_NONE)
    try:
        if provider == LLM_GEMINI:
            return await _gemini(config, prompt)
        if provider == LLM_OPENAI_COMPAT:
            return await _openai_compatible(config, prompt)
        if provider == LLM_HOME_ASSISTANT:
            return await _home_assistant_llm(hass, prompt)
    except Exception as err:  # noqa: BLE001 - never break the sensor
        _LOGGER.warning("LLM generation failed: %s", err)
    return None


async def summarize(hass, config: dict[str, Any], facts: WeatherFacts, mode: str = "short") -> str:
    """Generate the sentence with fallback so sensors are never empty."""
    prompt = build_prompt(facts, mode)
    text = await generate_text(hass, config, prompt)
    if text:
        cleaned = text.strip().strip("\"").strip().replace("\n", " ")
        if cleaned:
            return cleaned
    return fallback_text(facts)


async def _openai_compatible(config: dict[str, Any], prompt: str) -> str | None:
    base = (config.get("llm_base_url") or "http://localhost:11434/v1").rstrip("/")
    if not base.endswith("/v1"):
        base += "/v1"
    model = config.get("llm_model") or "llama3.2"
    api_key = config.get("llm_api_key")

    payload = {
        "model": model,
        "stream": False,
        "messages": [{"role": "user", "content": prompt}],
    }
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        async with session.post(f"{base}/chat/completions", json=payload, headers=headers) as resp:
            resp.raise_for_status()
            data = await resp.json()
    choices = data.get("choices") or []
    if not choices:
        return None
    content = (choices[0].get("message") or {}).get("content")
    return content if isinstance(content, str) else None


async def _home_assistant_llm(hass, prompt: str) -> str | None:
    """Use Home Assistant's built-in LLM (Home Assistant 2025.2+)."""
    from homeassistant.ai import get_ai_llm  # local import: newer HA only

    llm = await get_ai_llm(hass, None)
    response = await llm.async_generate(prompt)
    content = getattr(response, "text", None) or getattr(response, "content", None)
    return str(content) if content else None


async def _gemini(config: dict[str, Any], prompt: str) -> str | None:
    """Call the Gemini REST API (v1beta generateContent)."""
    api_key = config.get(CONF_LLM_GEMINI_KEY) or config.get("gemini_api_key")
    if not api_key:
        _LOGGER.warning("Gemini provider selected but no API key configured")
        return None
    model = config.get("llm_model") or "gemini-2.5-flash"
    url = f"{GEMINI_URL}/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 140, "temperature": 0.4},
    }
    headers = {"Content-Type": "application/json"}

    async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
        async with session.post(url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            data = await resp.json()
    try:
        parts = (data["candidates"][0].get("content") or {}).get("parts") or []
        text = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
        return text.strip() or None
    except (KeyError, IndexError, TypeError):
        return None