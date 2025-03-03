import os
import logging
from typing import Dict, Optional
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv
from backend.services.ssl_helper import configure_ssl

# Get the absolute path of the project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(project_root, '.env')

# Load environment variables
load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)

class AISummaryService:
    def __init__(self, api_key=None):
        """Initialize the AI summary service.
        
        Args:
            api_key (str, optional): OpenAI API key. If not provided, will try to get from environment.
        """
        # Configure SSL for API calls
        configure_ssl()
        
        # Get API key from environment if not provided
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        
        if not self.api_key:
            raise ValueError("OpenAI API key is required. Provide it as an argument or set OPENAI_API_KEY environment variable.")
            
        # Initialize OpenAI client
        logger.info(f"Initializing OpenAI client with API key: {self.api_key[:3]}...{self.api_key[-4:]}")
        self.client = OpenAI(api_key=self.api_key)
        
    def generate_event_summary(self, event: Dict) -> Optional[str]:
        """Generate an AI summary for a forex event."""
        try:
            # Skip if not a high-impact US or GBP event
            if not self.should_generate_summary(event):
                return None

            # Construct the prompt
            prompt = f"""
            Please provide a comprehensive market analysis and prediction for this {event['currency']} forex economic event using smart money concepts and quarterly theory:
            
            Event: {event['event_title']}
            Currency: {event['currency']}
            Impact Level: {event['impact']}
            Forecast: {event.get('forecast', 'N/A')}
            Previous: {event.get('previous', 'N/A')}
            
            Please structure your response in these sections:
            1. Event Context:
               - Brief explanation of what this event measures and its importance
               - Historical impact on the {event['currency']}
               - Typical market reaction patterns
            
            2. Technical Analysis:
               - Key quarterly levels for {event['currency']} pairs
               - Important SMC (Smart Money Concepts) levels
               - Potential liquidity areas and institutional interest zones
               - Order block identification on 4H timeframe
            
            3. Scenario Analysis:
               If Better Than Expected:
               - Likely price behavior based on quarterly theory
               - Key SMC resistance levels and breaker blocks
               - Potential liquidity grabs and stop runs
               
               If Worse Than Expected:
               - Likely price behavior based on quarterly theory
               - Key SMC support levels and breaker blocks
               - Potential liquidity grabs and stop runs
            
            4. Trading Strategy:
               - Key entry zones based on order blocks
               - Risk management using quarterly levels
               - Best timeframes for execution (focus on 4H)
               - Correlated pairs to monitor
            
            Focus on institutional order flow concepts and quarterly market structure.
            Identify key SMC levels and potential manipulation zones.

            Please write your response in one paragraph and make it easy to read and understand, max words of 250-300. Don't put it in a list or bullet points, just write it out.
            """
            
            # Call GPT-4 API
            response = self.client.chat.completions.create(
                model="gpt-4",  # Using standard GPT-4 model
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert market analyst specializing in Smart Money Concepts (SMC) and quarterly theory. Your analysis focuses on institutional order flow, market structure, and manipulation concepts like liquidity grabs, breaker blocks, and order blocks. Provide detailed technical analysis with specific price zones and market structure levels."
                    },
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
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