from jesse.enums import exchanges

from .BybitMain import BybitMain


class BybitUSDCPerpetualTestnet(BybitMain):
    def __init__(self) -> None:
        super().__init__(
            name=exchanges.BYBIT_USDC_PERPETUAL_TESTNET,
            rest_endpoint='https://api-testnet.bybit.com',
            category='linear',
        )
