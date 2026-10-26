from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from . import ledger
from .engine import FactorNotFound, calculate
from .factors import load_factors

app = FastAPI(title="CarbonIQ BD API", version="0.1.0")
FACTORS = load_factors()
CHAIN: list = []  # আপাতত memory-তে; পরে Supabase ledger_entries


class CalcIn(BaseModel):
    activity: str = Field(examples=["electricity"])
    quantity: float = Field(ge=0, examples=[120000])
    unit: str = Field(examples=["kWh"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/factors")
def factors():
    return list(FACTORS.values())


@app.post("/api/v1/calculate")
def calc(body: CalcIn):
    try:
        result = calculate(body.activity, body.quantity, body.unit, FACTORS)
    except FactorNotFound as e:
        raise HTTPException(404, str(e))
    entry = ledger.append(CHAIN, result)
    return {**result, "ledger_hash": entry["hash"]}


@app.get("/api/v1/ledger/verify")
def verify():
    return {"entries": len(CHAIN), "valid": ledger.verify(CHAIN)}
