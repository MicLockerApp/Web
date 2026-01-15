import boto3
from botocore.exceptions import ClientError
from config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """AWS SES Email Service for sending transactional emails"""
    
    def __init__(self):
        self.client = None
        self.sender_email = settings.ses_sender_email
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the SES client with AWS credentials"""
        try:
            if settings.aws_access_key_id and settings.aws_secret_access_key:
                self.client = boto3.client(
                    'ses',
                    region_name=settings.ses_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key
                )
                logger.info(f"AWS SES client initialized for region: {settings.ses_region}")
            else:
                logger.warning("AWS credentials not configured - email sending disabled")
        except Exception as e:
            logger.error(f"Failed to initialize SES client: {e}")
            self.client = None
    
    def send_password_reset_email(self, to_email: str, reset_code: str) -> bool:
        """
        Send a password reset email with the verification code
        
        Args:
            to_email: Recipient email address
            reset_code: 6-digit verification code
            
        Returns:
            True if email sent successfully, False otherwise
        """
        if not self.client:
            logger.warning(f"SES client not available - logging code instead: {reset_code}")
            return False
        
        subject = "MicLocker - Password Reset Code"
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #1a1a1a;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #2d2d2d; border-radius: 12px; overflow: hidden;">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
                                    <h1 style="margin: 0; color: #FFD700; font-size: 32px; font-weight: bold;">🎵 MicLocker</h1>
                                    <p style="margin: 10px 0 0; color: #888; font-size: 14px;">The Marketplace for Music Pros</p>
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td style="padding: 30px 40px;">
                                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">Password Reset Request</h2>
                                    <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                                        We received a request to reset your password. Use the verification code below to complete the process:
                                    </p>
                                    
                                    <!-- Code Box -->
                                    <div style="background-color: #1a1a1a; border: 2px solid #FFD700; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                                        <p style="margin: 0 0 10px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                        <p style="margin: 0; color: #FFD700; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">{reset_code}</p>
                                    </div>
                                    
                                    <p style="margin: 0 0 10px; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                        ⏰ This code will expire in <strong style="color: #FFD700;">15 minutes</strong>.
                                    </p>
                                    <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                                        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px 40px; background-color: #1a1a1a; border-top: 1px solid #3d3d3d;">
                                    <p style="margin: 0 0 10px; color: #666; font-size: 12px; text-align: center;">
                                        This is an automated message from MicLocker. Please do not reply to this email.
                                    </p>
                                    <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                                        © 2024 MicLocker. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
MicLocker - Password Reset

We received a request to reset your password.

Your verification code is: {reset_code}

This code will expire in 15 minutes.

If you didn't request a password reset, you can safely ignore this email.

---
This is an automated message from MicLocker.
        """
        
        try:
            response = self.client.send_email(
                Source=self.sender_email,
                Destination={
                    'ToAddresses': [to_email]
                },
                Message={
                    'Subject': {
                        'Data': subject,
                        'Charset': 'UTF-8'
                    },
                    'Body': {
                        'Text': {
                            'Data': text_body,
                            'Charset': 'UTF-8'
                        },
                        'Html': {
                            'Data': html_body,
                            'Charset': 'UTF-8'
                        }
                    }
                }
            )
            
            message_id = response.get('MessageId', 'unknown')
            logger.info(f"Password reset email sent to {to_email} (MessageId: {message_id})")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"Failed to send email to {to_email}: {error_code} - {error_message}")
            
            # Log the code as fallback so user can still reset password
            logger.warning(f"[FALLBACK] Password reset code for {to_email}: {reset_code}")
            return False
            
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}")
            logger.warning(f"[FALLBACK] Password reset code for {to_email}: {reset_code}")
            return False


# Singleton instance
email_service = EmailService()


async def send_password_reset_email(to_email: str, reset_code: str) -> bool:
    """
    Async wrapper for sending password reset emails
    
    Args:
        to_email: Recipient email address
        reset_code: 6-digit verification code
        
    Returns:
        True if email sent successfully, False otherwise
    """
    return email_service.send_password_reset_email(to_email, reset_code)


async def send_ticket_notification(ticket) -> bool:
    """
    Send email notification to staff when a new support ticket is created
    
    Args:
        ticket: TicketInDB object
        
    Returns:
        True if email sent successfully
    """
    if not email_service.client:
        logger.warning("SES client not available - ticket notification not sent")
        return False
    
    staff_email = "info@miclockerapp.com"
    subject = f"[MicLocker Support] New Ticket #{ticket.ticket_number}: {ticket.subject}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #2d2d2d; border-radius: 12px; padding: 30px;">
            <h1 style="color: #FFD700; margin-bottom: 20px;">🎫 New Support Ticket</h1>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #888;">Ticket Number:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #FFD700; font-weight: bold;">{ticket.ticket_number}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #888;">Category:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #444;">{ticket.category}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #888;">Priority:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: {'#ff4444' if ticket.priority in ['urgent', 'high'] else '#ffffff'};">{ticket.priority.upper()}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #888;">Customer:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #444;">{ticket.customer_name} ({ticket.customer_email})</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #444; color: #888;">Subject:</td>
                    <td style="padding: 10px; border-bottom: 1px solid #444;">{ticket.subject}</td>
                </tr>
            </table>
            
            <h3 style="color: #888; margin-bottom: 10px;">Message:</h3>
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
                {ticket.message}
            </div>
            
            <p style="margin-top: 30px; color: #888; font-size: 12px;">
                This is an automated notification from MicLocker Support System.
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
New Support Ticket - {ticket.ticket_number}

Category: {ticket.category}
Priority: {ticket.priority}
Customer: {ticket.customer_name} ({ticket.customer_email})
Subject: {ticket.subject}

Message:
{ticket.message}

---
MicLocker Support System
    """
    
    try:
        response = email_service.client.send_email(
            Source=email_service.sender_email,
            Destination={'ToAddresses': [staff_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f"Ticket notification sent for {ticket.ticket_number}")
        return True
    except Exception as e:
        logger.error(f"Failed to send ticket notification: {e}")
        return False


async def send_ticket_reply_notification(ticket, reply, is_staff_reply: bool) -> bool:
    """
    Send email notification when a reply is added to a ticket
    
    Args:
        ticket: Ticket dict
        reply: TicketReply object
        is_staff_reply: True if staff replied, False if customer
        
    Returns:
        True if email sent successfully
    """
    if not email_service.client:
        return False
    
    # Notify customer if staff replied, notify staff if customer replied
    if is_staff_reply:
        to_email = ticket["customer_email"]
        subject = f"[MicLocker Support] Reply to Ticket #{ticket['ticket_number']}"
        intro = "Our support team has replied to your ticket."
    else:
        to_email = "info@miclockerapp.com"
        subject = f"[MicLocker Support] Customer Reply - Ticket #{ticket['ticket_number']}"
        intro = f"Customer {ticket['customer_name']} has replied to their ticket."
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #2d2d2d; border-radius: 12px; padding: 30px;">
            <h1 style="color: #FFD700; margin-bottom: 20px;">💬 Ticket Reply</h1>
            
            <p style="margin-bottom: 20px;">{intro}</p>
            
            <p style="color: #888;">Ticket: <strong style="color: #FFD700;">{ticket['ticket_number']}</strong></p>
            <p style="color: #888;">Subject: {ticket['subject']}</p>
            
            <h3 style="color: #888; margin: 20px 0 10px;">Reply from {reply.sender_name}:</h3>
            <div style="background-color: #1a1a1a; padding: 15px; border-radius: 8px; white-space: pre-wrap;">
                {reply.message}
            </div>
            
            <p style="margin-top: 30px; color: #888; font-size: 12px;">
                MicLocker Support System
            </p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
Ticket Reply - {ticket['ticket_number']}

{intro}

Subject: {ticket['subject']}

Reply from {reply.sender_name}:
{reply.message}

---
MicLocker Support System
    """
    
    try:
        response = email_service.client.send_email(
            Source=email_service.sender_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'},
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f"Ticket reply notification sent for {ticket['ticket_number']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send ticket reply notification: {e}")
        return False
