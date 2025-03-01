import os
import logging
from typing import Dict, Optional
import time
import json
import traceback
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Get the absolute path of the project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(project_root, '.env')

# Load environment variables
load_dotenv(env_path, override=True)

logger = logging.getLogger(__name__)

class AISummaryService:
    def __init__(self):
        # Initialize failure tracking
        self.failure_count = 0
        self.last_failure_time = None
        self.cooldown_period = 1800  # 30 minutes in seconds
        self.max_failures = 5  # After this many failures, enter cooldown
        
        # Get API key
        self.api_key = os.getenv('OPENAI_API_KEY')
        
        if not self.api_key:
            logger.warning("OpenAI API key not found in environment variables. AI summaries will be disabled.")
            self.enabled = False
        else:
            # Log the first and last few characters of the API key for debugging
            logger.info(f"Initializing OpenAI client with API key: {self.api_key[:4]}...{self.api_key[-4:]}")
            self.enabled = True
            
            try:
                # Import OpenAI library - we'll import it only when needed to reduce memory usage
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Error initializing OpenAI client: {str(e)}")
                self.enabled = False
                self.failure_reason = str(e)
        
    def generate_event_summary(self, event: Dict) -> Optional[str]:
        """Generate an AI summary for a forex event with fallback mechanism."""
        # Skip if not enabled
        if not self.enabled:
            logger.info("AI summary generation is disabled")
            return None
            
        # Check if we're in cooldown period
        if self.last_failure_time and (datetime.now() - self.last_failure_time).total_seconds() < self.cooldown_period:
            logger.info(f"AI summary generation is in cooldown period after multiple failures. Resuming in {self.cooldown_period - (datetime.now() - self.last_failure_time).total_seconds():.1f} seconds")
            return None
            
        try:
            # Skip if not a high-impact US or GBP event
            if not self.should_generate_summary(event):
                return None

            # Import OpenAI just when needed
            from openai import OpenAI
                
            if not hasattr(self, 'client'):
                self.client = OpenAI(api_key=self.api_key)
                
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
            
            # Log memory usage before making API call
            logger.info(f"Making OpenAI API call for event: {event['event_title']}")
            
            # Call GPT-4 API with timeout handling
            start_time = time.time()
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
                temperature=0.7,
                timeout=30  # 30 second timeout
            )
            elapsed_time = time.time() - start_time
            logger.info(f"OpenAI API call completed in {elapsed_time:.2f} seconds")
            
            # Reset failure count on success
            self.failure_count = 0
            
            # Extract and return the summary
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content.strip()
            
            return None
            
        except Exception as e:
            # Increment failure count
            self.failure_count += 1
            self.last_failure_time = datetime.now()
            
            # Log the exception
            logger.error(f"Error generating AI summary (failure #{self.failure_count}): {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Enter cooldown if too many failures
            if self.failure_count >= self.max_failures:
                logger.warning(f"Entering cooldown period after {self.failure_count} consecutive failures. AI summaries will be disabled for {self.cooldown_period/60} minutes.")
            
            return None
            
    def should_generate_summary(self, event: Dict) -> bool:
        """Determine if we should generate a summary for this event."""
        # Skip if AI is disabled
        if not self.enabled:
            return False
            
        # Only generate summaries for high-impact USD and GBP events
        is_high_impact = event.get('impact') == 'High'
        is_target_currency = event.get('currency') in ['USD', 'GBP']
        
        if is_high_impact and is_target_currency:
            logger.info(f"Will generate summary for {event['currency']} event: {event.get('event_title')}")
            return True
            
        return False

    def get_status(self) -> Dict:
        """Get the current status of the AI service"""
        status = {
            "enabled": self.enabled,
            "failure_count": self.failure_count,
        }
        
        if self.last_failure_time:
            status["last_failure"] = self.last_failure_time.isoformat()
            
            # Calculate cooldown remaining
            cooldown_seconds_remaining = max(0, self.cooldown_period - (datetime.now() - self.last_failure_time).total_seconds())
            status["cooldown_seconds_remaining"] = cooldown_seconds_remaining
            
        if not self.enabled and hasattr(self, 'failure_reason'):
            status["failure_reason"] = self.failure_reason
            
        return status 