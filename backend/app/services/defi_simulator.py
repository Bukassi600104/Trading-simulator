"""
DeFi Simulator Service

Implements constant-product AMM (x*y=k) mechanics, impermanent loss calculation,
yield farming APY, and virtual liquidity positions for educational simulation.
"""
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional


@dataclass
class LiquidityPool:
    """Virtual AMM liquidity pool using constant product formula x*y=k."""
    pool_id: str
    token_a: str
    token_b: str
    reserve_a: Decimal
    reserve_b: Decimal
    apy_base: Decimal       # Base yield APY (0-100)
    fee_rate: Decimal = Decimal("0.003")  # 0.3% Uniswap V2 standard

    @property
    def k(self) -> Decimal:
        return self.reserve_a * self.reserve_b

    @property
    def price_a_in_b(self) -> Decimal:
        """Price of token A denominated in token B."""
        return self.reserve_b / self.reserve_a

    @property
    def price_b_in_a(self) -> Decimal:
        return self.reserve_a / self.reserve_b

    @property
    def total_liquidity(self) -> Decimal:
        """LP token total supply proxy (geometric mean)."""
        return Decimal(str(math.sqrt(float(self.reserve_a * self.reserve_b))))

    def simulate_swap(
        self, amount_in: Decimal, token_in: str
    ) -> tuple[Decimal, Decimal]:
        """
        Simulate a swap using x*y=k.

        Returns (amount_out, price_impact_pct).
        """
        fee = amount_in * self.fee_rate
        amount_in_after_fee = amount_in - fee

        if token_in == self.token_a:
            new_reserve_a = self.reserve_a + amount_in_after_fee
            new_reserve_b = self.k / new_reserve_a
            amount_out = self.reserve_b - new_reserve_b
        else:
            new_reserve_b = self.reserve_b + amount_in_after_fee
            new_reserve_a = self.k / new_reserve_b
            amount_out = self.reserve_a - new_reserve_a

        # Price impact
        spot_price = float(amount_in / amount_out) if amount_out > 0 else 0
        initial_price = (
            float(self.reserve_a / self.reserve_b)
            if token_in == self.token_b
            else float(self.reserve_b / self.reserve_a)
        )
        price_impact = abs(spot_price - initial_price) / initial_price * 100 if initial_price else 0

        return max(amount_out, Decimal("0")), Decimal(str(round(price_impact, 4)))


@dataclass
class LiquidityPosition:
    """A user's position in an AMM pool."""
    position_id: str
    user_id: uuid.UUID
    pool_id: str
    token_a: str
    token_b: str
    amount_a_deposited: Decimal
    amount_b_deposited: Decimal
    lp_tokens: Decimal
    entry_price: Decimal          # Price of A in B at entry
    deposited_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def calculate_impermanent_loss(self, current_price: Decimal) -> Decimal:
        """
        IL = 2*sqrt(r)/(1+r) - 1
        where r = current_price / entry_price
        """
        if self.entry_price <= 0:
            return Decimal("0")
        r = float(current_price / self.entry_price)
        il = 2 * math.sqrt(r) / (1 + r) - 1
        return Decimal(str(round(il * 100, 4)))  # as percentage

    def calculate_yield_earned(self, pool_apy: Decimal) -> Decimal:
        """Estimate yield earned since deposit (simple annual rate)."""
        now = datetime.now(timezone.utc)
        days_held = (now - self.deposited_at).total_seconds() / 86400
        total_value_usd = self.amount_a_deposited * Decimal("50000") + self.amount_b_deposited
        daily_rate = pool_apy / Decimal("365") / Decimal("100")
        return total_value_usd * daily_rate * Decimal(str(days_held))

    def to_dict(self) -> dict:
        return {
            "position_id": self.position_id,
            "pool_id": self.pool_id,
            "token_a": self.token_a,
            "token_b": self.token_b,
            "amount_a_deposited": float(self.amount_a_deposited),
            "amount_b_deposited": float(self.amount_b_deposited),
            "lp_tokens": float(self.lp_tokens),
            "entry_price": float(self.entry_price),
            "deposited_at": self.deposited_at.isoformat(),
        }


class DeFiSimulator:
    """
    In-memory DeFi simulator managing virtual pools and user positions.
    Pools reset on server restart (educational/demo only).
    """

    def __init__(self):
        self._pools: Dict[str, LiquidityPool] = {}
        self._positions: Dict[str, LiquidityPosition] = {}
        self._user_positions: Dict[str, List[str]] = {}  # user_id -> position_ids
        self._initialize_default_pools()

    def _initialize_default_pools(self):
        """Seed simulation with realistic default pools."""
        defaults = [
            LiquidityPool(
                pool_id="btc-usdt",
                token_a="BTC",
                token_b="USDT",
                reserve_a=Decimal("1000"),
                reserve_b=Decimal("50_000_000"),
                apy_base=Decimal("8.5"),
            ),
            LiquidityPool(
                pool_id="eth-usdt",
                token_a="ETH",
                token_b="USDT",
                reserve_a=Decimal("20000"),
                reserve_b=Decimal("60_000_000"),
                apy_base=Decimal("12.0"),
            ),
            LiquidityPool(
                pool_id="sol-usdt",
                token_a="SOL",
                token_b="USDT",
                reserve_a=Decimal("500000"),
                reserve_b=Decimal("75_000_000"),
                apy_base=Decimal("18.5"),
            ),
            LiquidityPool(
                pool_id="bnb-usdt",
                token_a="BNB",
                token_b="USDT",
                reserve_a=Decimal("100000"),
                reserve_b=Decimal("60_000_000"),
                apy_base=Decimal("9.0"),
            ),
        ]
        for pool in defaults:
            self._pools[pool.pool_id] = pool

    def get_pools(self) -> List[dict]:
        """Return all pools with current stats."""
        result = []
        for pool in self._pools.values():
            result.append({
                "pool_id": pool.pool_id,
                "token_a": pool.token_a,
                "token_b": pool.token_b,
                "reserve_a": float(pool.reserve_a),
                "reserve_b": float(pool.reserve_b),
                "price_a_in_b": float(pool.price_a_in_b),
                "total_liquidity": float(pool.total_liquidity),
                "apy": float(pool.apy_base),
                "fee_rate": float(pool.fee_rate),
            })
        return result

    def simulate_swap(
        self,
        pool_id: str,
        amount_in: float,
        token_in: str,
    ) -> dict:
        """Simulate a swap without executing it (quote only)."""
        pool = self._pools.get(pool_id)
        if not pool:
            raise ValueError(f"Pool {pool_id} not found")
        amount_out, price_impact = pool.simulate_swap(Decimal(str(amount_in)), token_in)
        token_out = pool.token_b if token_in == pool.token_a else pool.token_a
        return {
            "pool_id": pool_id,
            "token_in": token_in,
            "token_out": token_out,
            "amount_in": amount_in,
            "amount_out": float(amount_out),
            "price_impact_pct": float(price_impact),
            "fee_paid": float(Decimal(str(amount_in)) * pool.fee_rate),
        }

    def add_liquidity(
        self,
        user_id: uuid.UUID,
        pool_id: str,
        amount_a: float,
        amount_b: float,
    ) -> dict:
        """Add virtual liquidity to a pool and create a position."""
        pool = self._pools.get(pool_id)
        if not pool:
            raise ValueError(f"Pool {pool_id} not found")

        dec_a = Decimal(str(amount_a))
        dec_b = Decimal(str(amount_b))

        # Calculate LP tokens proportionally
        lp_tokens = (dec_a / pool.reserve_a) * pool.total_liquidity

        position = LiquidityPosition(
            position_id=str(uuid.uuid4()),
            user_id=user_id,
            pool_id=pool_id,
            token_a=pool.token_a,
            token_b=pool.token_b,
            amount_a_deposited=dec_a,
            amount_b_deposited=dec_b,
            lp_tokens=lp_tokens,
            entry_price=pool.price_a_in_b,
        )

        # Update pool reserves (virtual)
        pool.reserve_a += dec_a
        pool.reserve_b += dec_b

        self._positions[position.position_id] = position
        uid_str = str(user_id)
        self._user_positions.setdefault(uid_str, []).append(position.position_id)

        return {
            **position.to_dict(),
            "lp_tokens_received": float(lp_tokens),
            "current_apy": float(pool.apy_base),
        }

    def remove_liquidity(self, user_id: uuid.UUID, position_id: str) -> dict:
        """Remove liquidity and calculate final IL + yield."""
        position = self._positions.get(position_id)
        if not position:
            raise ValueError("Position not found")
        if position.user_id != user_id:
            raise PermissionError("Not your position")

        pool = self._pools.get(position.pool_id)
        current_price = pool.price_a_in_b if pool else position.entry_price

        il_pct = position.calculate_impermanent_loss(current_price)
        yield_earned = position.calculate_yield_earned(pool.apy_base if pool else Decimal("10"))

        # Return amounts with IL applied
        il_factor = Decimal("1") + (il_pct / Decimal("100"))
        returned_a = position.amount_a_deposited * il_factor
        returned_b = position.amount_b_deposited

        # Remove from pool (virtual)
        if pool:
            pool.reserve_a = max(pool.reserve_a - returned_a, Decimal("1"))
            pool.reserve_b = max(pool.reserve_b - returned_b, Decimal("1"))

        # Clean up position
        del self._positions[position_id]
        uid_str = str(user_id)
        if uid_str in self._user_positions:
            self._user_positions[uid_str] = [
                p for p in self._user_positions[uid_str] if p != position_id
            ]

        return {
            "position_id": position_id,
            "returned_a": float(returned_a),
            "returned_b": float(returned_b),
            "impermanent_loss_pct": float(il_pct),
            "yield_earned_usd": float(yield_earned),
            "net_pnl_usd": float(yield_earned) - abs(float(il_pct)) * float(position.amount_b_deposited) / 100,
        }

    def get_user_positions(self, user_id: uuid.UUID) -> List[dict]:
        """Get all positions for a user with current IL stats."""
        uid_str = str(user_id)
        position_ids = self._user_positions.get(uid_str, [])
        result = []
        for pid in position_ids:
            pos = self._positions.get(pid)
            if not pos:
                continue
            pool = self._pools.get(pos.pool_id)
            current_price = pool.price_a_in_b if pool else pos.entry_price
            il = pos.calculate_impermanent_loss(current_price)
            yield_est = pos.calculate_yield_earned(pool.apy_base if pool else Decimal("10"))
            result.append({
                **pos.to_dict(),
                "current_price": float(current_price),
                "impermanent_loss_pct": float(il),
                "yield_earned_usd": float(yield_est),
                "apy": float(pool.apy_base) if pool else 10.0,
            })
        return result

    def calculate_il(self, entry_price: float, current_price: float) -> dict:
        """Standalone IL calculator (no position required)."""
        r = current_price / entry_price if entry_price else 1
        il = 2 * math.sqrt(r) / (1 + r) - 1
        return {
            "entry_price": entry_price,
            "current_price": current_price,
            "price_ratio": r,
            "impermanent_loss_pct": round(il * 100, 4),
            "hodl_value": 1.0,
            "pool_value": round(1 + il, 6),
        }


# Singleton
_defi_simulator: Optional[DeFiSimulator] = None


def get_defi_simulator() -> DeFiSimulator:
    global _defi_simulator
    if _defi_simulator is None:
        _defi_simulator = DeFiSimulator()
    return _defi_simulator
