import random
import time

# Base NGN rates (approximate as of mid-2024)
_BASE = {
    "BTC":  {"name": "Bitcoin",   "base_ngn": 95_000_000, "icon": "₿"},
    "ETH":  {"name": "Ethereum",  "base_ngn":  5_800_000, "icon": "Ξ"},
    "USDT": {"name": "Tether",    "base_ngn":      1_600, "icon": "T"},
    "BNB":  {"name": "BNB",       "base_ngn":    720_000, "icon": "B"},
    "SOL":  {"name": "Solana",    "base_ngn":    220_000, "icon": "◎"},
    "DOGE": {"name": "Dogecoin",  "base_ngn":        240, "icon": "Ð"},
    "XRP":  {"name": "XRP",       "base_ngn":        920, "icon": "✕"},
}

BUY_SPREAD = 0.015   # 1.5% markup on buy
SELL_SPREAD = 0.015  # 1.5% markdown on sell

_mid: dict = {}
_last_update: float = 0.0
_CACHE_TTL = 20  # seconds


def _refresh():
    global _mid, _last_update
    now = time.time()
    if now - _last_update < _CACHE_TTL:
        return
    _last_update = now
    for sym, info in _BASE.items():
        prev = _mid.get(sym, float(info["base_ngn"]))
        drift = random.uniform(-0.008, 0.008)
        _mid[sym] = round(prev * (1 + drift), 2)


def get_rates() -> dict:
    _refresh()
    result = {}
    for sym, info in _BASE.items():
        mid = _mid.get(sym, float(info["base_ngn"]))
        result[sym] = {
            "symbol": sym,
            "name": info["name"],
            "icon": info["icon"],
            "mid_ngn": round(mid, 2),
            "buy_ngn": round(mid * (1 + BUY_SPREAD), 2),
            "sell_ngn": round(mid * (1 - SELL_SPREAD), 2),
            "change_24h_pct": round(random.uniform(-4.5, 4.5), 2),
        }
    return result


def get_buy_rate(symbol: str) -> float:
    _refresh()
    mid = _mid.get(symbol, float(_BASE.get(symbol, {}).get("base_ngn", 0)))
    return mid * (1 + BUY_SPREAD)


def get_sell_rate(symbol: str) -> float:
    _refresh()
    mid = _mid.get(symbol, float(_BASE.get(symbol, {}).get("base_ngn", 0)))
    return mid * (1 - SELL_SPREAD)


SUPPORTED_SYMBOLS = list(_BASE.keys())
