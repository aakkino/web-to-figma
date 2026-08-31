from __future__ import annotations

import json
import os
from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / ".trellis" / "scripts"
sys.path.insert(0, str(SCRIPTS))

from harness_migration.codec import atomic_write_json, digest_path  # noqa: E402
from harness_migration.cli import main as migration_main  # noqa: E402
import harness_migration.transaction as transaction_module  # noqa: E402
from harness_migration.manifest import exported_files, load_manifest  # noqa: E402
from harness_migration.models import ExitCode, MigrationError, plan_from_dict  # noqa: E402
from harness_migration.planner import build_plan, calculate_plan_digest, resolve_plan, validate_plan_digest  # noqa: E402
from harness_migration.safety import active_sessions, contained_path  # noqa: E402
from harness_migration.transaction import _write_receipt, apply_plan, load_receipt, rollback_receipt  # noqa: E402
from harness_migration.verify import _run, verify_receipt  # noqa: E402
from common.paths import get_developer  # noqa: E402


def git(path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(path), *args], capture_output=True, text=True,
        encoding="utf-8", errors="replace", check=True,
    )


def initialize_git(path: Path) -> None:
    git(path, "init", "-q")
    git(path, "config", "user.email", "migration-tests@example.invalid")
    git(path, "config", "user.name", "Migration Tests")
    (path / "project.txt").write_text("project\n", encoding="utf-8")
    git(path, "add", ".")
    git(path, "commit", "-qm", "fixture")


def resolve_all(plan, *, existing: bool = False, modified_sidecar: str | None = None):
    selections: dict[str, str] = {}
    for decision in plan.decisions:
        if decision.id.startswith("official-baseline:"):
            selections[decision.id] = "preserve"
        elif modified_sidecar and modified_sidecar in decision.paths:
            selections[decision.id] = "sidecar"
        elif existing:
            selections[decision.id] = "keep" if "keep" in decision.allowed_choices else "skip"
        else:
            selections[decision.id] = "install" if "install" in decision.allowed_choices else "replace"
    return resolve_plan(plan, selections)


@unittest.skipUnless((ROOT / "export-manifest.json").is_file(), "requires a Harness source template")
class HarnessMigrationCoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.base = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def fresh_target(self, name: str = "target") -> Path:
        target = self.base / name
        target.mkdir()
        initialize_git(target)
        return target

    def partial_target(self, name: str = "partial") -> Path:
        target = self.base / name
        target.mkdir()
        (target / "project.txt").write_text("project\n", encoding="utf-8")
        for relative, contents in (
            (".trellis/spec/project.md", "project spec\n"),
            (".trellis/tasks/local/prd.md", "task history\n"),
            (".trellis/workspace/kino/journal.md", "journal\n"),
            (".trellis/.developer", "name=kino\n"),
            (".trellis/.current-task", "local\n"),
            (".trellis/.runtime/sessions/placeholder.json", "{}\n"),
        ):
            path = target / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8")
        initialize_git(target)
        return target

    def test_partial_adoption_is_complete_only_closed_and_preserves_project_roots(self) -> None:
        target = self.partial_target()
        project_spec = ".trellis/spec/project.md"
        project_spec_digest = digest_path(target / project_spec)
        preserved = {
            relative: digest_path(target / relative)
            for relative in (
                ".trellis/tasks", ".trellis/workspace", ".trellis/.developer",
                ".trellis/.current-task", ".trellis/.runtime",
            )
        }
        plan = build_plan(str(ROOT), str(target), profile="complete", adopt_partial=True)
        self.assertEqual(2, plan.schema_version)
        self.assertTrue(plan.adopt_partial)
        self.assertEqual("unsupported_partial", plan.target_state)
        self.assertFalse(plan.blockers)
        self.assertIn("adoptPartial", plan.to_dict())
        self.assertEqual(plan.to_dict(), plan_from_dict(plan.to_dict()).to_dict())
        missing_marker = dict(plan.to_dict())
        missing_marker.pop("adoptPartial")
        with self.assertRaisesRegex(MigrationError, "unknown or missing fields"):
            plan_from_dict(missing_marker)
        false_marker = dict(plan.to_dict())
        false_marker["adoptPartial"] = False
        with self.assertRaisesRegex(MigrationError, "reserved for partial adoption"):
            plan_from_dict(false_marker)
        re_digested_marker = plan_from_dict(plan.to_dict())
        re_digested_marker.adopt_partial = False
        re_digested_marker.plan_digest = calculate_plan_digest(re_digested_marker)
        with self.assertRaisesRegex(MigrationError, "digest or schema"):
            validate_plan_digest(re_digested_marker)
        self.assertFalse(any("baseline" in field.lower() for field in plan.to_dict()))
        with patch("harness_migration.recovery.build_recovery_plan") as recovery:
            self.assertEqual(
                plan.to_dict(),
                build_plan(str(ROOT), str(target), profile="complete", adopt_partial=True).to_dict(),
            )
        recovery.assert_not_called()
        self.assertTrue(any(
            action.path == ".trellis/.developer" and action.operation == "skip"
            for action in plan.actions
        ))
        self.assertTrue(any(
            action.path.startswith(".trellis/spec/") and action.decision_id
            for action in plan.actions
        ))

        selections = {
            decision.id: (
                "snapshot" if decision.id.startswith("official-baseline:")
                else "install" if "install" in decision.allowed_choices
                else "replace"
            )
            for decision in plan.decisions
        }
        resolved = resolve_plan(plan, selections)
        receipt, receipt_path = apply_plan(resolved)
        self.assertEqual(3, receipt["schemaVersion"])
        self.assertTrue(receipt["adoptPartial"])
        self.assertEqual(set(preserved), set(receipt["preservedDigests"]))
        self.assertIn(".trellis/spec", receipt["projectStateDigests"])
        self.assertEqual("existing_trellis", build_plan(str(ROOT), str(target)).target_state)
        for relative, expected in preserved.items():
            self.assertEqual(expected, digest_path(target / relative), relative)
        self.assertEqual(project_spec_digest, digest_path(target / project_spec))
        self.assertNotIn(project_spec, {entry["path"] for entry in receipt["journal"]})
        initial_report = verify_receipt(receipt_path, run_commands=False)
        self.assertEqual(
            "success",
            initial_report["status"],
            [check for check in initial_report["checks"] if check["status"] != "passed"],
        )
        legacy = dict(receipt)
        legacy["schemaVersion"] = 2
        legacy.pop("projectStateDigests")
        _write_receipt(receipt_path, legacy)
        self.assertEqual(2, load_receipt(receipt_path)["schemaVersion"])
        missing_project_state = dict(receipt)
        missing_project_state.pop("projectStateDigests")
        _write_receipt(receipt_path, missing_project_state)
        with self.assertRaisesRegex(MigrationError, "unknown or missing fields"):
            load_receipt(receipt_path)
        extended_project_state = dict(receipt)
        extended_project_state["projectStateDigests"] = {
            **receipt["projectStateDigests"],
            "unexpected-project-state": "missing",
        }
        _write_receipt(receipt_path, extended_project_state)
        with self.assertRaisesRegex(MigrationError, "project state digest coverage"):
            load_receipt(receipt_path)
        _write_receipt(receipt_path, receipt)
        receipt = load_receipt(receipt_path)
        receipt["verificationCommands"] = [[
            "python", "-c",
            "from pathlib import Path; Path('.trellis/spec/project.md').write_text('changed\\n', encoding='utf-8')",
        ]]
        _write_receipt(receipt_path, receipt)
        report = verify_receipt(receipt_path)
        self.assertEqual("failed", report["status"])
        self.assertEqual("passed", report["commands"][0]["status"])
        self.assertEqual(
            "failed",
            next(check for check in report["checks"] if check["path"] == ".trellis/spec")["status"],
        )
        rollback_receipt(receipt_path)

    def test_partial_adoption_refuses_other_profiles_and_target_states(self) -> None:
        target = self.partial_target()
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            self.assertEqual(
                ExitCode.INVALID_INPUT,
                migration_main([
                    "plan", "--template", str(ROOT), "--target", str(target),
                    "--adopt-partial", "--format", "json",
                ]),
            )
        with self.assertRaisesRegex(MigrationError, "requires --profile complete"):
            build_plan(str(ROOT), str(target), profile="dispatch-only", adopt_partial=True)
        with self.assertRaisesRegex(MigrationError, "does not accept --developer"):
            build_plan(str(ROOT), str(target), "alice", profile="complete", adopt_partial=True)
        with self.assertRaisesRegex(MigrationError, "requires a target classified exactly"):
            build_plan(str(ROOT), str(self.fresh_target("fresh")), adopt_partial=True)
        existing = self.partial_target("existing")
        (existing / ".trellis" / "config.yaml").write_text("project: test\n", encoding="utf-8")
        (existing / ".trellis" / "workflow.md").write_text("workflow\n", encoding="utf-8")
        git(existing, "add", ".")
        git(existing, "commit", "-qm", "existing fixture")
        with self.assertRaisesRegex(MigrationError, "requires a target classified exactly"):
            build_plan(str(ROOT), str(existing), profile="complete", adopt_partial=True)

    def test_partial_adoption_reuses_normal_prewrite_blockers(self) -> None:
        non_git = self.base / "partial-non-git"
        (non_git / ".trellis" / "spec").mkdir(parents=True)
        plan = build_plan(str(ROOT), str(non_git), profile="complete", adopt_partial=True)
        self.assertTrue(any("Git worktree" in blocker for blocker in plan.blockers))

        dirty = self.partial_target("partial-dirty")
        (dirty / "untracked.txt").write_text("dirty\n", encoding="utf-8")
        plan = build_plan(str(ROOT), str(dirty), profile="complete", adopt_partial=True)
        self.assertIn("target Git worktree is dirty", plan.blockers)

        active = self.partial_target("partial-active")
        active_session = active / ".trellis" / ".runtime" / "sessions" / "active.json"
        active_session.write_text('{"active": true}\n', encoding="utf-8")
        git(active, "add", ".")
        git(active, "commit", "-qm", "active session fixture")
        plan = build_plan(str(ROOT), str(active), profile="complete", adopt_partial=True)
        self.assertTrue(any("active runtime session" in blocker for blocker in plan.blockers))

        linked = self.partial_target("partial-linked")
        link_path = linked / "AGENTS.md"
        with patch(
            "harness_migration.safety.is_link_like",
            side_effect=lambda path: path == link_path,
        ):
            plan = build_plan(str(ROOT), str(linked), profile="complete", adopt_partial=True)
        self.assertTrue(any("symlink traversal" in blocker for blocker in plan.blockers))

    def test_partial_adoption_canonical_replay_blocks_clean_decision_drift_before_backup(self) -> None:
        target = self.partial_target("partial-stale")
        plan = resolve_all(build_plan(str(ROOT), str(target), profile="complete", adopt_partial=True))
        (target / ".trellis" / "config.yaml").write_text("project: local\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "changed partial preimage")
        backup = self.base / "partial-stale-backup"

        with self.assertRaisesRegex(MigrationError, "canonical migration plan") as raised:
            apply_plan(plan, str(backup))

        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)
        self.assertFalse(backup.exists())

    def test_partial_adoption_failure_receipts_remain_loadable_and_retryable(self) -> None:
        target = self.partial_target("partial-failure")
        before = digest_path(target)
        plan = resolve_all(build_plan(str(ROOT), str(target), profile="complete", adopt_partial=True))
        failed_backup = self.base / "partial-failure-backup"
        with patch.dict(os.environ, {"HARNESS_MIGRATE_FAIL_AFTER": "1"}):
            with self.assertRaises(MigrationError) as raised:
                apply_plan(plan, str(failed_backup))
        self.assertEqual(ExitCode.APPLY_FAILED, raised.exception.exit_code)
        failed_path = failed_backup / "receipt.json"
        failed_receipt = load_receipt(failed_path)
        self.assertEqual("apply_failed", failed_receipt["status"])
        self.assertIsInstance(failed_receipt["failure"], str)
        rollback_receipt(failed_path)
        self.assertEqual(before, digest_path(target))

        rollback_target = self.partial_target("partial-rollback-failure")
        config = rollback_target / ".trellis" / "config.yaml"
        config.write_text("project: local\n", encoding="utf-8")
        git(rollback_target, "add", ".")
        git(rollback_target, "commit", "-qm", "partial rollback fixture")
        rollback_before = digest_path(rollback_target)
        rollback_plan = resolve_all(build_plan(
            str(ROOT), str(rollback_target), profile="complete", adopt_partial=True,
        ))
        _, rollback_path = apply_plan(rollback_plan, str(self.base / "partial-rollback-backup"))
        with patch("harness_migration.transaction._copy_bytes_atomic", side_effect=OSError("injected rollback failure")):
            with self.assertRaises(MigrationError) as rollback_error:
                rollback_receipt(rollback_path)
        self.assertEqual(ExitCode.ROLLBACK_REFUSED, rollback_error.exception.exit_code)
        rollback_failed = load_receipt(rollback_path)
        self.assertEqual("rollback_failed", rollback_failed["status"])
        self.assertIsInstance(rollback_failed["failure"], str)
        rollback_receipt(rollback_path)
        self.assertEqual(rollback_before, digest_path(rollback_target))

    def test_manifest_is_complete_and_excludes_runtime_and_caches(self) -> None:
        manifest = load_manifest(ROOT)
        files = exported_files(ROOT, manifest)
        self.assertGreater(len(files), 50)
        self.assertNotIn(".trellis/.runtime/sessions/codex-test.json", files)
        self.assertFalse(any("__pycache__" in path or path.endswith(".pyc") for path in files))
        self.assertIn(".trellis/scripts/harness_migrate.py", files)

    def test_dispatch_only_profile_selects_only_dispatch_surfaces(self) -> None:
        manifest = load_manifest(ROOT)
        complete = exported_files(ROOT, manifest)
        dispatch = exported_files(ROOT, manifest, "dispatch-only")

        self.assertEqual(complete, exported_files(ROOT, manifest, "complete"))
        self.assertLess(len(dispatch), len(complete))
        expected = {
            ".agents/skills/trellis-seven-role-routing/SKILL.md",
            ".agents/skills/trellis-seven-role-routing/references/model-routing.md",
            ".agents/skills/trellis-seven-role-routing/references/role-contract.md",
            ".codex/agents/trellis-audit.toml",
            ".codex/agents/trellis-check.toml",
            ".codex/agents/trellis-debug.toml",
            ".codex/agents/trellis-implement.toml",
            ".codex/agents/trellis-release.toml",
            ".codex/agents/trellis-research.toml",
            ".codex/agents/trellis-review.toml",
            ".codex/hooks/inject-spec-context.py",
            ".codex/hooks/inject-subagent-context.py",
            ".codex/hooks/inject-workflow-state.py",
            ".codex/hooks/session-start.py",
            ".trellis/agents/audit.md",
            ".trellis/agents/check.md",
            ".trellis/agents/debug.md",
            ".trellis/agents/implement.md",
            ".trellis/agents/release.md",
            ".trellis/agents/research.md",
            ".trellis/agents/review.md",
            "AGENTS.md",
            ".codex/config.toml",
            ".codex/hooks.json",
            ".trellis/config.yaml",
            ".trellis/workflow.md",
            ".trellis/spec/backend/model-routing-and-dispatch.md",
        }
        self.assertEqual(27, len(expected))
        self.assertEqual(expected, set(dispatch))
        self.assertTrue(all(
            relative == PurePosixPath(relative).as_posix()
            and "\\" not in relative
            and not relative.startswith("/")
            for relative in dispatch
        ))
        self.assertFalse(any(relative.startswith(".trellis/scripts/") for relative in dispatch))
        self.assertFalse(any(relative.startswith(".trellis/tests/") for relative in dispatch))
        self.assertFalse(any(relative.startswith(".agents/skills/harness-migration/") for relative in dispatch))
        self.assertEqual(
            {".trellis/spec/backend/model-routing-and-dispatch.md"},
            {relative for relative in dispatch if relative.startswith(".trellis/spec/")},
        )

        with self.assertRaisesRegex(MigrationError, "unknown migration profile"):
            exported_files(ROOT, manifest, "missing")

    def test_manifest_rejects_invalid_types_and_latent_equal_overlaps(self) -> None:
        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        template = self.base / "invalid-manifest"
        template.mkdir()
        raw["migrationPolicy"]["migrationRules"][0]["modes"] = "fresh"
        atomic_write_json(template / "export-manifest.json", raw)
        with self.assertRaises(MigrationError):
            load_manifest(template)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        duplicate = dict(raw["migrationPolicy"]["migrationRules"][0])
        duplicate["path"] = ".latent/*"
        duplicate["sourceRequired"] = False
        raw["migrationPolicy"]["migrationRules"].extend([duplicate, dict(duplicate)])
        atomic_write_json(template / "export-manifest.json", raw)
        with self.assertRaisesRegex(MigrationError, "overlap"):
            load_manifest(template)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        raw["sourceVersion"] = 7
        atomic_write_json(template / "export-manifest.json", raw)
        with self.assertRaisesRegex(MigrationError, "sourceVersion"):
            load_manifest(template)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        raw["migrationPolicy"]["migrationRules"][0]["path"] = ".agents//skills/**"
        atomic_write_json(template / "export-manifest.json", raw)
        with self.assertRaisesRegex(MigrationError, "normalized"):
            load_manifest(template)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        raw["migrationProfiles"]["dispatch-only"]["include"][0] = "AGENTS\\md"
        with patch("harness_migration.manifest.read_json", return_value=raw):
            with self.assertRaisesRegex(MigrationError, "invalid migration rule path"):
                load_manifest(ROOT)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        raw["migrationProfiles"]["dispatch-only"]["include"].append("AGENTS.md")
        with patch("harness_migration.manifest.read_json", return_value=raw):
            with self.assertRaisesRegex(MigrationError, "duplicate include patterns"):
                load_manifest(ROOT)

        raw = json.loads((ROOT / "export-manifest.json").read_text(encoding="utf-8"))
        raw["migrationProfiles"]["dispatch-only"]["include"][0] = "missing/**"
        with patch("harness_migration.manifest.read_json", return_value=raw):
            with self.assertRaisesRegex(MigrationError, "matched no exported path"):
                load_manifest(ROOT)

    def test_fresh_plan_is_stable_and_non_mutating(self) -> None:
        target = self.fresh_target()
        before = digest_path(target)
        first = build_plan(str(ROOT), str(target), "alice")
        second = build_plan(str(ROOT), str(target), "alice")
        explicit_complete = build_plan(
            str(ROOT), str(target), "alice", profile="complete"
        )
        self.assertEqual("fresh", first.target_state)
        self.assertEqual("complete", first.profile)
        self.assertFalse(first.blockers)
        self.assertEqual(first.to_dict(), second.to_dict())
        self.assertEqual(first.to_dict(), explicit_complete.to_dict())
        self.assertEqual(before, digest_path(target))
        destinations = {action.path for action in first.actions}
        self.assertIn(".trellis/workspace/alice/index.md", destinations)
        self.assertNotIn(".trellis/workspace/kino/index.md", destinations)
        baseline = {
            action.path: action.operation for action in first.actions
            if action.path in {".trellis/.version", ".trellis/.template-hashes.json"}
        }
        self.assertEqual({".trellis/.version": "copy", ".trellis/.template-hashes.json": "copy"}, baseline)

        value = first.to_dict()
        value["actions"][0]["unexpected"] = True
        with self.assertRaises(MigrationError):
            plan_from_dict(value)

    def test_plan_profile_round_trips_and_is_digest_protected(self) -> None:
        target = self.fresh_target()
        plan = build_plan(str(ROOT), str(target), "alice", "dispatch-only")
        self.assertEqual("dispatch-only", plan.profile)
        self.assertEqual("dispatch-only", plan_from_dict(plan.to_dict()).profile)

        resolved = resolve_all(plan_from_dict(plan.to_dict()))
        self.assertEqual("dispatch-only", resolved.profile)
        self.assertEqual("dispatch-only", plan_from_dict(resolved.to_dict()).profile)
        validate_plan_digest(resolved)

        missing_profile = plan.to_dict()
        missing_profile.pop("profile")
        with self.assertRaisesRegex(MigrationError, "unknown or missing fields"):
            plan_from_dict(missing_profile)

        non_string_profile = plan.to_dict()
        non_string_profile["profile"] = None
        with self.assertRaisesRegex(MigrationError, "profile must be a string"):
            plan_from_dict(non_string_profile)

        plan.profile = "complete"
        with self.assertRaisesRegex(MigrationError, "digest or schema"):
            validate_plan_digest(plan)

        with self.assertRaisesRegex(MigrationError, "unknown migration profile"):
            build_plan(str(ROOT), str(target), "alice", "missing")

    def test_apply_revalidates_the_selected_profile_canonically(self) -> None:
        target = self.fresh_target()
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice", "dispatch-only"))
        plan.profile = "complete"
        plan.plan_digest = calculate_plan_digest(plan)

        with self.assertRaisesRegex(MigrationError, "canonical migration plan") as raised:
            apply_plan(plan)
        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)
        self.assertFalse((target / ".trellis").exists())

        plan.profile = "missing"
        plan.plan_digest = calculate_plan_digest(plan)
        with self.assertRaisesRegex(MigrationError, "unknown migration profile"):
            apply_plan(plan)
        self.assertFalse((target / ".trellis").exists())

    def test_dirty_non_git_and_session_targets_are_blocked(self) -> None:
        non_git = self.base / "non-git"
        non_git.mkdir()
        plan = build_plan(str(ROOT), str(non_git), "alice")
        self.assertTrue(any("Git worktree" in item for item in plan.blockers))

        dirty = self.fresh_target("dirty")
        (dirty / "untracked.txt").write_text("dirty", encoding="utf-8")
        plan = build_plan(str(ROOT), str(dirty), "alice")
        self.assertIn("target Git worktree is dirty", plan.blockers)

        existing = self.fresh_target("session")
        (existing / ".trellis" / ".runtime" / "sessions").mkdir(parents=True)
        (existing / ".trellis" / "config.yaml").write_text("project: test\n", encoding="utf-8")
        (existing / ".trellis" / "workflow.md").write_text("workflow\n", encoding="utf-8")
        (existing / ".trellis" / ".runtime" / "sessions" / "active.json").write_text('{"active":true}\n', encoding="utf-8")
        git(existing, "add", ".")
        git(existing, "commit", "-qm", "existing")
        plan = build_plan(str(ROOT), str(existing))
        self.assertTrue(any("active runtime session" in item for item in plan.blockers))

        nested = self.fresh_target("nested-session")
        sessions = nested / ".trellis" / ".runtime" / "sessions"
        (sessions / "worker" / "deep").mkdir(parents=True)
        (nested / ".trellis" / "config.yaml").write_text("project: test\n", encoding="utf-8")
        (nested / ".trellis" / "workflow.md").write_text("workflow\n", encoding="utf-8")
        (sessions / "placeholder.json").write_text("{}\n", encoding="utf-8")
        (sessions / "worker" / "empty.json").write_text("null\n", encoding="utf-8")
        (sessions / "worker" / "deep" / "active.json").write_text('{"active":true}\n', encoding="utf-8")
        git(nested, "add", ".")
        git(nested, "commit", "-qm", "nested session fixture")
        plan = build_plan(str(ROOT), str(nested))
        session_blocker = next(item for item in plan.blockers if "active runtime session" in item)
        self.assertIn("worker/deep/active.json", session_blocker)
        self.assertNotIn("placeholder.json", session_blocker)
        self.assertNotIn("worker/empty.json", session_blocker)

    def test_same_nested_and_symlink_paths_are_refused(self) -> None:
        same = self.fresh_target("same")
        with self.assertRaises(MigrationError):
            build_plan(str(same), str(same), "alice")

        template = self.base / "template"
        nested = template / "nested-target"
        nested.mkdir(parents=True)
        with self.assertRaises(MigrationError):
            build_plan(str(template), str(nested), "alice")

        target = self.fresh_target("symlink")
        outside = self.base / "outside-agents.md"
        outside.write_text("outside\n", encoding="utf-8")
        try:
            (target / "AGENTS.md").symlink_to(outside)
        except OSError:
            self.skipTest("filesystem does not permit symlink creation")
        git(target, "add", ".")
        git(target, "commit", "-qm", "symlink fixture")
        plan = build_plan(str(ROOT), str(target), "alice")
        self.assertTrue(any("symlink traversal" in item for item in plan.blockers))

    def test_link_traversal_probe_is_platform_independent(self) -> None:
        target = self.fresh_target()
        linked = target / "linked"
        linked.mkdir()
        with patch("harness_migration.safety.is_link_like", side_effect=lambda path: path == linked):
            with self.assertRaisesRegex(MigrationError, "symlink traversal"):
                contained_path(target, "linked/child.txt")

        sessions = target / ".trellis" / ".runtime" / "sessions"
        nested_link = sessions / "worker" / "linked-runtime"
        nested_link.mkdir(parents=True)
        with patch("harness_migration.safety.is_link_like", side_effect=lambda path: path == nested_link):
            self.assertEqual(["worker/linked-runtime"], active_sessions(target))

        unreadable = sessions / "worker" / "unreadable.json"
        unreadable.write_text("{}\n", encoding="utf-8")
        original_lstat = Path.lstat

        def deny_nested_entry(path):
            if path == unreadable:
                raise PermissionError("injected unreadable session entry")
            return original_lstat(path)

        with patch.object(Path, "lstat", autospec=True, side_effect=deny_nested_entry):
            self.assertEqual(["worker/unreadable.json"], active_sessions(target))

    def test_non_directory_target_parent_becomes_a_plan_blocker(self) -> None:
        target = self.fresh_target()
        (target / ".agents").write_text("not a directory\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "partial target")
        plan = build_plan(str(ROOT), str(target), "alice")
        self.assertTrue(any("path parent is not a directory" in blocker for blocker in plan.blockers))

    def test_existing_target_without_official_baseline_requires_snapshot_pair(self) -> None:
        target = self.fresh_target()
        (target / ".trellis").mkdir()
        (target / ".trellis" / "config.yaml").write_text("project: test\n", encoding="utf-8")
        (target / ".trellis" / "workflow.md").write_text("workflow\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "existing without baseline")
        plan = build_plan(str(ROOT), str(target))
        baseline = next(decision for decision in plan.decisions if decision.id.startswith("official-baseline:"))
        self.assertEqual(["snapshot"], baseline.allowed_choices)

    def test_fresh_apply_verify_and_exact_rollback(self) -> None:
        target = self.fresh_target()
        staging_sentinel = target / "AGENTS.md.harness-tmp"
        staging_sentinel.write_text("project-owned staging name\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "staging sentinel")
        before = digest_path(target)
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        receipt, receipt_path = apply_plan(plan)
        self.assertEqual("applied", receipt["status"])
        self.assertEqual("name=alice\n", (target / ".trellis" / ".developer").read_text(encoding="utf-8"))
        self.assertEqual("alice", get_developer(target))
        self.assertEqual("project-owned staging name\n", staging_sentinel.read_text(encoding="utf-8"))
        self.assertEqual(plan.verification_commands, receipt["verificationCommands"])
        self.assertFalse((target / ".trellis" / "workspace" / "kino").exists())
        report = verify_receipt(receipt_path, run_commands=False)
        self.assertEqual("success", report["status"])
        rollback_receipt(receipt_path)
        self.assertEqual(before, digest_path(target))
        self.assertFalse((target / ".trellis").exists())
        self.assertFalse((target / ".codex").exists())

    def test_atomic_json_write_does_not_consume_legacy_temp_name(self) -> None:
        destination = self.base / "document.json"
        sentinel = destination.with_name(destination.name + ".tmp")
        sentinel.write_text("project-owned\n", encoding="utf-8")
        atomic_write_json(destination, {"ok": True})
        self.assertEqual("project-owned\n", sentinel.read_text(encoding="utf-8"))
        parent_file = self.base / "not-a-directory"
        parent_file.write_text("occupied\n", encoding="utf-8")
        with self.assertRaisesRegex(MigrationError, "atomically write"):
            atomic_write_json(parent_file / "document.json", {"ok": False})

    def test_invalid_receipt_errors_use_command_specific_exit_codes(self) -> None:
        missing = self.base / "missing-receipt.json"
        with self.assertRaises(MigrationError) as verify_error:
            verify_receipt(missing, run_commands=False)
        self.assertEqual(ExitCode.VERIFICATION_FAILED, verify_error.exception.exit_code)
        with self.assertRaises(MigrationError) as rollback_error:
            rollback_receipt(missing)
        self.assertEqual(ExitCode.ROLLBACK_REFUSED, rollback_error.exception.exit_code)

    def test_unresolved_apply_and_failed_verification_are_explicit(self) -> None:
        unresolved_target = self.fresh_target("unresolved")
        unresolved = build_plan(str(ROOT), str(unresolved_target), "alice")
        with self.assertRaises(MigrationError) as raised:
            apply_plan(unresolved)
        self.assertEqual(ExitCode.UNRESOLVED, raised.exception.exit_code)
        self.assertFalse(any(unresolved_target.parent.glob(f".{unresolved_target.name}.harness-backup-*")))

        forged = resolve_all(unresolved)
        support_action = next(action for action in forged.actions if action.path == "README.md")
        support_action.operation = "copy"
        support_action.reason = "forged support-file install"
        forged.plan_digest = calculate_plan_digest(forged)
        with self.assertRaisesRegex(MigrationError, "canonical migration plan") as forged_error:
            apply_plan(forged)
        self.assertEqual(ExitCode.BLOCKED, forged_error.exception.exit_code)
        self.assertFalse((unresolved_target / "README.md").exists())

        target = self.fresh_target("verify-failure")
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        _, receipt_path = apply_plan(plan)
        installed = target / ".trellis" / "scripts" / "get_context.py"
        installed.unlink()
        report = verify_receipt(receipt_path, run_commands=False)
        self.assertEqual("failed", report["status"])
        self.assertTrue(any(check["path"] == ".trellis/scripts/get_context.py" and check["status"] == "failed" for check in report["checks"]))

    def test_verification_resolves_windows_command_shims_and_accepts_no_current_task(self) -> None:
        target = self.fresh_target()
        completed = SimpleNamespace(returncode=1, stdout='{"current_task":null}\n', stderr="")
        command = ["python", ".trellis/scripts/task.py", "current", "--json"]
        with patch("harness_migration.verify.shutil.which", return_value="C:/Python/python.exe"), patch(
            "harness_migration.verify.subprocess.run", return_value=completed,
        ) as run:
            result = _run(command, target)
        self.assertEqual("passed", result["status"])
        self.assertEqual("C:/Python/python.exe", run.call_args.args[0][0])

        completed.stdout = ""
        with patch("harness_migration.verify.shutil.which", return_value="C:/Python/python.exe"), patch(
            "harness_migration.verify.subprocess.run", return_value=completed,
        ):
            result = _run(command, target)
        self.assertEqual("failed", result["status"])

        with patch("harness_migration.verify.shutil.which", return_value="C:/Tools/trellis.CMD"), patch(
            "harness_migration.verify.subprocess.run", return_value=completed,
        ) as run:
            result = _run(["trellis", "update", "--dry-run"], target)
        self.assertEqual("failed", result["status"])
        self.assertEqual("C:/Tools/trellis.CMD", run.call_args.args[0][0])

    def test_verification_checks_final_state_after_commands(self) -> None:
        target = self.base / "verification-target"
        target.mkdir()
        installed = target / "installed.txt"
        installed.write_text("installed\n", encoding="utf-8")
        installed_digest = digest_path(installed)
        receipt_path = self.base / "verification-backup" / "receipt.json"
        receipt = {
            "schemaVersion": 1,
            "status": "applied",
            "planDigest": "sha256:" + "0" * 64,
            "targetState": "fresh",
            "templateRoot": str(ROOT),
            "targetRoot": str(target.resolve()),
            "backupRoot": str(receipt_path.parent.resolve()),
            "receiptPath": str(receipt_path.resolve()),
            "journal": [{
                "sourcePath": "installed.txt", "path": "installed.txt", "operation": "copy",
                "preDigest": "missing", "postDigest": installed_digest,
                "expectedPostDigest": installed_digest, "backupPath": None,
                "createdParents": [], "state": "applied",
            }],
            "preservedDigests": {},
            "verificationCommands": [["fake-check"]],
            "verification": None,
            "receiptDigest": "",
        }
        _write_receipt(receipt_path, receipt)

        def mutate_during_check(command, command_target):
            self.assertEqual(target, command_target)
            installed.write_text("changed by check\n", encoding="utf-8")
            return {"command": command, "status": "passed", "exitCode": 0, "stdout": "", "stderr": ""}

        with patch("harness_migration.verify._run", side_effect=mutate_during_check):
            report = verify_receipt(receipt_path)
        self.assertEqual("failed", report["status"])
        self.assertEqual("failed", report["checks"][0]["status"])
        self.assertNotEqual(installed_digest, report["checks"][0]["actual"])

    def test_verification_refuses_commands_when_precheck_fails(self) -> None:
        target = self.base / "verification-precheck-target"
        target.mkdir()
        installed = target / "installed.txt"
        installed.write_text("installed\n", encoding="utf-8")
        installed_digest = digest_path(installed)
        receipt_path = self.base / "verification-precheck-backup" / "receipt.json"
        receipt = {
            "schemaVersion": 1, "status": "applied", "planDigest": "sha256:" + "0" * 64,
            "targetState": "fresh", "templateRoot": str(ROOT),
            "targetRoot": str(target.resolve()), "backupRoot": str(receipt_path.parent.resolve()),
            "receiptPath": str(receipt_path.resolve()),
            "journal": [{
                "sourcePath": "installed.txt", "path": "installed.txt", "operation": "copy",
                "preDigest": "missing", "postDigest": installed_digest,
                "expectedPostDigest": installed_digest, "backupPath": None,
                "createdParents": [], "state": "applied",
            }],
            "preservedDigests": {}, "verificationCommands": [["fake-check"]],
            "verification": None, "receiptDigest": "",
        }
        _write_receipt(receipt_path, receipt)
        installed.write_text("changed before verification\n", encoding="utf-8")

        with patch("harness_migration.verify._run") as run:
            report = verify_receipt(receipt_path)

        run.assert_not_called()
        self.assertEqual("failed", report["status"])
        self.assertEqual([], report["commands"])
        self.assertNotEqual(installed_digest, report["checks"][0]["actual"])

        output = StringIO()
        with patch("harness_migration.verify._run") as run, redirect_stdout(output):
            exit_code = migration_main(["verify", "--receipt", str(receipt_path), "--format", "json"])
        run.assert_not_called()
        self.assertEqual(ExitCode.VERIFICATION_FAILED, exit_code)
        self.assertEqual("failed", json.loads(output.getvalue())["status"])

    def test_verification_reports_uninspectable_digest_without_running_commands(self) -> None:
        target = self.base / "verification-inspection-target"
        target.mkdir()
        installed = target / "installed.txt"
        installed.write_text("installed\n", encoding="utf-8")
        installed_digest = digest_path(installed)
        receipt_path = self.base / "verification-inspection-backup" / "receipt.json"
        receipt = {
            "schemaVersion": 1, "status": "applied", "planDigest": "sha256:" + "0" * 64,
            "targetState": "fresh", "templateRoot": str(ROOT),
            "targetRoot": str(target.resolve()), "backupRoot": str(receipt_path.parent.resolve()),
            "receiptPath": str(receipt_path.resolve()),
            "journal": [{
                "sourcePath": "installed.txt", "path": "installed.txt", "operation": "copy",
                "preDigest": "missing", "postDigest": installed_digest,
                "expectedPostDigest": installed_digest, "backupPath": None,
                "createdParents": [], "state": "applied",
            }],
            "preservedDigests": {}, "verificationCommands": [["fake-check"]],
            "verification": None, "receiptDigest": "",
        }
        _write_receipt(receipt_path, receipt)

        with patch("harness_migration.verify.digest_path", side_effect=MigrationError("cannot inspect installed path")), patch(
            "harness_migration.verify._run",
        ) as run:
            report = verify_receipt(receipt_path)

        run.assert_not_called()
        self.assertEqual("failed", report["status"])
        self.assertIsNone(report["checks"][0]["actual"])
        self.assertEqual("cannot inspect installed path", report["checks"][0]["error"])

    def test_verification_checks_all_preserved_digests_before_commands(self) -> None:
        target = self.base / "verification-preserved-target"
        tasks = target / ".trellis" / "tasks"
        tasks.mkdir(parents=True)
        (tasks / "history.md").write_text("preserved\n", encoding="utf-8")
        expected_tasks = digest_path(tasks)
        receipt_path = self.base / "verification-preserved-backup" / "receipt.json"
        receipt = {
            "schemaVersion": 1, "status": "applied", "planDigest": "sha256:" + "0" * 64,
            "targetState": "existing_trellis", "templateRoot": str(ROOT),
            "targetRoot": str(target.resolve()), "backupRoot": str(receipt_path.parent.resolve()),
            "receiptPath": str(receipt_path.resolve()), "journal": [],
            "preservedDigests": {
                ".trellis/tasks": expected_tasks,
                ".trellis/workspace": "missing",
                ".trellis/.developer": "missing",
                ".trellis/.current-task": "missing",
                ".trellis/.runtime": "missing",
            },
            "verificationCommands": [["fake-check"]], "verification": None,
            "receiptDigest": "",
        }
        _write_receipt(receipt_path, receipt)
        (tasks / "history.md").write_text("changed\n", encoding="utf-8")

        with patch("harness_migration.verify._run") as run:
            report = verify_receipt(receipt_path)

        run.assert_not_called()
        self.assertEqual("failed", report["status"])
        self.assertEqual(
            "failed",
            next(check for check in report["checks"] if check["path"] == ".trellis/tasks")["status"],
        )

    def test_existing_customization_becomes_sidecar_and_history_is_preserved(self) -> None:
        target = self.fresh_target()
        fresh = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        _, fresh_receipt = apply_plan(fresh)
        # Commit the installed fixture so the existing-target safety probe is clean.
        git(target, "add", ".")
        git(target, "commit", "-qm", "installed harness")
        managed = target / ".trellis" / "scripts" / "get_context.py"
        managed.write_text("# local customization\n", encoding="utf-8")
        history = target / ".trellis" / "tasks" / "local-task" / "prd.md"
        history.parent.mkdir(parents=True)
        history.write_text("keep history\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "local changes")
        history_before = digest_path(history)

        plan = build_plan(str(ROOT), str(target))
        self.assertEqual("existing_trellis", plan.target_state)
        snapshot_plan = plan_from_dict(plan.to_dict())
        snapshot_selections = {}
        for decision in snapshot_plan.decisions:
            if decision.id.startswith("official-baseline:"):
                snapshot_selections[decision.id] = "snapshot"
            else:
                snapshot_selections[decision.id] = "keep" if "keep" in decision.allowed_choices else "skip"
        resolve_plan(snapshot_plan, snapshot_selections)
        with self.assertRaises(MigrationError) as raised:
            apply_plan(snapshot_plan)
        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)

        plan = resolve_all(plan, existing=True, modified_sidecar=".trellis/scripts/get_context.py")
        _, receipt_path = apply_plan(plan)
        sidecar = target / ".trellis" / "scripts" / "get_context.py.harness-new"
        self.assertTrue(sidecar.is_file())
        self.assertEqual("# local customization\n", managed.read_text(encoding="utf-8"))
        self.assertEqual(history_before, digest_path(history))
        report = verify_receipt(receipt_path, run_commands=False)
        self.assertEqual("incomplete", report["status"])

    def test_stale_sidecar_and_post_apply_edit_refuse_mutation(self) -> None:
        target = self.fresh_target()
        (target / "AGENTS.md").write_text("project instructions\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "project instructions")
        plan = build_plan(str(ROOT), str(target), "alice")
        plan = resolve_all(plan, modified_sidecar="AGENTS.md")
        (target / "AGENTS.md.harness-new").write_text("late\n", encoding="utf-8")
        git(target, "add", ".")
        git(target, "commit", "-qm", "late sidecar")
        with self.assertRaises(MigrationError) as raised:
            apply_plan(plan)
        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)

        target2 = self.fresh_target("post-edit")
        applied = resolve_all(build_plan(str(ROOT), str(target2), "alice"))
        _, receipt_path = apply_plan(applied)
        changed = target2 / ".trellis" / "scripts" / "get_context.py"
        changed.write_text("post apply edit\n", encoding="utf-8")
        with self.assertRaises(MigrationError) as raised:
            rollback_receipt(receipt_path)
        self.assertEqual(ExitCode.ROLLBACK_REFUSED, raised.exception.exit_code)

    def test_partial_failure_receipt_rolls_back_applied_paths(self) -> None:
        target = self.fresh_target()
        before = digest_path(target)
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        old = os.environ.get("HARNESS_MIGRATE_FAIL_AFTER")
        os.environ["HARNESS_MIGRATE_FAIL_AFTER"] = "2"
        expected_receipt = target.parent / f".{target.name}.harness-backup-{plan.plan_digest[7:19]}" / "receipt.json"
        try:
            with self.assertRaises(MigrationError) as raised:
                apply_plan(plan)
            self.assertEqual(ExitCode.APPLY_FAILED, raised.exception.exit_code)
        finally:
            if old is None:
                os.environ.pop("HARNESS_MIGRATE_FAIL_AFTER", None)
            else:
                os.environ["HARNESS_MIGRATE_FAIL_AFTER"] = old
        self.assertEqual("apply_failed", load_receipt(expected_receipt)["status"])
        rollback_receipt(expected_receipt)
        self.assertEqual(before, digest_path(target))
        self.assertFalse((target / ".trellis").exists())

    def test_apply_rechecks_live_preimage_before_backup(self) -> None:
        target = self.fresh_target()
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        late_path = target / ".trellis" / "scripts" / "get_context.py"
        original_revalidate = transaction_module._revalidate_plan

        def mutate_after_revalidation(candidate):
            result = original_revalidate(candidate)
            late_path.parent.mkdir(parents=True)
            late_path.write_text("late user content\n", encoding="utf-8")
            return result

        with patch("harness_migration.transaction._revalidate_plan", side_effect=mutate_after_revalidation):
            with self.assertRaises(MigrationError) as raised:
                apply_plan(plan)
        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)
        self.assertEqual("late user content\n", late_path.read_text(encoding="utf-8"))

    def test_interrupted_prepared_receipt_can_roll_back(self) -> None:
        target = self.fresh_target()
        before = digest_path(target)
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        receipt_path = target.parent / f".{target.name}.harness-backup-{plan.plan_digest[7:19]}" / "receipt.json"
        original_copy = transaction_module._copy_bytes_atomic

        def interrupt_after_replace(destination, data):
            original_copy(destination, data)
            raise KeyboardInterrupt

        with patch("harness_migration.transaction._copy_bytes_atomic", side_effect=interrupt_after_replace):
            with self.assertRaises(KeyboardInterrupt):
                apply_plan(plan)
        receipt = load_receipt(receipt_path)
        self.assertEqual("prepared", receipt["status"])
        self.assertIn("applying", {entry["state"] for entry in receipt["journal"]})
        rollback_receipt(receipt_path)
        self.assertEqual(before, digest_path(target))

    def test_partial_rollback_is_retryable(self) -> None:
        target = self.base / "rollback-target"
        target.mkdir()
        backup = self.base / "rollback-backup"
        receipt_path = backup / "receipt.json"
        journal = []
        for name in ("a.txt", "b.txt"):
            destination = target / name
            destination.write_text(f"post-{name}\n", encoding="utf-8")
            preimage = backup / "preimage" / name
            preimage.parent.mkdir(parents=True, exist_ok=True)
            preimage.write_text(f"pre-{name}\n", encoding="utf-8")
            journal.append({
                "sourcePath": name, "path": name, "operation": "copy",
                "preDigest": digest_path(preimage), "postDigest": digest_path(destination),
                "expectedPostDigest": digest_path(destination), "backupPath": f"preimage/{name}",
                "createdParents": [], "state": "applied",
            })
        receipt = {
            "schemaVersion": 1, "status": "applied", "planDigest": "sha256:" + "0" * 64,
            "targetState": "fresh", "templateRoot": str(ROOT), "targetRoot": str(target.resolve()),
            "backupRoot": str(backup.resolve()), "receiptPath": str(receipt_path.resolve()),
            "journal": journal, "preservedDigests": {}, "verificationCommands": [["python", "--version"]],
            "verification": None, "receiptDigest": "",
        }
        _write_receipt(receipt_path, receipt)
        with patch("harness_migration.safety.is_link_like", side_effect=lambda path: path == target):
            with self.assertRaisesRegex(MigrationError, "canonical directory"):
                rollback_receipt(receipt_path)
        original_copy = transaction_module._copy_bytes_atomic
        calls = 0

        def fail_after_restore(destination, data):
            nonlocal calls
            original_copy(destination, data)
            calls += 1
            if calls == 1:
                raise OSError("injected rollback failure")

        with patch("harness_migration.transaction._copy_bytes_atomic", side_effect=fail_after_restore):
            with self.assertRaises(MigrationError):
                rollback_receipt(receipt_path)
        self.assertEqual("rollback_failed", load_receipt(receipt_path)["status"])
        rollback_receipt(receipt_path)
        self.assertEqual("pre-a.txt\n", (target / "a.txt").read_text(encoding="utf-8"))
        self.assertEqual("pre-b.txt\n", (target / "b.txt").read_text(encoding="utf-8"))

    def test_receipt_cannot_overlap_backup_preimages(self) -> None:
        target = self.fresh_target()
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        backup = self.base / "explicit-backup"
        with self.assertRaisesRegex(MigrationError, "pre-images") as raised:
            apply_plan(plan, str(backup), str(backup / "preimage" / "receipt.json"))
        self.assertEqual(ExitCode.BLOCKED, raised.exception.exit_code)
        self.assertFalse(backup.exists())

    def test_receipt_tampering_is_rejected(self) -> None:
        target = self.fresh_target()
        plan = resolve_all(build_plan(str(ROOT), str(target), "alice"))
        _, receipt_path = apply_plan(plan)
        value = json.loads(receipt_path.read_text(encoding="utf-8"))
        value["targetRoot"] = str(self.base / "elsewhere")
        atomic_write_json(receipt_path, value)
        with self.assertRaises(MigrationError):
            load_receipt(receipt_path)


if __name__ == "__main__":
    unittest.main()
