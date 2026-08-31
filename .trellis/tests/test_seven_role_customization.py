from __future__ import annotations

import json
from pathlib import Path
import re
import tomllib
import unittest


ROOT = Path(__file__).resolve().parents[2]

NATIVE_DIRECT = ("research", "implement", "check")
CUSTOM_DIRECT = ("debug", "review", "audit", "release")
NATIVE_CHANNEL = ("implement", "check")
CUSTOM_CHANNEL = ("research", "debug", "review", "audit", "release")


class SevenRoleCustomizationTests(unittest.TestCase):
    def read(self, relative: str) -> str:
        return (ROOT / relative).read_text(encoding="utf-8")

    def profile(self, role: str) -> dict[str, object]:
        return tomllib.loads(self.read(f".codex/agents/trellis-{role}.toml"))

    def test_trellis_owns_only_native_agent_surfaces(self) -> None:
        hashes = json.loads(self.read(".trellis/.template-hashes.json"))["hashes"]

        for role in NATIVE_DIRECT:
            self.assertIn(f".codex/agents/trellis-{role}.toml", hashes)
        for role in CUSTOM_DIRECT:
            self.assertNotIn(f".codex/agents/trellis-{role}.toml", hashes)

        for role in NATIVE_CHANNEL:
            self.assertIn(f".trellis/agents/{role}.md", hashes)
        for role in CUSTOM_CHANNEL:
            self.assertNotIn(f".trellis/agents/{role}.md", hashes)

    def test_project_model_defaults_and_custom_profile_routes(self) -> None:
        project_config = tomllib.loads(self.read(".codex/config.toml"))
        self.assertEqual("gpt-5.6-sol", project_config["model"])
        self.assertEqual("medium", project_config["model_reasoning_effort"])
        self.assertEqual(
            "gpt-5.6-terra", project_config["agents"]["default_subagent_model"]
        )
        self.assertEqual(
            "high",
            project_config["agents"]["default_subagent_reasoning_effort"],
        )

        expected = {
            "debug": (
                "workspace-write",
                "implement.jsonl",
                "gpt-5.6-sol",
                "low",
            ),
            "review": ("read-only", "check.jsonl", "gpt-5.6-sol", "high"),
            "audit": ("read-only", "check.jsonl", "gpt-5.6-sol", "high"),
            "release": ("read-only", "check.jsonl", "gpt-5.6-sol", "high"),
        }

        for role, (sandbox, manifest, model, effort) in expected.items():
            with self.subTest(role=role):
                profile = self.profile(role)
                instructions = str(profile["developer_instructions"])
                self.assertEqual(sandbox, profile["sandbox_mode"])
                self.assertEqual(model, profile["model"])
                self.assertEqual(effort, profile["model_reasoning_effort"])
                self.assertIn("Active task: <path>", instructions)
                self.assertIn(manifest, instructions)
                self.assertIn("spawn another trellis", instructions.lower())
                self.assertNotIn("hook-injected", instructions)

        for role in ("implement", "check"):
            with self.subTest(unpinned_native_role=role):
                profile = self.profile(role)
                self.assertNotIn("model", profile)
                self.assertNotIn("model_reasoning_effort", profile)

        research_profile = self.profile("research")
        self.assertEqual("gpt-5.6-terra", research_profile["model"])
        self.assertEqual("medium", research_profile["model_reasoning_effort"])

    def test_route_table_covers_requested_models_and_fallback(self) -> None:
        routing = self.read(
            ".agents/skills/trellis-seven-role-routing/"
            "references/model-routing.md"
        )
        for route in (
            "micro",
            "exploration",
            "bounded_worker",
            "checking",
            "hard_checking",
            "coordination",
            "debugging",
            "planning",
            "hard_implementation",
            "review",
            "audit",
            "release",
            "memory_worker",
            "curator",
        ):
            self.assertIn(f"`{route}`", routing)
        for model in (
            "gpt-5.3-codex-spark",
            "gpt-5.6-terra",
            "gpt-5.6-sol",
        ):
            self.assertIn(model, routing)
        self.assertIn("fallback", routing.lower())
        self.assertIn("built-in bounded worker", routing)
        self.assertIn("Channel Boundary", routing)

        spec = self.read(".trellis/spec/backend/model-routing-and-dispatch.md")
        self.assertIn("Route: <model route from the route table>", spec)

    def test_pure_coordination_dispatch_policy(self) -> None:
        config = self.read(".trellis/config.yaml")
        workflow = self.read(".trellis/workflow.md")
        project_instructions = self.read("AGENTS.md")
        spec = self.read(".trellis/spec/backend/model-routing-and-dispatch.md")

        self.assertIn("dispatch_mode: auto", config)
        self.assertIn("Pure Coordination Dispatch Policy", project_instructions)
        self.assertIn("must not directly modify implementation", project_instructions)
        self.assertIn("Sol/medium is coordination-only", workflow)
        self.assertIn(
            "Sol/medium `hard_implementation` followed by Sol/xhigh",
            workflow,
        )
        self.assertRegex(workflow, r"at\s+most three such units concurrently")
        self.assertIn("but it must not edit the spec itself", workflow)
        self.assertIn("The Sol/medium main session is coordination-only", spec)

    def test_native_hook_matcher_stays_native_only(self) -> None:
        hooks = json.loads(self.read(".codex/hooks.json"))
        matcher = hooks["hooks"]["SubagentStart"][0]["matcher"]

        for role in NATIVE_DIRECT:
            self.assertRegex(f"trellis-{role}", matcher)
        for role in CUSTOM_DIRECT:
            self.assertIsNone(re.fullmatch(matcher, f"trellis-{role}"))

    def test_project_skill_and_channel_cards_cover_all_roles(self) -> None:
        skill = self.read(
            ".agents/skills/trellis-seven-role-routing/SKILL.md"
        )
        contract = self.read(
            ".agents/skills/trellis-seven-role-routing/"
            "references/role-contract.md"
        )
        routing = self.read(
            ".agents/skills/trellis-seven-role-routing/"
            "references/model-routing.md"
        )
        project_instructions = self.read("AGENTS.md")

        for role in (*NATIVE_DIRECT, *CUSTOM_DIRECT):
            self.assertIn(f"trellis-{role}", skill)
            self.assertIn(f"| {role} |", contract)
        self.assertIn("trellis-seven-role-routing", project_instructions)
        self.assertIn("model-routing.md", skill)
        self.assertIn("Seven-Role Mapping", routing)

        for role in (*NATIVE_CHANNEL, *CUSTOM_CHANNEL):
            card = self.read(f".trellis/agents/{role}.md")
            self.assertIn(f"name: {role}", card)
            self.assertRegex(card.lower(), r"(?:do not|forbidden operations)")

        for role in NATIVE_CHANNEL:
            card = self.read(f".trellis/agents/{role}.md")
            self.assertIn(
                "- Do not spawn a child Trellis role: do not invoke any "
                "`trellis-*` native sub-agent or `trellis channel spawn`.",
                card,
            )
            self.assertIn(
                "- Only the supervising main session may dispatch Trellis roles.",
                card,
            )
            self.assertIn("applies to the supervising main session, not to this agent", card)

    def test_claude_native_dispatch_remains_executable(self) -> None:
        workflow = self.read(".trellis/workflow.md")

        def shared_block_after(marker: str) -> str:
            section = workflow.split(marker, 1)[1]
            return section.split("[Claude Code,", 1)[1].split(
                "[/Claude Code,", 1
            )[0]

        breadcrumb = workflow.split("[workflow-state:in_progress]\n", 1)[1].split(
            "[/workflow-state:in_progress]", 1
        )[0]

        self.assertIn(
            "Claude Code retains its native `trellis-research`, "
            "`trellis-implement`, and `trellis-check` dispatch path",
            breadcrumb,
        )
        self.assertIn(
            "it does not require Codex model names or the four Codex assurance profiles",
            breadcrumb,
        )
        research = shared_block_after("#### 1.2 Research")
        implementation = shared_block_after("#### 2.1 Implement")
        checking = shared_block_after("#### 2.2 Quality check")
        self.assertIn("- **Agent type**: `trellis-research`", research)
        self.assertIn("- **Agent type**: `trellis-implement`", implementation)
        self.assertIn("- **Agent type**: `trellis-check`", checking)
        self.assertIn(
            "Claude Code uses its native `trellis-implement` agent without a Codex model requirement",
            implementation,
        )
        self.assertIn(
            "Claude Code uses its native `trellis-check` agent without a Codex model requirement",
            checking,
        )
        self.assertIn(
            "Claude Code uses its native `trellis-check` agent without a Codex model or",
            workflow,
        )

    def test_legacy_plugin_entry_points_are_removed(self) -> None:
        self.assertFalse((ROOT / "plugins/trellis-seven-role").exists())
        self.assertFalse((ROOT / ".agents/plugins/marketplace.json").exists())

        live_contract = "\n".join(
            self.read(path)
            for path in (
                "AGENTS.md",
                ".agents/skills/trellis-seven-role-routing/SKILL.md",
                ".trellis/spec/backend/model-routing-and-dispatch.md",
            )
        )
        self.assertNotIn("plugins/trellis-seven-role", live_contract)
        self.assertNotIn("dispatch.jsonl", live_contract)


if __name__ == "__main__":
    unittest.main()
