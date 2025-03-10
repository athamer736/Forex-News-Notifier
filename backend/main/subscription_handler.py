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
        if not token or len(token) < 10:  # Basic validation
            logger.error(f"Invalid token format: {token}")
            return render_template('verify.html', 
                success=False, 
                error='Invalid verification token format. Please check the link in your email.'
            ), 400
            
        subscription = EmailSubscription.query.filter_by(
            verification_token=token,
            is_verified=False
        ).first()
        
        if not subscription:
            # Check if the subscription exists but is already verified
            already_verified = EmailSubscription.query.filter(
                EmailSubscription.verification_token == token
            ).first()
            
            if already_verified and already_verified.is_verified:
                logger.info(f"Token already verified: {token}")
                return render_template('verify.html', 
                    success=True,
                    message='Your email is already verified. You are all set to receive updates!'
                ), 200
            
            logger.error(f"Token not found: {token}")
            return render_template('verify.html', 
                success=False, 
                error='Invalid or expired verification token. The link may have expired or been used already.'
            ), 400
        
        subscription.is_verified = True
        subscription.verification_token = None
        db_session.commit()
        
        logger.info(f"Successfully verified subscription for: {subscription.email}")
        return render_template('verify.html', 
            success=True
        ), 200
        
    except Exception as e:
        logger.exception(f"Error verifying subscription with token: {token}")
        db_session.rollback()
        return render_template('verify.html', 
            success=False, 
            error='An error occurred while verifying your subscription. Please contact us at fxalerts736@gmail.co.uk for assistance.'
        ), 500

def handle_unsubscribe_request(token: str) -> Tuple[Dict, int]:
    """Handle unsubscribe requests."""
    try:
        if not token or len(token) < 10:  # Basic validation
            logger.error(f"Invalid unsubscribe token format: {token}")
            return render_template('unsubscribe.html', 
                success=False, 
                error='Invalid unsubscribe token format. Please check the link in your email.'
            ), 400
            
        subscription = EmailSubscription.query.filter_by(
            verification_token=token
        ).first()
        
        if not subscription:
            logger.error(f"Unsubscribe token not found: {token}")
            return render_template('unsubscribe.html', 
                success=False, 
                error='Invalid unsubscribe token. The link may have expired or been used already.'
            ), 400
        
        email = subscription.email  # Save email for logging
        db_session.delete(subscription)
        db_session.commit()
        
        logger.info(f"Successfully unsubscribed: {email}")
        return render_template('unsubscribe.html', 
            success=True
        ), 200
        
    except Exception as e:
        logger.exception(f"Error handling unsubscribe request with token: {token}")
        db_session.rollback()
        return render_template('unsubscribe.html', 
            success=False, 
            error='An error occurred while processing your unsubscribe request. Please contact us at fxalerts736@gmail.com for assistance.'
        ), 500 