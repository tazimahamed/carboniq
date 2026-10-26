import csv
from pathlib import Path

FACTOR_FILE = Path(__file__).resolve().parents[2] / "data" / "factors_seed.csv"


def load_factors(path: Path = FACTOR_FILE) -> dict:
    """(activity, unit) -> factor row"""
    factors = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            row["kg_co2e_per_unit"] = float(row["kg_co2e_per_unit"])
            row["scope"] = int(row["scope"])
            factors[(row["activity"], row["unit"])] = row
    return factors
