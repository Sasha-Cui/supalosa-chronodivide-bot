#!/usr/bin/env python3
"""No-engine tests for independent map-fidelity execution verification."""

from __future__ import annotations

import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts/verify_map_fidelity_execution.py"
)
SPEC = importlib.util.spec_from_file_location(
    "verify_map_fidelity_execution", MODULE_PATH
)
assert SPEC is not None and SPEC.loader is not None
VERIFIER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VERIFIER)


JOB_ID = "12345"
SCHEDULER = {
    "jobId": JOB_ID,
    "account": "pi_jss233",
    "partition": "devel",
    "qos": "normal",
    "source": "scontrol",
}
ROOT_ROW = (
    "12345|chrono-map-fidelity|pi_jss233|devel|normal|COMPLETED|0:0|42|"
    "30|1|4G||a1000u01n01"
)
BATCH_ROW = (
    "12345.batch|batch|pi_jss233|||COMPLETED|0:0|42||1||1200K|"
    "a1000u01n01"
)


class AccountingTests(unittest.TestCase):
    def test_completed_accounting_matches_manifest_scheduler(self) -> None:
        rows = VERIFIER.parse_sacct_output(
            ROOT_ROW + "\n" + BATCH_ROW + "\n", JOB_ID
        )
        result = VERIFIER.validate_accounting(rows, SCHEDULER)
        self.assertTrue(result["successful"])
        self.assertEqual(result["root"]["ElapsedRaw"], "42")
        self.assertEqual(len(result["steps"]), 1)

    def test_failed_step_is_rejected(self) -> None:
        rows = VERIFIER.parse_sacct_output(
            ROOT_ROW + "\n" + BATCH_ROW.replace("COMPLETED|0:0", "FAILED|1:0") + "\n",
            JOB_ID,
        )
        with self.assertRaisesRegex(VERIFIER.VerificationError, "did not complete"):
            VERIFIER.validate_accounting(rows, SCHEDULER)


class RunRootTests(unittest.TestCase):
    def test_profiles_resolve_only_their_fixed_private_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            original = root / "original"
            temperate = root / "temperate"
            fresh = root / "fresh"
            original_run = original / "full" / JOB_ID
            temperate_run = temperate / "full" / JOB_ID
            fresh_run = fresh / "full" / JOB_ID
            original_run.mkdir(parents=True, mode=0o700)
            temperate_run.mkdir(parents=True, mode=0o700)
            fresh_run.mkdir(parents=True, mode=0o700)
            previous = VERIFIER.DURABLE_GATE_ROOTS
            VERIFIER.DURABLE_GATE_ROOTS = {
                "original": original,
                "temperate": temperate,
                "fresh": fresh,
            }
            try:
                self.assertEqual(
                    VERIFIER.validate_run_root(
                        temperate_run, "temperate", "full", JOB_ID
                    ),
                    temperate_run,
                )
                with self.assertRaisesRegex(
                    VERIFIER.VerificationError, "canonical path"
                ):
                    VERIFIER.validate_run_root(
                        original_run, "temperate", "full", JOB_ID
                    )
                with self.assertRaisesRegex(
                    VERIFIER.VerificationError, "requires full scope"
                ):
                    VERIFIER.validate_run_root(
                        temperate_run, "temperate", "preflight", JOB_ID
                    )
                self.assertEqual(
                    VERIFIER.validate_run_root(
                        fresh_run, "fresh", "full", JOB_ID
                    ),
                    fresh_run,
                )
                with self.assertRaisesRegex(
                    VERIFIER.VerificationError, "requires full scope"
                ):
                    VERIFIER.validate_run_root(
                        fresh_run, "fresh", "preflight", JOB_ID
                    )
            finally:
                VERIFIER.DURABLE_GATE_ROOTS = previous


class AdditionalAccountingTests(unittest.TestCase):
    def test_unrelated_or_missing_batch_rows_are_rejected(self) -> None:
        with self.assertRaisesRegex(VERIFIER.VerificationError, "unrelated row"):
            VERIFIER.parse_sacct_output(
                ROOT_ROW + "\n99999.batch|batch||||COMPLETED|0:0||||||\n",
                JOB_ID,
            )
        with self.assertRaisesRegex(VERIFIER.VerificationError, "missing the batch"):
            VERIFIER.parse_sacct_output(ROOT_ROW + "\n", JOB_ID)

    def test_scheduler_resource_drift_is_rejected(self) -> None:
        rows = VERIFIER.parse_sacct_output(
            ROOT_ROW.replace("|4G|", "|8G|") + "\n" + BATCH_ROW + "\n",
            JOB_ID,
        )
        with self.assertRaisesRegex(VERIFIER.VerificationError, "execution contract"):
            VERIFIER.validate_accounting(rows, SCHEDULER)


class InventoryTests(unittest.TestCase):
    def test_live_nonsource_runtime_is_exactly_revalidated(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            runtime = root / "runtime.bin"
            runtime.write_bytes(b"runtime")
            descriptor = VERIFIER.GATE.exact_file(runtime)
            tree = VERIFIER.GATE.tree_descriptor(root)
            inputs = {
                key: descriptor for key in VERIFIER.LIVE_RUNTIME_FILE_INPUT_KEYS
            }
            inputs.update({
                "compiledRuntime": [descriptor],
                "preflightPlan": None,
                "repoRoot": str(root),
                **{
                    key: tree for key in VERIFIER.LIVE_RUNTIME_TREE_INPUT_KEYS
                },
            })
            result = VERIFIER.validate_live_nonsource_runtime({
                "inputs": inputs,
                "families": [],
            })
            self.assertEqual(result["representativeMapCount"], 0)
            runtime.write_bytes(b"drift")
            with self.assertRaisesRegex(VERIFIER.VerificationError, "live runtime file drift"):
                VERIFIER.validate_live_nonsource_runtime({
                    "inputs": inputs,
                    "families": [],
                })

    def test_private_tree_inventory_is_sorted_and_hash_bound(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            os.chmod(root, 0o700)
            nested = root / "nested"
            nested.mkdir(mode=0o700)
            first = nested / "b.json"
            second = root / "a.log"
            first.write_bytes(b"{}\n")
            second.write_bytes(b"ok\n")
            os.chmod(first, 0o600)
            os.chmod(second, 0o600)
            records = VERIFIER.inventory_private_tree(root)
        self.assertEqual([record["path"] for record in records], ["a.log", "nested/b.json"])
        self.assertEqual([record["bytes"] for record in records], [3, 3])

    def test_symlink_and_permissive_file_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            os.chmod(root, 0o700)
            target = root / "target"
            target.write_bytes(b"x")
            os.chmod(target, 0o600)
            link = root / "link"
            link.symlink_to(target)
            with self.assertRaisesRegex(VERIFIER.VerificationError, "unexpected evidence file"):
                VERIFIER.inventory_private_tree(root)
            link.unlink()
            os.chmod(target, 0o644)
            with self.assertRaisesRegex(VERIFIER.VerificationError, "not private"):
                VERIFIER.inventory_private_tree(root)


if __name__ == "__main__":
    unittest.main()
