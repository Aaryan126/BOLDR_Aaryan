from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any, Protocol

import httpx

from app.models.ai import AIUsage, ChatCompletionResult, ChatMessage


class AIProviderError(RuntimeError):
    pass


class AIProvider(Protocol):
    provider_name: str
    model: str

    def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        top_p: float = 1.0,
        top_k: int = 40,
        presence_penalty: float = 0.0,
        frequency_penalty: float = 0.0,
        stream: bool = False,
    ) -> ChatCompletionResult:
        ...


class FakeAIProvider:
    provider_name = "fake"
    model = "fake-structured-json"

    def __init__(self, content: str | dict[str, Any] | None = None) -> None:
        if content is None:
            content = {
                "ticket_id": "TKT-FAKE",
                "sufficient_evidence": True,
                "confidence": 0.91,
                "supported_claims": ["Fake provider returned a deterministic fixture."],
                "unsupported_claims": [],
                "required_human_inputs": [],
                "rationale": "Fixture response for schema-validation tests.",
            }
        self.content = json.dumps(content) if isinstance(content, dict) else content

    def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        top_p: float = 1.0,
        top_k: int = 40,
        presence_penalty: float = 0.0,
        frequency_penalty: float = 0.0,
        stream: bool = False,
    ) -> ChatCompletionResult:
        return ChatCompletionResult(
            provider=self.provider_name,
            model=self.model,
            content=self.content,
            reasoning=None,
            finish_reason="stop",
            usage=AIUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            raw_response_id="fake-response",
        )


class FPTGLMProvider:
    provider_name = "fpt_ai_factory"

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://mkp-api.fptcloud.com/v1",
        model: str = "GLM-5.1",
        timeout_seconds: float = 30.0,
        max_retries: int = 2,
        client: httpx.Client | None = None,
    ) -> None:
        if not api_key:
            raise AIProviderError("FPT_AI_API_KEY is required for live GLM inference.")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.client = client or httpx.Client(timeout=timeout_seconds)
        self._owns_client = client is None

    def chat(
        self,
        messages: Sequence[ChatMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        top_p: float = 1.0,
        top_k: int = 40,
        presence_penalty: float = 0.0,
        frequency_penalty: float = 0.0,
        stream: bool = False,
    ) -> ChatCompletionResult:
        payload = {
            "model": self.model,
            "messages": [message.model_dump() for message in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "top_k": top_k,
            "presence_penalty": presence_penalty,
            "frequency_penalty": frequency_penalty,
            "stream": stream,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        last_error: Exception | None = None
        for _attempt in range(self.max_retries + 1):
            try:
                response = self.client.post(
                    self.completion_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout_seconds,
                )
                response.raise_for_status()
                return parse_fpt_chat_response(response.json(), provider_name=self.provider_name)
            except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError, AIProviderError) as error:
                last_error = error

        raise AIProviderError(f"GLM chat completion failed after retries: {last_error}") from last_error

    @property
    def completion_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    def close(self) -> None:
        if self._owns_client:
            self.client.close()


def parse_fpt_chat_response(
    payload: dict[str, Any],
    *,
    provider_name: str = "fpt_ai_factory",
) -> ChatCompletionResult:
    if "data" in payload:
        code = payload.get("code")
        if code not in (200, "200", None):
            raise AIProviderError(str(payload.get("message", "FPT AI request failed")))
        payload = payload["data"]

    choices = payload["choices"]
    choice = choices[0]
    message = choice["message"]
    content = message["content"]
    reasoning = message.get("reasoning")
    if content is None:
        raise AIProviderError(
            "FPT response did not include final message content. "
            "GLM-5.1 may still be using the completion budget for reasoning; increase max_tokens."
        )
    if not isinstance(content, str):
        content = json.dumps(content)

    usage_payload = payload.get("usage")
    usage = AIUsage(**usage_payload) if isinstance(usage_payload, dict) else None

    return ChatCompletionResult(
        provider=provider_name,
        model=str(payload.get("model", "")),
        content=content,
        reasoning=reasoning if isinstance(reasoning, str) else None,
        finish_reason=choice.get("finish_reason"),
        usage=usage,
        raw_response_id=payload.get("id"),
    )
