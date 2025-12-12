"""
Worker Process for Terminal Zero
Consumes orders from Redis queue and executes them via Jesse Engine.
"""

import asyncio
import json
import os
import sys
from decimal import Decimal

import redis.asyncio as redis
from loguru import logger

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), "../backend"))

from app.core.config import REDIS_URL
from app.core.database import async_session_maker
from jesse_custom.exchange import OrderRequest, get_paper_exchange
from jesse_custom.engine import get_portfolio_manager

# Queue names
QUEUE_ORDERS = "orders_queue"

async def process_orders():
    """
    Main worker loop.
    Pops orders from Redis list and executes them.
    """
    logger.info(f"👷 Worker started. Listening on {QUEUE_ORDERS}...")
    
    # Connect to Redis
    r = redis.from_url(REDIS_URL)
    
    # Initialize engine
    exchange = get_paper_exchange()
    get_portfolio_manager()
    
    while True:
        try:
            # Blocking pop from right of list
            # result is (queue_name, data)
            result = await r.blpop(QUEUE_ORDERS, timeout=1)
            
            if not result:
                continue
                
            _, data_json = result
            data = json.loads(data_json)
            
            logger.info(f"📥 Received order: {data}")
            
            user_id = data.get("user_id")
            order_data = data.get("order")
            
            if not user_id or not order_data:
                logger.error("Invalid order data format")
                continue
                
            # Convert dict back to OrderRequest
            # Note: Decimal fields need to be handled if passed as strings
            order_request = OrderRequest(
                symbol=order_data["symbol"],
                side=order_data["side"],
                order_type=order_data["order_type"],
                qty=Decimal(str(order_data["qty"])),
                price=Decimal(str(order_data["price"])) if order_data.get("price") else None,
                reduce_only=order_data.get("reduce_only", False),
                leverage=order_data.get("leverage")
            )
            
            # Execute order
            import uuid
            uid = uuid.UUID(user_id)
            
            # Create DB session for this operation
            async with async_session_maker() as db:
                result = await exchange.submit_order(uid, order_request, db)
            
            if result.success:
                logger.info(f"✅ Order executed: {result.message}")
                # TODO: Publish result to a response queue or Pub/Sub for frontend
            else:
                logger.warning(f"❌ Order failed: {result.message}")
                
        except Exception as e:
            logger.error(f"Worker error: {e}")
            await asyncio.sleep(1)

if __name__ == "__main__":
    try:
        asyncio.run(process_orders())
    except KeyboardInterrupt:
        logger.info("Worker stopped")
