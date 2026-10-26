"""SHA-256 hash chain: পরে কেউ record বদলালে ধরা পড়ে।"""
import hashlib
import json

GENESIS = "0" * 64


def make_hash(payload: dict, prev_hash: str) -> str:
    body = json.dumps(payload, sort_keys=True, ensure_ascii=False) + prev_hash
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def append(chain: list, payload: dict) -> dict:
    prev = chain[-1]["hash"] if chain else GENESIS
    entry = {"payload": payload, "prev_hash": prev, "hash": make_hash(payload, prev)}
    chain.append(entry)
    return entry


def verify(chain: list) -> bool:
    prev = GENESIS
    for e in chain:
        if e["prev_hash"] != prev or e["hash"] != make_hash(e["payload"], prev):
            return False
        prev = e["hash"]
    return True
