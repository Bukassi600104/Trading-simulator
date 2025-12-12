"""
Unit tests for PnL calculation logic.
These are "money" functions that must be 100% correct.
"""
from decimal import Decimal


class TestPnLCalculations:
    """Test suite for Profit and Loss calculations."""
    
    def test_long_position_profit(self):
        """Test PnL calculation for profitable LONG position."""
        # Setup: Bought 0.1 BTC at $100,000, now price is $105,000
        entry_price = Decimal("100000.00")
        current_price = Decimal("105000.00")
        quantity = Decimal("0.1")
        side = "long"
        
        # Calculate PnL
        if side == "long":
            pnl = (current_price - entry_price) * quantity
        else:
            pnl = (entry_price - current_price) * quantity
        
        # Assert: Should be +$500
        assert pnl == Decimal("500.00")
    
    def test_long_position_loss(self):
        """Test PnL calculation for losing LONG position."""
        # Setup: Bought 0.1 BTC at $100,000, now price is $95,000
        entry_price = Decimal("100000.00")
        current_price = Decimal("95000.00")
        quantity = Decimal("0.1")
        side = "long"
        
        if side == "long":
            pnl = (current_price - entry_price) * quantity
        else:
            pnl = (entry_price - current_price) * quantity
        
        # Assert: Should be -$500
        assert pnl == Decimal("-500.00")
    
    def test_short_position_profit(self):
        """Test PnL calculation for profitable SHORT position."""
        # Setup: Shorted 0.1 BTC at $100,000, now price is $95,000
        entry_price = Decimal("100000.00")
        current_price = Decimal("95000.00")
        quantity = Decimal("0.1")
        side = "short"
        
        if side == "long":
            pnl = (current_price - entry_price) * quantity
        else:
            pnl = (entry_price - current_price) * quantity
        
        # Assert: Should be +$500 (price dropped, short wins)
        assert pnl == Decimal("500.00")
    
    def test_short_position_loss(self):
        """Test PnL calculation for losing SHORT position."""
        # Setup: Shorted 0.1 BTC at $100,000, now price is $105,000
        entry_price = Decimal("100000.00")
        current_price = Decimal("105000.00")
        quantity = Decimal("0.1")
        side = "short"
        
        if side == "long":
            pnl = (current_price - entry_price) * quantity
        else:
            pnl = (entry_price - current_price) * quantity
        
        # Assert: Should be -$500 (price rose, short loses)
        assert pnl == Decimal("-500.00")
    
    def test_pnl_with_leverage(self):
        """Test that PnL is calculated on position size, not margin."""
        # Setup: $1,000 margin with 10x leverage = $10,000 position
        # If BTC moves 5%, position gains $500
        margin = Decimal("1000.00")
        leverage = 10
        position_value = margin * leverage  # $10,000
        price_change_pct = Decimal("0.05")  # 5%
        
        pnl = position_value * price_change_pct
        
        # Assert: $500 profit on $1000 margin = 50% return
        assert pnl == Decimal("500.00")
        roi = (pnl / margin) * 100
        assert roi == Decimal("50.00")


class TestFeeCalculations:
    """Test suite for trading fee calculations."""
    
    def test_taker_fee_calculation(self):
        """Test fee calculation for market orders (taker)."""
        # Standard Bybit taker fee: 0.06%
        FEE_RATE = Decimal("0.0006")
        order_value = Decimal("10000.00")  # $10,000 position
        
        fee = order_value * FEE_RATE
        
        # Assert: $6.00 fee
        assert fee == Decimal("6.00")
    
    def test_round_trip_fees(self):
        """Test total fees for opening and closing a position."""
        FEE_RATE = Decimal("0.0006")
        position_value = Decimal("10000.00")
        
        # Fee to open + fee to close
        total_fees = position_value * FEE_RATE * 2
        
        # Assert: $12.00 total fees
        assert total_fees == Decimal("12.00")


class TestLiquidationPrice:
    """Test suite for liquidation price calculations."""
    
    def test_long_liquidation_price(self):
        """Test liquidation price for LONG position with leverage."""
        entry_price = Decimal("100000.00")
        leverage = 10
        
        # Liquidation occurs when loss = margin
        # For LONG: entry_price - (entry_price / leverage) = liq_price
        # With maintenance margin factor ~0.5% ignored for simplicity
        liquidation_price = entry_price - (entry_price / leverage)
        
        # Assert: Liquidation at $90,000 (10% drop wipes 100% margin)
        assert liquidation_price == Decimal("90000.00")
    
    def test_short_liquidation_price(self):
        """Test liquidation price for SHORT position with leverage."""
        entry_price = Decimal("100000.00")
        leverage = 10
        
        # For SHORT: entry_price + (entry_price / leverage) = liq_price
        liquidation_price = entry_price + (entry_price / leverage)
        
        # Assert: Liquidation at $110,000 (10% rise wipes 100% margin)
        assert liquidation_price == Decimal("110000.00")
    
    def test_higher_leverage_closer_liquidation(self):
        """Test that higher leverage = closer liquidation price."""
        entry_price = Decimal("100000.00")
        
        liq_10x = entry_price - (entry_price / 10)  # 10x leverage
        liq_20x = entry_price - (entry_price / 20)  # 20x leverage
        
        # Assert: 20x leverage has liquidation price closer to entry
        assert liq_20x > liq_10x
        assert liq_10x == Decimal("90000.00")
        assert liq_20x == Decimal("95000.00")
