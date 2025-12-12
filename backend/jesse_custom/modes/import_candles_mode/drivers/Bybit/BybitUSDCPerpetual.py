from jesse.enums import exchanges

from .BybitMain import BybitMain


class BybitUSDCPerpetual(BybitMain):
    def __init__(self) -> None:
        super().__init__(
            name=exchanges.BYBIT_USDC_PERPETUAL,
            rest_endpoint='https://api.bybit.com',
            category='linear',
        )
