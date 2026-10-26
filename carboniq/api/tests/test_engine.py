import pytest

from app import ledger
from app.engine import FactorNotFound, calculate
from app.factors import load_factors

F = load_factors()


def test_electricity():
    r = calculate("electricity", 1000, "kWh", F)
    assert r["kg_co2e"] == 670.0 and r["scope"] == 2


def test_same_input_same_output():
    assert calculate("diesel", 50, "litre", F) == calculate("diesel", 50, "litre", F)


def test_unknown_factor():
    with pytest.raises(FactorNotFound):
        calculate("coal", 1, "kg", F)


def test_negative():
    with pytest.raises(ValueError):
        calculate("electricity", -5, "kWh", F)


def test_ledger_detects_tampering():
    chain = []
    ledger.append(chain, {"kg": 1})
    ledger.append(chain, {"kg": 2})
    assert ledger.verify(chain)
    chain[0]["payload"]["kg"] = 999
    assert not ledger.verify(chain)
