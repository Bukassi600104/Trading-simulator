"""
Jesse Custom - Multi-user Trading Engine Fork

This is a customized fork of the Jesse Trading Engine, modified for
multi-user web environments. The standard Jesse library is single-user CLI;
this fork accepts user_id parameters to manage multiple portfolios simultaneously.

Key differences from standard Jesse:
- Multi-user portfolio management
- In-memory state with async database sync
- WebSocket-friendly async design
- No CLI dependencies

Do NOT install the standard `jesse` pip package - use only this custom fork.
"""

__version__ = "0.1.0"
