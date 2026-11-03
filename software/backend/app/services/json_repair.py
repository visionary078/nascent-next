"""把模型返回的 JSON 文本修成可解析的对象。

只修格式：Markdown 代码块、首尾说明文字、尾随逗号；Chat 台词另外允许补齐被
max_tokens 截断的引号和括号。修完仍要过 Pydantic Schema 与各自的安全策略，
这里不放宽任何字段。
"""

from __future__ import annotations

import json
import re
from typing import Any

_CODE_BLOCK = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```")
_TRAILING_COMMA = re.compile(r",\s*([}\]])")


def parse_model_json(text: str, *, allow_truncated: bool = False) -> tuple[dict[str, Any], bool]:
    """返回 (对象, 是否补齐过截断)。修不好就抛 ValueError。"""

    if not text or not text.strip():
        raise ValueError("empty model output")
    cleaned = text.strip()
    block = _CODE_BLOCK.search(cleaned)
    if block:
        cleaned = block.group(1).strip()

    data = _loads_object(cleaned)
    if data is not None:
        return data, False

    start = cleaned.find("{")
    if start == -1:
        raise ValueError("no JSON object in model output")
    candidate = cleaned[start:]
    end = candidate.rfind("}")
    if end != -1:
        data = _loads_object(_TRAILING_COMMA.sub(r"\1", candidate[: end + 1]))
        if data is not None:
            return data, False

    if not allow_truncated:
        raise ValueError("model output is not a complete JSON object")
    data = _loads_object(_TRAILING_COMMA.sub(r"\1", _close_truncated(candidate)))
    if data is None:
        raise ValueError("truncated model output could not be repaired")
    return data, True


def _loads_object(text: str) -> dict[str, Any] | None:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _close_truncated(text: str) -> str:
    in_string = False
    escape = False
    stack: list[str] = []
    for char in text:
        if escape:
            escape = False
        elif char == "\\":
            escape = in_string
        elif char == '"':
            in_string = not in_string
        elif not in_string and char in "{[":
            stack.append("}" if char == "{" else "]")
        elif not in_string and char in "}]" and stack and stack[-1] == char:
            stack.pop()
    tail = '"' if in_string else ""
    if escape:
        text = text[:-1]
    return text + tail + "".join(reversed(stack))
