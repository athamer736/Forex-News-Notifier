import os
import sys
from datetime import datetime, timedelta
import pytz
import unittest

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from backend.main.email_service import send_email, format_event_summary

class TestEmailTemplates(unittest.TestCase):
    def setUp(self):
        self.test_events = [
            {
                'event_title': 'Core CPI m/m',
                'currency': 'USD',
                'impact': 'High',
                'time': datetime.now(pytz.UTC) + timedelta(hours=2),
                'forecast': '0.3%',
                'previous': '0.2%',
                'ai_summary': '''Event Context:
- Core CPI measures price changes excluding volatile food and energy components
- Historical impact shows strong USD volatility on significant deviations
- Typically causes immediate price action in USD pairs

Technical Analysis:
- Key quarterly level at 1.0850 for EUR/USD
- Major SMC resistance zone: 1.0920-1.0950
- Institutional interest identified at 1.0800 support
- 4H order block: 1.0880-1.0900

Scenario Analysis (Better Than Expected):
- Likely push above 1.0900 to grab liquidity
- Key breaker block at 1.0950
- Potential stop run above 1.1000

Scenario Analysis (Worse Than Expected):
- Support at 1.0800 SMC level
- Breaker block: 1.0750-1.0780
- Liquidity grab below 1.0700

Trading Strategy:
- Entry zones at 1.0880 and 1.0820
- Risk management using quarterly level at 1.0850
- Focus on 4H timeframe for execution
- Monitor DXY and EUR/GBP correlation'''
            },
            {
                'event_title': 'Fed Chair Powell Testifies',
                'currency': 'USD',
                'impact': 'High',
                'time': datetime.now(pytz.UTC) + timedelta(hours=4),
                'forecast': 'N/A',
                'previous': 'N/A',
                'ai_summary': '''Event Context:
- Fed Chair testimony can significantly impact market sentiment
- Historical patterns show increased volatility during Q&A
- Market typically reacts to hints about future policy

Technical Analysis:
- USD/JPY quarterly resistance: 150.80
- SMC supply zone: 150.50-150.70
- Major liquidity pool above 151.00
- 4H order blocks identified at 149.80-150.00

Scenario Analysis (Hawkish Tone):
- Push towards 151.00 likely
- Key breaker blocks at 150.80
- Stop run setup above recent highs

Scenario Analysis (Dovish Tone):
- Support at 149.50 SMC level
- Multiple breaker blocks: 149.20-149.40
- Potential liquidity sweep below 149.00

Trading Strategy:
- Key entries near 150.00 and 149.50
- Use quarterly levels for risk management
- Monitor 4H timeframe for setups
- Watch US10Y and Nikkei correlation'''
            }
        ]

    def test_format_event_summary(self):
        """Test that event summary formatting works correctly"""
        for event in self.test_events:
            formatted = format_event_summary(event)
            self.assertIsInstance(formatted, str)
            self.assertIn(event['event_title'], formatted)
            self.assertIn(event['currency'], formatted)
            self.assertIn(event['impact'], formatted)
            if event['ai_summary']:
                self.assertIn('AI Market Analysis', formatted)

    def test_daily_email_template(self):
        """Test sending a daily update email"""
        try:
            from backend.main.email_service import send_daily_update
            from models.email_subscription import EmailSubscription
            
            # Create test subscription
            subscription = EmailSubscription(
                email=os.getenv('TEST_EMAIL', 'your-test-email@example.com'),
                frequency='daily',
                currencies=['USD', 'GBP'],
                impact_levels=['High'],
                daily_time='09:00',
                timezone='UTC',
                is_verified=True
            )
            
            # Send test email
            send_daily_update(subscription)
            
        except Exception as e:
            self.fail(f"Failed to send daily email: {str(e)}")

    def test_weekly_email_template(self):
        """Test sending a weekly update email"""
        try:
            from backend.main.email_service import send_weekly_update
            from models.email_subscription import EmailSubscription
            
            # Create test subscription
            subscription = EmailSubscription(
                email=os.getenv('TEST_EMAIL', 'your-test-email@example.com'),
                frequency='weekly',
                currencies=['USD', 'GBP'],
                impact_levels=['High'],
                weekly_day='monday',
                timezone='UTC',
                is_verified=True
            )
            
            # Send test email
            send_weekly_update(subscription)
            
        except Exception as e:
            self.fail(f"Failed to send weekly email: {str(e)}")

if __name__ == '__main__':
    unittest.main() 