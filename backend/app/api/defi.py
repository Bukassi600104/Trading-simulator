"""
DeFi Simulation API endpoints.

Provides AMM liquidity simulation, impermanent loss calculator,
and yield farming for the Terminal Zero DeFi module.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import TokenData, get_current_user, get_user_id_from_token
from app.services.defi_simulator import get_defi_simulator

router = APIRouter(prefix="/api/defi", tags=["defi"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class SwapQuoteRequest(BaseModel):
    pool_id: str
    token_in: str
    amount_in: float


class AddLiquidityRequest(BaseModel):
    pool_id: str
    amount_a: float
    amount_b: float


class ILCalculatorRequest(BaseModel):
    entry_price: float
    current_price: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/pools")
async def list_pools():
    """List all available DeFi pools with current APY and liquidity."""
    sim = get_defi_simulator()
    return {"pools": sim.get_pools()}


@router.post("/swap/quote")
async def get_swap_quote(body: SwapQuoteRequest):
    """
    Get a swap quote without executing.

    Returns amount_out, price_impact, and fee estimate.
    """
    sim = get_defi_simulator()
    try:
        quote = sim.simulate_swap(body.pool_id, body.amount_in, body.token_in)
        return quote
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/liquidity/add")
async def add_liquidity(
    body: AddLiquidityRequest,
    token_data: TokenData = Depends(get_current_user),
):
    """
    Add virtual liquidity to an AMM pool.

    Returns LP tokens received and the newly created position.
    Requires PRO or higher tier.
    """
    user_id = get_user_id_from_token(token_data)

    sim = get_defi_simulator()
    try:
        position = sim.add_liquidity(user_id, body.pool_id, body.amount_a, body.amount_b)
        return {"success": True, "position": position}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/liquidity/{position_id}")
async def remove_liquidity(
    position_id: str,
    token_data: TokenData = Depends(get_current_user),
):
    """
    Remove liquidity from a position.

    Calculates final impermanent loss and yield earned.
    """
    user_id = get_user_id_from_token(token_data)

    sim = get_defi_simulator()
    try:
        result = sim.remove_liquidity(user_id, position_id)
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/positions")
async def get_positions(token_data: TokenData = Depends(get_current_user)):
    """Get all active DeFi positions for the authenticated user."""
    user_id = get_user_id_from_token(token_data)
    sim = get_defi_simulator()
    positions = sim.get_user_positions(user_id)
    return {"positions": positions}


@router.post("/calculator/il")
async def calculate_il(body: ILCalculatorRequest):
    """
    Standalone impermanent loss calculator.

    No authentication required — used for educational display.
    """
    if body.entry_price <= 0:
        raise HTTPException(status_code=400, detail="entry_price must be positive")
    sim = get_defi_simulator()
    result = sim.calculate_il(body.entry_price, body.current_price)
    return result
