import jesse.helpers as jh
from jesse import utils
from jesse.strategies import Strategy


class TestOrderPriceCannotBeGreaterThanZero(Strategy):
    def should_long(self) -> bool:
        return self.price == 10

    def go_long(self) -> None:
        self.buy = 1, 0

    def should_cancel_entry(self):
        return False
