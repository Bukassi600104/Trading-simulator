from jesse.enums import exchanges

from .BybitMain import BybitMain


class BybitUSDTPerpetual(BybitMain):
    def __init__(self) -> None:
        super().__init__(
            name=exchanges.BYBIT_USDT_PERPETUAL,
            rest_endpoint='https://api.bybit.com',
            category='linear',
        )
