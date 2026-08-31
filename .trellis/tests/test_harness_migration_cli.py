from __future__ import annotations

from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[2]
CLI = ROOT / ".trellis" / "scripts" / "harness_migrate.py"
sys.path.insert(0, str(ROOT / ".trellis" / "scripts"))

from harness_migration.cli import _parser  # noqa: E402


class HarnessMigrationCliTests(unittest.TestCase):
    def test_help_exposes_fixed_command_contract(self) -> None:
        result = subprocess.run(
            ["python", str(CLI), "--help"], cwd=ROOT, capture_output=True,
            text=True, encoding="utf-8", errors="replace", check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr)
        for command in (
            "plan", "resolve", "apply", "verify", "rollback",
            "recover-plan", "recover-resolve", "recover-apply",
        ):
            self.assertIn(command, result.stdout)

        plan_help = subprocess.run(
            ["python", str(CLI), "plan", "--help"], cwd=ROOT,
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", check=False,
        )
        self.assertEqual(0, plan_help.returncode, plan_help.stderr)
        self.assertIn("--profile", plan_help.stdout)
        self.assertIn("--adopt-partial", plan_help.stdout)

        default_plan = _parser().parse_args([
            "plan", "--template", "template", "--target", "target",
        ])
        dispatch_plan = _parser().parse_args([
            "plan", "--template", "template", "--target", "target",
            "--profile", "dispatch-only",
        ])
        self.assertEqual("complete", default_plan.profile)
        self.assertFalse(default_plan.profile_provided)
        self.assertEqual("dispatch-only", dispatch_plan.profile)
        self.assertTrue(dispatch_plan.profile_provided)
        adoption_plan = _parser().parse_args([
            "plan", "--template", "template", "--target", "target",
            "--profile", "complete", "--adopt-partial",
        ])
        self.assertTrue(adoption_plan.adopt_partial)
        self.assertTrue(adoption_plan.profile_provided)

        recovery = _parser().parse_args([
            "recover-plan", "--template", "template", "--target", "target",
            "--baseline", "baseline",
        ])
        self.assertEqual("recover-plan", recovery.command)
        self.assertEqual("baseline", recovery.baseline)


if __name__ == "__main__":
    unittest.main()
