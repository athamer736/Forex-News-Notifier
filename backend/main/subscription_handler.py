import logging
import secrets
from datetime import datetime
from typing import Dict, Tuple
from flask import jsonify, request, render_template
import pytz
from sqlalchemy.exc import IntegrityError

from ..database import db_session
from models.email_subscription import EmailSubscription
from .email_service import send_verification_email

logger = logging.getLogger(__name__)

def generate_verification_token() -> str:
    """Generate a secure verification token."""
    return secrets.token_urlsafe(32)

def handle_subscription_request() -> Tuple[Dict, int]:
    """Handle new subscription requests."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'frequency', 'currencies', 'impactLevels']
        for field in required_fields:
            if field not in data:
                return {'error': f'Missing required field: {field}'}, 400
        
        # Validate frequency
        if data['frequency'] not in ['daily', 'weekly', 'both']:
            return {'error': 'Invalid frequency. Must be daily, weekly, or both'}, 400
        
        # Validate currencies and impact levels
        if not data['currencies'] or not data['impactLevels']:
            return {'error': 'Must select at least one currency and impact level'}, 400
        
        # Check if email already exists
        existing = EmailSubscription.query.filter_by(email=data['email']).first()
        if existing:
            if existing.is_verified:
                return {'error': 'Email already subscribed'}, 400
            else:
                # Resend verification email
                send_verification_email(existing.email, existing.verification_token)
                return {'message': 'Verification email resent'}, 200
        
        # Create new subscription
        subscription = EmailSubscription(
            email=data['email'],
            frequency=data['frequency'],
            currencies=data['currencies'],
            impact_levels=data['impactLevels'],
            daily_time=data.get('dailyTime'),
            weekly_day=data.get('weeklyDay'),
            timezone=data.get('timezone', 'UTC'),
            verification_token=generate_verification_token()
        )
        
        db_session.add(subscription)
        db_session.commit()
        
        # Send verification email
        send_verification_email(subscription.email, subscription.verification_token)
        
        return {
            'message': 'Subscription created. Please check your email to verify.'
        }, 201
        
    except IntegrityError:
        db_session.rollback()
        return {'error': 'Email already exists'}, 400
    except Exception as e:
        logger.exception("Error handling subscription request")
        db_session.rollback()
        return {'error': str(e)}, 500

def handle_verification_request(token: str) -> Tuple[Dict, int]:
    """Handle subscription verification."""
    try:
        subscription = EmailSubscription.query.filter_by(
            verification_token=token,
            is_verified=False
        ).first()
        
        if not subscription:
            return render_template('verify.html', 
                success=False, 
                error='Invalid or expired verification token'
            ), 400
        
        subscription.is_verified = True
        subscription.verification_token = None
        db_session.commit()
        
        return render_template('verify.html', 
            success=True
        ), 200
        
    except Exception as e:
        logger.exception("Error verifying subscription")
        db_session.rollback()
        return render_template('verify.html', 
            success=False, 
            error='An error occurred while verifying your subscription'
        ), 500

def handle_unsubscribe_request(token: str) -> Tuple[Dict, int]:
    """Handle unsubscribe requests."""
    try:
        subscription = EmailSubscription.query.filter_by(
            verification_token=token
        ).first()
        
        if not subscription:
            return render_template('unsubscribe.html', 
                success=False, 
                error='Invalid unsubscribe token'
            ), 400
        
        db_session.delete(subscription)
        db_session.commit()
        
        return render_template('unsubscribe.html', 
            success=True
        ), 200
        
    except Exception as e:
        logger.exception("Error handling unsubscribe request")
        db_session.rollback()
        return render_template('unsubscribe.html', 
            success=False, 
            error='An error occurred while processing your unsubscribe request'
        ), 500 