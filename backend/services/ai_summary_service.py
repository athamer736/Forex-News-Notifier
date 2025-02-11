import os
import logging
from typing import Dict, Optional
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv

# Get the absolute path of the project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(project_root, '.env')

# Load environment variables
load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)

class AISummaryService:
    def __init__(self):
        # Get API key and log its presence (without exposing the full key)
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        
        # Log the first and last few characters of the API key for debugging
        logger.info(f"Initializing OpenAI client with API key: {api_key[:4]}...{api_key[-4:]}")
        
        self.client = OpenAI(api_key=api_key)
        
    def generate_event_summary(self, event: Dict) -> Optional[str]:
        """Generate an AI summary for a forex event."""
        try:
            # Skip if not a high-impact US or GBP event
            if not self.should_generate_summary(event):
                return None

            # Construct the prompt
            prompt = f"""
            Please provide a comprehensive market analysis and prediction for this {event['currency']} forex economic event:
            
            Event: {event['event_title']}
            Currency: {event['currency']}
            Impact Level: {event['impact']}
            Forecast: {event.get('forecast', 'N/A')}
            Previous: {event.get('previous', 'N/A')}
            
            Please structure the response in these sections:
            1. Brief explanation of what this event measures and why it's important (2-3 sentences)
            
            2. Market Impact Analysis:
               - Potential impact on US Futures (NQ, ES, YM)
               - Potential impact on Forex pairs (GBPUSD, EURUSD, DXY)
               - Expected directional bias (Bullish/Bearish) for each market
               - Key price levels or zones to watch
            
            3. Scenario Analysis:
               If Better Than Expected:
               - Likely market reaction for futures and forex
               - Key resistance levels to watch
               
               If Worse Than Expected:
               - Likely market reaction for futures and forex
               - Key support levels to watch
            
            4. Volatility Expectation:
               - Typical pip range movement for forex pairs
               - Typical point range for futures markets
               - Best timeframe to trade this event
            
            Keep the analysis concise and focused on actionable trading insights. Include specific price levels where possible.
            """
            
            # Call GPT-4 API
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert market analyst specializing in futures and forex markets. You provide detailed, practical analysis with specific price levels and directional bias. Your analysis is data-driven and considers intermarket relationships between futures and forex markets."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,  # Increased for more detailed analysis
                temperature=0.7
            )
            
            # Extract and return the summary
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content.strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Error generating AI summary: {str(e)}")
            return None
            
    def should_generate_summary(self, event: Dict) -> bool:
        """Determine if we should generate a summary for this event."""
        # Only generate summaries for high-impact USD and GBP events
        is_high_impact = event.get('impact') == 'High'
        is_target_currency = event.get('currency') in ['USD', 'GBP']
        
        if is_high_impact and is_target_currency:
            logger.info(f"Will generate summary for {event['currency']} event: {event.get('event_title')}")
            return True
            
        return False 