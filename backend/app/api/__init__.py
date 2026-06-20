"""API module exports.

Router submodules are imported defensively so that a module which needs heavy
optional deps (numpy/pandas or the jesse engine) does not break importing the
whole ``app.api`` package on a slim serverless host. Names that fail to import
are simply absent from the package namespace there; they remain available on
the persistent host that ships the full stack.
"""

import importlib as _importlib

_EXPORTS = {
    "admin_router": "admin",
    "auth_router": "auth",
    "challenges_router": "challenges",
    "competitions_router": "competitions",
    "gamification_router": "gamification",
    "journal_router": "journal",
    "leaderboard_router": "leaderboard",
    "payments_router": "payments",
    "portfolio_router": "portfolio",
    "trading_router": "trading",
}

__all__ = []

for _attr, _module in _EXPORTS.items():
    try:
        _mod = _importlib.import_module(f".{_module}", __name__)
        globals()[_attr] = _mod.router
        __all__.append(_attr)
    except Exception:  # pragma: no cover - missing heavy dep on slim host
        # Router unavailable on this host; skip it.
        pass
