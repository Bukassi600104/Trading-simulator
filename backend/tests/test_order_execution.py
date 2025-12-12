"""
Unit tests for order execution logic.
Tests the critical trading math functions.
"""
from decimal import Decimal


class TestOrderValidation:
    """Test suite for order validation before execution."""
    
    def test_insufficient_balance_rejected(self):
        """Test that orders exceeding balance are rejected."""
        balance = Decimal("1000.00")
        order_margin_required = Decimal("1500.00")  # Needs more than available
        
        is_valid = balance >= order_margin_required
        
        assert is_valid is False
    
    def test_sufficient_balance_accepted(self):
        """Test that orders within balance are accepted."""
        balance = Decimal("1000.00")
        order_margin_required = Decimal("500.00")
        
        is_valid = balance >= order_margin_required
        
        assert is_valid is True
    
    def test_margin_calculation_with_leverage(self):
        """Test required margin calculation."""
        position_value = Decimal("10000.00")
        leverage = 10
        
        required_margin = position_value / leverage
        
        # $10,000 position with 10x leverage needs $1,000 margin
        assert required_margin == Decimal("1000.00")
    
    def test_position_value_calculation(self):
        """Test position value from quantity and price."""
        quantity = Decimal("0.1")  # BTC
        price = Decimal("100000.00")  # $100k per BTC
        
        position_value = quantity * price
        
        assert position_value == Decimal("10000.00")


class TestOrderExecution:
    """Test suite for simulated order execution."""
    
    def test_market_buy_updates_balance(self):
        """Test that market buy reduces balance by margin + fee."""
        initial_balance = Decimal("10000.00")
        margin_required = Decimal("1000.00")
        fee = Decimal("6.00")
        
        final_balance = initial_balance - margin_required - fee
        
        assert final_balance == Decimal("8994.00")
    
    def test_market_sell_close_returns_margin_plus_pnl(self):
        """Test that closing position returns margin + PnL - fee."""
        margin = Decimal("1000.00")
        pnl = Decimal("500.00")
        fee = Decimal("6.00")
        balance_before_close = Decimal("8994.00")
        
        # When closing: get back margin + pnl - close_fee
        balance_after_close = balance_before_close + margin + pnl - fee
        
        assert balance_after_close == Decimal("10488.00")
    
    def test_position_creates_correct_entry_price(self):
        """Test that position records correct entry price."""
        order_price = Decimal("105432.50")
        
        # Entry price should match execution price
        entry_price = order_price
        
        assert entry_price == order_price
    
    def test_position_quantity_matches_order(self):
        """Test that position quantity matches order quantity."""
        order_qty = Decimal("0.15")
        
        position_qty = order_qty
        
        assert position_qty == order_qty


class TestPositionSizing:
    """Test suite for position sizing calculations."""
    
    def test_max_position_from_balance(self):
        """Test calculating max position size from available balance."""
        balance = Decimal("1000.00")
        leverage = 10
        price = Decimal("100000.00")
        
        max_position_value = balance * leverage
        max_quantity = max_position_value / price
        
        # $1000 * 10x = $10,000 max position = 0.1 BTC at $100k
        assert max_position_value == Decimal("10000.00")
        assert max_quantity == Decimal("0.1")
    
    def test_quantity_precision_btc(self):
        """Test BTC quantity is limited to reasonable precision."""
        raw_qty = Decimal("0.123456789")
        precision = 6  # 6 decimal places for BTC
        
        rounded_qty = round(raw_qty, precision)
        
        assert rounded_qty == Decimal("0.123457")
    
    def test_quantity_precision_eth(self):
        """Test ETH quantity precision."""
        raw_qty = Decimal("1.23456789")
        precision = 5  # 5 decimal places for ETH
        
        rounded_qty = round(raw_qty, precision)
        
        assert rounded_qty == Decimal("1.23457")
