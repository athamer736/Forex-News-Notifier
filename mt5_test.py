import MetaTrader5 as mt5
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def inspect_mt5():
    """Inspect MT5 module attributes and methods"""
    try:
        # Initialize MT5
        if not mt5.initialize():
            logger.error(f"MetaTrader5 initialization failed: {mt5.last_error()}")
            return
            
        logger.info("MetaTrader5 initialized successfully")
        
        # Get all attributes
        attributes = [attr for attr in dir(mt5) if not attr.startswith('_')]
        logger.info("Available MT5 attributes and methods:")
        for attr in attributes:
            logger.info(f"- {attr}")
            
        # Check version
        logger.info(f"MT5 version: {mt5.version()}")
        
        # Check terminal info
        terminal_info = mt5.terminal_info()
        if terminal_info is not None:
            logger.info(f"Terminal info: {terminal_info}")
        
    except Exception as e:
        logger.error(f"Error inspecting MT5: {str(e)}")
    finally:
        mt5.shutdown()

if __name__ == "__main__":
    inspect_mt5() 