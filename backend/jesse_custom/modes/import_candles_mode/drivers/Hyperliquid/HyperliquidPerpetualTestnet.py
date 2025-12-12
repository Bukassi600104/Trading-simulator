from jesse.enums import exchanges

from .HyperliquidPerpetualMain import HyperliquidPerpetualMain


class HyperliquidPerpetualTestnet(HyperliquidPerpetualMain):
    def __init__(self) -> None:
        super().__init__(
            name=exchanges.HYPERLIQUID_PERPETUAL_TESTNET,
            rest_endpoint='https://api.hyperliquid-testnet.xyz/info'
        )
