import json
import tempfile
import unittest
from pathlib import Path

from kimport.corpus import ID_ALIASES, apply_id_aliases


class IdAliasTest(unittest.TestCase):
    def test_new_id_takes_captured_role_and_survives_reruns(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / ID_ALIASES
            path.write_text(json.dumps({"X_M2_Q15": "X_MUNSPECIFIED_Q15", "Y_M1_Q01": "missing", "Z_M1_Q02": "Z_OLD"}))
            roles = {"X_MUNSPECIFIED_Q15": "canonical", "Z_OLD": "member", "Z_M1_Q02": "canonical"}
            used = apply_id_aliases(roles, path)
            self.assertEqual(roles["X_M2_Q15"], "canonical")
            self.assertNotIn("Y_M1_Q01", roles)          # unknown captured id: nothing invented
            self.assertEqual(roles["Z_M1_Q02"], "canonical")  # an id the corpus already knows is not overwritten
            self.assertEqual(used, {"X_M2_Q15": "X_MUNSPECIFIED_Q15"})

    def test_no_file_no_change(self):
        roles = {"a": "canonical"}
        self.assertEqual(apply_id_aliases(roles, Path("/nonexistent/id-aliases.json")), {})
        self.assertEqual(roles, {"a": "canonical"})


if __name__ == "__main__":
    unittest.main()
