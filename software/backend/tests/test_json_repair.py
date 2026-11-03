import sys

import pytest

sys.path.insert(0, "software/backend")

from app.services.agent_contract import AgentTurnRequest, ControlDecisionRequest
from app.services.json_repair import parse_model_json


def test_plain_json_is_untouched():
    data, truncated = parse_model_json('{"dialogue": "我在"}')
    assert data == {"dialogue": "我在"}
    assert truncated is False


def test_markdown_fence_and_surrounding_text():
    raw = '好的：\n```json\n{"dialogue": "靠过来点", "scene_ctrl": "stay"}\n```\n希望有帮助'
    data, truncated = parse_model_json(raw)
    assert data["dialogue"] == "靠过来点"
    assert truncated is False


def test_trailing_commas():
    data, _ = parse_model_json('{"dialogue": "慢一点", "items": [1, 2, ], }')
    assert data == {"dialogue": "慢一点", "items": [1, 2]}


def test_truncation_rejected_by_default():
    with pytest.raises(ValueError):
        parse_model_json('{"decision": "recommend", "recommended_level": 5')


def test_truncated_string_is_closed_when_allowed():
    data, truncated = parse_model_json('{"dialogue": "别怕，我们慢慢', allow_truncated=True)
    assert data == {"dialogue": "别怕，我们慢慢"}
    assert truncated is True


def test_truncated_nested_list_is_closed():
    raw = '{"dialogue": "好", "memory_proposals": [{"text": "喜欢慢'
    data, truncated = parse_model_json(raw, allow_truncated=True)
    assert data["memory_proposals"] == [{"text": "喜欢慢"}]
    assert truncated is True


def test_dangling_key_still_fails():
    with pytest.raises(ValueError):
        parse_model_json('{"dialogue": "好", "emotion":', allow_truncated=True)


def test_no_object():
    with pytest.raises(ValueError):
        parse_model_json("这是一段纯文本")


def test_non_object_root():
    with pytest.raises(ValueError):
        parse_model_json("[1, 2, 3]")


@pytest.mark.asyncio
async def test_truncated_chat_turn_keeps_dialogue_and_drops_proposals(monkeypatch):
    from app.config import settings
    from app.services import llm

    async def fake_complete(**kwargs):
        return (
            '```json\n{"dialogue": "好，记下了，我们慢慢来", "scene_ctrl": "stay", '
            '"memory_proposals": [{"text": "喜欢慢慢'
        )

    monkeypatch.setattr(settings, "llm_api_key", "test")
    monkeypatch.setattr(settings, "llm_base_url", "https://example.invalid/v1")
    monkeypatch.setattr(llm, "complete_json", fake_complete)
    result = await llm.generate_turn(
        AgentTurnRequest(user_id="u", persona_id="p", user_input="记住，我喜欢慢慢来"),
        [],
    )
    assert result.fallback == "none"
    assert result.dialogue == "好，记下了，我们慢慢来"
    assert result.memory_proposals == []
    assert result.skill_proposals == []
    assert result.action is None


@pytest.mark.asyncio
async def test_truncated_control_decision_falls_back_to_hold(monkeypatch):
    from app.config import settings
    from app.services import llm

    async def fake_complete(**kwargs):
        return '{"decision": "recommend", "recommended_skill_id": "rhythm_segment", "recommended_level": 6'

    monkeypatch.setattr(settings, "llm_api_key", "test")
    monkeypatch.setattr(settings, "llm_base_url", "https://example.invalid/v1")
    monkeypatch.setattr(llm, "complete_json", fake_complete)
    monkeypatch.setattr(llm, "_control_must_hold", lambda _request: False)
    result = await llm.generate_control(ControlDecisionRequest(user_id="u", session_id="s"))
    assert result.decision == "hold"
    assert result.reason_codes == ["model_unavailable"]
