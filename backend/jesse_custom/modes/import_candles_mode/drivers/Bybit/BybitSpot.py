from jesse.enums import exchanges

from .BybitMain import BybitMain


class BybitSpot(BybitMain):
    def __init__(self) -> None:
        super().__init__(
            name=exchanges.BYBIT_SPOT,
            rest_endpoint='https://api.bybit.com',
            category='spot',
        )
