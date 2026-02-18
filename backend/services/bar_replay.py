"""
Bar Replay Engine

Replays historical candlestick data at configurable speeds for practice trading.

Features:
- Load historical data from Bybit API (or Redis cache)
- Replay at 1x, 2x, 5x, 10x speed
- Pause/resume/step controls
- Users can place orders during replay
- Feeds price updates into the portfolio manager and paper exchange
"""

import asyncio
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional

from loguru import logger


class ReplayState(str, Enum):
    IDLE = "IDLE"
    PLAYING = "PLAYING"
    PAUSED = "PAUSED"
    FINISHED = "FINISHED"


class ReplaySpeed(float, Enum):
    X1 = 1.0
    X2 = 2.0
    X5 = 5.0
    X10 = 10.0


class BarReplaySession:
    """
    A single replay session for one user.

    Loads historical candles and feeds them one-by-one at the configured
    speed into the trading engine, allowing the user to place orders
    against historical data.
    """

    # Base interval between candles in seconds (for 1-minute candles at 1x)
    BASE_INTERVAL = 1.0  # 1 second per candle at 1x speed

    def __init__(
        self,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        symbol: str,
        candles: List[dict],
        speed: float = 1.0,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.symbol = symbol
        self.candles = candles
        self.speed = speed
        self.state = ReplayState.IDLE
        self.current_index = 0
        self._task: Optional[asyncio.Task] = None
        self._pause_event = asyncio.Event()
        self._pause_event.set()  # Start unpaused
        self._step_event = asyncio.Event()
        # Subscribers who receive replayed candles
        self._subscribers: List[asyncio.Queue] = []
        self.created_at = datetime.utcnow()

    @property
    def progress(self) -> float:
        """Replay progress as percentage."""
        if not self.candles:
            return 0.0
        return (self.current_index / len(self.candles)) * 100

    @property
    def current_candle(self) -> Optional[dict]:
        """Get current candle being replayed."""
        if 0 <= self.current_index < len(self.candles):
            return self.candles[self.current_index]
        return None

    @property
    def total_candles(self) -> int:
        return len(self.candles)

    def subscribe(self, queue: asyncio.Queue) -> None:
        """Subscribe to receive replayed candles."""
        self._subscribers.append(queue)

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        """Unsubscribe from replayed candles."""
        if queue in self._subscribers:
            self._subscribers.remove(queue)

    async def start(self) -> None:
        """Start or resume replay."""
        if self.state == ReplayState.PLAYING:
            return

        self.state = ReplayState.PLAYING
        self._pause_event.set()

        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._replay_loop())

    async def pause(self) -> None:
        """Pause replay."""
        if self.state != ReplayState.PLAYING:
            return
        self.state = ReplayState.PAUSED
        self._pause_event.clear()

    async def resume(self) -> None:
        """Resume paused replay."""
        if self.state != ReplayState.PAUSED:
            return
        self.state = ReplayState.PLAYING
        self._pause_event.set()

    async def step(self) -> Optional[dict]:
        """
        Advance by exactly one candle (when paused).
        Returns the candle that was played, or None if at end.
        """
        if self.state != ReplayState.PAUSED:
            return None

        if self.current_index >= len(self.candles):
            self.state = ReplayState.FINISHED
            return None

        candle = self.candles[self.current_index]
        await self._emit_candle(candle)
        self.current_index += 1

        if self.current_index >= len(self.candles):
            self.state = ReplayState.FINISHED

        return candle

    async def stop(self) -> None:
        """Stop and cleanup replay."""
        self.state = ReplayState.FINISHED
        self._pause_event.set()  # Unblock if paused
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    def set_speed(self, speed: float) -> None:
        """Change replay speed."""
        if speed <= 0:
            speed = 1.0
        self.speed = speed

    async def _replay_loop(self) -> None:
        """Main replay loop that feeds candles at configured speed."""
        from jesse_custom.engine import get_portfolio_manager
        from jesse_custom.exchange import get_paper_exchange

        portfolio_manager = get_portfolio_manager()
        paper_exchange = get_paper_exchange()

        # Convert Bybit symbol format to internal
        internal_symbol = self.symbol
        if not "-" in self.symbol and self.symbol.endswith("USDT"):
            base = self.symbol[:-4]
            internal_symbol = f"{base}-USDT"

        try:
            while self.current_index < len(self.candles):
                if self.state == ReplayState.FINISHED:
                    break

                # Wait if paused
                await self._pause_event.wait()

                if self.state == ReplayState.FINISHED:
                    break

                candle = self.candles[self.current_index]

                # Feed the close price into the trading engine
                close_price = Decimal(str(candle["close"]))
                await paper_exchange.on_price_update(
                    internal_symbol, close_price
                )
                await portfolio_manager.on_price_update(
                    internal_symbol, close_price
                )

                # Emit candle to subscribers
                await self._emit_candle(candle)

                self.current_index += 1

                # Wait based on speed
                delay = self.BASE_INTERVAL / self.speed
                await asyncio.sleep(delay)

            self.state = ReplayState.FINISHED
            logger.info(
                f"Replay session {self.session_id} finished "
                f"({self.current_index}/{len(self.candles)} candles)"
            )

        except asyncio.CancelledError:
            logger.info(f"Replay session {self.session_id} cancelled")
        except Exception as e:
            logger.error(f"Replay session error: {e}")
            self.state = ReplayState.FINISHED

    async def _emit_candle(self, candle: dict) -> None:
        """Send candle to all subscribers."""
        replay_data = {
            **candle,
            "replay": True,
            "session_id": str(self.session_id),
            "index": self.current_index,
            "total": len(self.candles),
            "progress": self.progress,
            "speed": self.speed,
            "state": self.state.value,
        }

        dead = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(replay_data)
            except asyncio.QueueFull:
                pass
            except Exception:
                dead.append(queue)
        for q in dead:
            self._subscribers.remove(q)

    def to_dict(self) -> dict:
        """Session state for API responses."""
        return {
            "session_id": str(self.session_id),
            "user_id": str(self.user_id),
            "symbol": self.symbol,
            "state": self.state.value,
            "speed": self.speed,
            "current_index": self.current_index,
            "total_candles": self.total_candles,
            "progress": round(self.progress, 2),
            "current_candle": self.current_candle,
            "created_at": self.created_at.isoformat(),
        }


class BarReplayManager:
    """
    Manages bar replay sessions across all users.

    One user can have at most one active replay session.
    """

    def __init__(self):
        # user_id -> BarReplaySession
        self._sessions: Dict[uuid.UUID, BarReplaySession] = {}

    async def create_session(
        self,
        user_id: uuid.UUID,
        symbol: str,
        candles: List[dict],
        speed: float = 1.0,
    ) -> BarReplaySession:
        """Create a new replay session, stopping any existing one."""
        # Stop existing session
        if user_id in self._sessions:
            await self._sessions[user_id].stop()

        session_id = uuid.uuid4()
        session = BarReplaySession(
            session_id=session_id,
            user_id=user_id,
            symbol=symbol,
            candles=candles,
            speed=speed,
        )
        self._sessions[user_id] = session
        logger.info(
            f"Created replay session {session_id} for user {user_id} "
            f"({len(candles)} candles of {symbol})"
        )
        return session

    def get_session(
        self, user_id: uuid.UUID
    ) -> Optional[BarReplaySession]:
        """Get active session for a user."""
        return self._sessions.get(user_id)

    async def stop_session(self, user_id: uuid.UUID) -> bool:
        """Stop and remove a replay session."""
        session = self._sessions.pop(user_id, None)
        if session:
            await session.stop()
            return True
        return False

    def get_stats(self) -> dict:
        return {
            "active_sessions": len(self._sessions),
            "sessions": {
                str(uid): s.to_dict()
                for uid, s in self._sessions.items()
            },
        }


# Global singleton
_replay_manager: Optional[BarReplayManager] = None


def get_replay_manager() -> BarReplayManager:
    """Get or create the global replay manager instance."""
    global _replay_manager
    if _replay_manager is None:
        _replay_manager = BarReplayManager()
    return _replay_manager
