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


async def send_email_verification_code(to_email: str, verification_code: str) -> bool:
    """
    Send email verification code during signup
    
    Args:
        to_email: Recipient email address
        verification_code: 6-digit verification code
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not email_service.client:
        logger.warning(f"SES client not available - logging verification code instead: {verification_code}")
        return False
    
    subject = "MicLocker - Verify Your Email"
    
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
                                <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">🎉 Verify Your Email</h2>
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                                    Welcome to MicLocker! To complete your registration and start buying, selling, and trading music gear, please verify your email address.
                                </p>
                                
                                <!-- Code Box -->
                                <div style="background-color: #1a1a1a; border: 2px solid #FFD700; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                                    <p style="margin: 0 0 10px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                                    <p style="margin: 0; color: #FFD700; font-size: 42px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">{verification_code}</p>
                                </div>
                                
                                <p style="margin: 0 0 10px; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                    ⏰ This code will expire in <strong style="color: #FFD700;">15 minutes</strong>.
                                </p>
                                <p style="margin: 0; color: #888; font-size: 14px; line-height: 1.6;">
                                    If you didn't create an account on MicLocker, you can safely ignore this email.
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
    
    text_body = f"""
MicLocker - Verify Your Email

Welcome to MicLocker!

To complete your registration and start buying, selling, and trading music gear, please verify your email address.

Your verification code is: {verification_code}

This code will expire in 15 minutes.

If you didn't create an account on MicLocker, you can safely ignore this email.

---
This is an automated message from MicLocker.
    """
    
    try:
        response = email_service.client.send_email(
            Source=email_service.sender_email,
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
        logger.info(f"Email verification code sent to {to_email} (MessageId: {message_id})")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"Failed to send verification email to {to_email}: {error_code} - {error_message}")
        logger.warning(f"[FALLBACK] Email verification code for {to_email}: {verification_code}")
        return False
        
    except Exception as e:
        logger.error(f"Unexpected error sending verification email to {to_email}: {e}")
        logger.warning(f"[FALLBACK] Email verification code for {to_email}: {verification_code}")
        return False


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


async def send_ticket_reply_notification(ticket, reply, is_staff_reply: bool, frontend_url: str = None) -> bool:
    """
    Send email notification when a reply is added to a ticket
    
    Args:
        ticket: Ticket dict
        reply: TicketReply object
        is_staff_reply: True if staff replied, False if customer
        frontend_url: Base URL for the frontend app (uses settings if not provided)
        
    Returns:
        True if email sent successfully
    """
    from config import settings
    if frontend_url is None:
        frontend_url = settings.frontend_url
    
    if not frontend_url:
        logger.warning("FRONTEND_URL not configured - cannot send ticket reply email")
        return False
    
    if not email_service.client:
        return False
    
    # Notify customer if staff replied, notify staff if customer replied
    if is_staff_reply:
        to_email = ticket["customer_email"]
        subject = f"[MicLocker Support] Reply to Ticket #{ticket['ticket_number']}"
        intro = "Our support team has replied to your ticket."
        # Link to messages inbox for the user
        cta_url = f"{frontend_url}/messages"
        cta_text = "View Message in Your Inbox"
        show_cta = True
    else:
        to_email = "info@miclockerapp.com"
        subject = f"[MicLocker Support] Customer Reply - Ticket #{ticket['ticket_number']}"
        intro = f"Customer {ticket['customer_name']} has replied to their ticket."
        cta_url = ""
        cta_text = ""
        show_cta = False
    
    # CTA button HTML
    cta_button = ""
    if show_cta:
        cta_button = f"""
            <div style="text-align: center; margin: 30px 0;">
                <a href="{cta_url}" style="display: inline-block; background-color: #FFD700; color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📬 {cta_text}
                </a>
            </div>
            <p style="text-align: center; color: #888; font-size: 12px; margin-top: 10px;">
                Or copy this link: <a href="{cta_url}" style="color: #FFD700;">{cta_url}</a>
            </p>
        """
    
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
                                <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">💬 New Message from Support</h2>
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                                    {intro}
                                </p>
                                
                                <!-- Ticket Info Box -->
                                <div style="background-color: #1a1a1a; border-left: 4px solid #FFD700; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0 0 8px; color: #888; font-size: 14px;">
                                        <strong style="color: #FFD700;">Ticket:</strong> {ticket['ticket_number']}
                                    </p>
                                    <p style="margin: 0; color: #888; font-size: 14px;">
                                        <strong style="color: #FFD700;">Subject:</strong> {ticket['subject']}
                                    </p>
                                </div>
                                
                                <h3 style="color: #888; margin: 25px 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Reply from {reply.sender_name}:</h3>
                                <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; border: 1px solid #3d3d3d;">
                                    <p style="margin: 0; color: #ffffff; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">{reply.message}</p>
                                </div>
                                
                                {cta_button}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; background-color: #1a1a1a; border-top: 1px solid #3d3d3d;">
                                <p style="margin: 0 0 10px; color: #666; font-size: 12px; text-align: center;">
                                    This is an automated message from MicLocker Support.
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
    
    text_body = f"""
MicLocker Support - Ticket Reply

{intro}

Ticket: {ticket['ticket_number']}
Subject: {ticket['subject']}

Reply from {reply.sender_name}:
{reply.message}

{"View message in your inbox: " + cta_url if show_cta else ""}

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
        logger.info(f"Ticket reply notification sent for {ticket['ticket_number']} to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send ticket reply notification: {e}")
        return False


async def send_password_setup_email(to_email: str, username: str, setup_token: str, role: str, frontend_url: str = None) -> bool:
    """
    Send email to new employee to set up their password
    
    Args:
        to_email: Employee email address
        username: Employee username
        setup_token: Password setup token
        role: Employee role (admin, manager, employee)
        frontend_url: Base URL for the frontend app (uses settings if not provided)
        
    Returns:
        True if email sent successfully, False otherwise
    """
    from config import settings
    if frontend_url is None:
        frontend_url = settings.frontend_url or "https://miclockerapp.com"
    
    if not email_service.client:
        logger.warning(f"SES client not available - logging setup token instead: {setup_token}")
        return False
    
    subject = "Welcome to MicLocker Team - Set Up Your Account"
    setup_url = f"{frontend_url}/employee-setup?token={setup_token}&email={to_email}"
    
    role_display = {
        "admin": "Administrator",
        "manager": "Manager",
        "employee": "Team Member"
    }.get(role, "Team Member")
    
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
                                <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px;">🎉 Welcome to the Team!</h2>
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                                    Hi <strong style="color: #FFD700;">{username}</strong>,
                                </p>
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px; line-height: 1.6;">
                                    You've been added to the MicLocker team as a <strong style="color: #FFD700;">{role_display}</strong>. 
                                    Please click the button below to set up your password and access your account.
                                </p>
                                
                                <!-- CTA Button -->
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="{setup_url}" style="display: inline-block; background-color: #FFD700; color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                                        🔐 Set Up Your Password
                                    </a>
                                </div>
                                
                                <p style="margin: 0 0 10px; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                    ⏰ This link will expire in <strong style="color: #FFD700;">7 days</strong>.
                                </p>
                                
                                <div style="background-color: #1a1a1a; border-radius: 8px; padding: 15px; margin-top: 20px;">
                                    <p style="margin: 0 0 8px; color: #888; font-size: 12px;">If the button doesn't work, copy and paste this link:</p>
                                    <p style="margin: 0; color: #FFD700; font-size: 12px; word-break: break-all;">{setup_url}</p>
                                </div>
                                
                                <p style="margin: 20px 0 0; color: #888; font-size: 14px; line-height: 1.6;">
                                    If you didn't expect this email or believe it was sent in error, please contact your administrator.
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
    
    text_body = f"""
Welcome to MicLocker Team!

Hi {username},

You've been added to the MicLocker team as a {role_display}. 
Please click the link below to set up your password and access your account:

{setup_url}

This link will expire in 7 days.

If you didn't expect this email or believe it was sent in error, please contact your administrator.

---
This is an automated message from MicLocker.
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
        
        message_id = response.get('MessageId', 'unknown')
        logger.info(f"Password setup email sent to {to_email} (MessageId: {message_id})")
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"Failed to send setup email to {to_email}: {error_code} - {error_message}")
        return False
        
    except Exception as e:
        logger.error(f"Unexpected error sending setup email to {to_email}: {e}")
        return False



async def send_seller_sale_notification_email(
    to_email: str,
    seller_username: str,
    order_number: str,
    buyer_username: str,
    items: list,
    shipping_address: dict,
    payout_amount: float
) -> bool:
    """
    Send email to seller when they make a sale
    """
    if not email_service.client or not to_email:
        logger.warning(f"Cannot send seller notification - SES not configured or no email")
        return False
    
    subject = f"🎉 You made a sale! Order #{order_number}"
    
    # Build items list
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #3d3d3d; color: #ffffff;">{item.get('listing_title', 'Item')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #3d3d3d; color: #FFD700; text-align: right;">${item.get('listing_price', 0):.2f}</td>
        </tr>
        """
    
    # Build shipping address
    addr = shipping_address
    shipping_html = f"""
    <p style="margin: 0; color: #cccccc; line-height: 1.6;">
        <strong>{addr.get('full_name', '')}</strong><br>
        {addr.get('address_line1', '')}<br>
        {f"{addr.get('address_line2')}<br>" if addr.get('address_line2') else ''}
        {addr.get('city', '')}, {addr.get('state', '')} {addr.get('postal_code', '')}<br>
        {addr.get('country', 'USA')}<br>
        {f"Phone: {addr.get('phone')}" if addr.get('phone') else ''}
    </p>
    """
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #3d3d3d;">
                        <tr>
                            <td style="padding: 30px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); text-align: center;">
                                <h1 style="margin: 0; color: #000000; font-size: 28px;">🎉 You Made a Sale!</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 30px 40px;">
                                <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                                    Hi <strong>{seller_username}</strong>,
                                </p>
                                
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px;">
                                    Congratulations! <strong style="color: #FFD700;">{buyer_username}</strong> just purchased from your shop.
                                </p>
                                
                                <div style="background-color: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 15px; color: #FFD700;">Order #{order_number}</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        {items_html}
                                    </table>
                                </div>
                                
                                <div style="background-color: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 15px; color: #FFD700;">📦 Ship To:</h3>
                                    {shipping_html}
                                </div>
                                
                                <div style="background-color: #1a4d1a; border: 1px solid #2d7a2d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                    <p style="margin: 0 0 5px; color: #90EE90; font-size: 14px;">Your Payout</p>
                                    <p style="margin: 0; color: #00FF00; font-size: 32px; font-weight: bold;">${payout_amount:.2f}</p>
                                </div>
                                
                                <div style="background-color: #4d4d1a; border: 1px solid #7a7a2d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h4 style="margin: 0 0 10px; color: #FFD700;">⚠️ Important: Funds Held</h4>
                                    <p style="margin: 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                        Your payment is being held until the buyer confirms delivery. Please ship the item promptly and add tracking information to your order.
                                    </p>
                                </div>
                                
                                <p style="margin: 20px 0; color: #888; font-size: 14px; text-align: center;">
                                    Log in to MicLocker to add tracking information and view order details.
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 30px 40px; background-color: #0d0d0d; border-top: 1px solid #3d3d3d; text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
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
    
    try:
        response = email_service.client.send_email(
            Source=email_service.sender_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f"Sent sale notification email to {to_email}, MessageId: {response['MessageId']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send sale notification email: {e}")
        return False


async def send_order_confirmation_email(
    to_email: str,
    buyer_username: str,
    order_number: str,
    items: list,
    shipping_address: dict,
    total: float
) -> bool:
    """
    Send order confirmation email to buyer
    """
    if not email_service.client or not to_email:
        logger.warning(f"Cannot send order confirmation - SES not configured or no email")
        return False
    
    subject = f"Order Confirmed! #{order_number}"
    
    # Build items list
    items_html = ""
    for item in items:
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #3d3d3d; color: #ffffff;">{item.get('listing_title', 'Item')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #3d3d3d; color: #FFD700; text-align: right;">${item.get('listing_price', 0):.2f}</td>
        </tr>
        """
    
    # Build shipping address
    addr = shipping_address
    shipping_html = f"""
    <p style="margin: 0; color: #cccccc; line-height: 1.6;">
        <strong>{addr.get('full_name', '')}</strong><br>
        {addr.get('address_line1', '')}<br>
        {f"{addr.get('address_line2')}<br>" if addr.get('address_line2') else ''}
        {addr.get('city', '')}, {addr.get('state', '')} {addr.get('postal_code', '')}<br>
        {addr.get('country', 'USA')}
    </p>
    """
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #3d3d3d;">
                        <tr>
                            <td style="padding: 30px 40px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); text-align: center;">
                                <h1 style="margin: 0; color: #000000; font-size: 28px;">✓ Order Confirmed!</h1>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 30px 40px;">
                                <p style="margin: 0 0 20px; color: #ffffff; font-size: 18px;">
                                    Hi <strong>{buyer_username}</strong>,
                                </p>
                                
                                <p style="margin: 0 0 20px; color: #cccccc; font-size: 16px;">
                                    Thank you for your purchase! Your order has been confirmed.
                                </p>
                                
                                <div style="background-color: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 15px; color: #FFD700;">Order #{order_number}</h3>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        {items_html}
                                        <tr>
                                            <td style="padding: 15px 10px 10px; color: #ffffff; font-weight: bold;">Total</td>
                                            <td style="padding: 15px 10px 10px; color: #FFD700; text-align: right; font-weight: bold; font-size: 18px;">${total:.2f}</td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <div style="background-color: #2d2d2d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 15px; color: #FFD700;">📦 Shipping To:</h3>
                                    {shipping_html}
                                </div>
                                
                                <p style="margin: 20px 0; color: #cccccc; font-size: 14px; line-height: 1.6;">
                                    The seller has been notified and will ship your item soon. You'll receive tracking information once available.
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <td style="padding: 30px 40px; background-color: #0d0d0d; border-top: 1px solid #3d3d3d; text-align: center;">
                                <p style="margin: 0; color: #666; font-size: 12px;">
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
    
    try:
        response = email_service.client.send_email(
            Source=email_service.sender_email,
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'}
                }
            }
        )
        logger.info(f"Sent order confirmation email to {to_email}, MessageId: {response['MessageId']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send order confirmation email: {e}")
        return False

