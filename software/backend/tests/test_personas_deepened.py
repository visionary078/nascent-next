import sys

import pytest

sys.path.insert(0, "software/backend")

from app.services.agent_contract import AgentTurnRequest
from app.services.personas.builtin_deepened import DEEPENED_PERSONAS, SHARED_RULES, find_deepened
from app.services.prompt_builder import build_messages


@pytest.mark.parametrize("persona_id, name", [("shuheng", "疏衡"), ("huaixi", "淮汐"), ("youting", "柚汀")])
def test_deepened_persona_gets_its_own_prompt_with_shared_safety(persona_id, name):
    messages = build_messages(
        AgentTurnRequest(user_id="u", persona_id=persona_id, user_input="在吗", persona={"user_name": "小鱼"}),
        [],
    )
    system = messages[0]["content"]
    assert f"你是 {name}" in system
    assert "小鱼" in system
    assert "{{CHAR_NAME}}" not in system and "{{USER_NAME}}" not in system
    assert SHARED_RULES.split("\n", 1)[0] in system
    assert "明确停止信号无条件立即执行" in system
    assert "角色卡：" not in system
    assert "Natsu" not in system


def test_builtin_id_in_payload_selects_deepened_persona():
    assert find_deepened("custom-xyz", {"builtinId": "huaixi"}).char_name == "淮汐"
    assert find_deepened("gentle", {}) is None
    assert find_deepened(None, None) is None


def test_persona_bodies_do_not_carry_their_own_safety_rules_or_command_tone():
    for item in DEEPENED_PERSONAS.values():
        assert "<safety_softcheck_hardstop>" not in item.body
        for phrase in ("跟着我的节奏", "别硬撑", "听话"):
            assert phrase not in item.body


def test_gentle_still_uses_builtin_001():
    system = build_messages(AgentTurnRequest(user_id="u", persona_id="gentle", user_input="在吗"), [])[0]["content"]
    assert "固有人设 001" in system


@pytest.mark.asyncio
async def test_persona_list_exposes_deepened_presets():
    from app.routers.persona import list_personas

    ids = [item.id for item in await list_personas()]
    assert ids == ["gentle", "shuheng", "huaixi", "youting"]
