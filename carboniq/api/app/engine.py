"""নির্গমন হিসাব: কার্যক্রম × গুণক। AI নেই — একই input-এ সবসময় একই ফল।"""


class FactorNotFound(Exception):
    pass


def calculate(activity: str, quantity: float, unit: str, factors: dict) -> dict:
    if quantity < 0:
        raise ValueError("quantity ঋণাত্মক হতে পারে না")
    factor = factors.get((activity, unit))
    if factor is None:
        raise FactorNotFound(f"গুণক পাওয়া যায়নি: {activity} / {unit}")
    kg = quantity * factor["kg_co2e_per_unit"]
    return {
        "activity": activity,
        "quantity": quantity,
        "unit": unit,
        "scope": factor["scope"],
        "kg_co2e": round(kg, 3),
        "tonnes_co2e": round(kg / 1000, 4),
        "factor": factor["kg_co2e_per_unit"],
        "factor_source": factor["source"],
        "factor_version": factor["version"],
        "formula": f"{quantity} {unit} × {factor['kg_co2e_per_unit']} kgCO2e/{unit}",
    }
