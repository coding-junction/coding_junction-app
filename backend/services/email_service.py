import resend
import asyncio
from core.config import settings
import random
import string
from typing import List

# Initialize Resend
if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY

def _email_sender() -> str:
    # Resend usually requires a verified domain. 
    # If not set, it uses "onboarding@resend.dev" for testing.
    # Format: "Coding Junction <no-reply@coding-junction.in>"
    return f"{settings.PROJECT_NAME} <{settings.EMAILS_FROM_EMAIL}>" if settings.EMAILS_FROM_EMAIL else "onboarding@resend.dev"

async def _send_email_resend(to: str, subject: str, html_content: str):
    if not settings.RESEND_API_KEY:
        print("RESEND_API_KEY not set. Email not sent.")
        return

    params = {
        "from": _email_sender(),
        "to": to,
        "subject": subject,
        "html": html_content,
    }

    try:
        # resend.Emails.send is synchronous, run in thread to avoid blocking
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception as e:
        print(f"Resend Error: {e}")
        raise

async def send_otp_email(email_to: str, otp_code: str, purpose: str = "registration"):
    subject = "Coding Junction - Verification Code"
    title = "Verify Your Account"
    body_text = "Your verification code is listed below. Please enter this code in the application to complete your verification."
    expiry_text = "This code will expire in 10 minutes."

    if purpose == "registration":
        subject = "Coding Junction - Account Verification Code"
        title = "Verify Your Coding Junction Account"
        body_text = "Thank you for registering at Coding Junction! To activate your student account, please verify your email address using the following verification code:"
    elif purpose == "email_change":
        subject = "Coding Junction - Email Change Verification"
        title = "Verify Your Email Address Change"
        body_text = "We received a request to update the email address associated with your Coding Junction profile. Please use this verification code to complete the transition:"
    elif purpose == "password_change":
        subject = "Coding Junction - Password Change Security Code"
        title = "Verify Your Password Reset Request"
        body_text = "A security request was made to update your account password. Please enter the verification code below to authorize the change:"
    elif purpose.startswith("admin_action_"):
        action = purpose.replace("admin_action_", "")
        subject = "Coding Junction Admin - Authorization Code"
        title = "Authorize Admin Action"
        expiry_text = "This authorization code will expire in 5 minutes."
        
        action_names = {
            "promote_admin": "Promoting a User to Admin",
            "promote_core": "Promoting a User to Core Member",
            "demote_core": "Demoting a User to Core Member",
            "demote_student": "Demoting a User to Student",
            "delete_user": "Deleting a User Profile",
            "edit_user": "Editing User Details"
        }
        action_desc = action_names.get(action, action.replace("_", " ").title())
        body_text = f"You are initiating a critical administrative task: <b>{action_desc}</b>. Enter the security code below to authorize this action:"

    html_content = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 24px; font-weight: bold; color: #6200EE;">Coding Junction</span>
        </div>
        <div style="border-top: 4px solid #6200EE; padding-top: 20px;">
            <h2 style="color: #6200EE; font-size: 20px; margin-top: 0; font-weight: 600;">{title}</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #4A4A4A;">
                {body_text}
            </p>
            <div style="background: #F8F9FA; border: 1px dashed #6200EE; padding: 20px; font-size: 28px; font-weight: bold; letter-spacing: 5px; text-align: center; border-radius: 8px; color: #6200EE; margin: 25px 0;">
                {otp_code}
            </div>
            <p style="font-size: 14px; color: #888888; text-align: center; margin-bottom: 20px;">
                {expiry_text}
            </p>
            <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 25px 0 20px 0;" />
            <p style="font-size: 12px; color: #888888; text-align: center; margin-bottom: 0;">
                If you did not initiate this request, please ignore this email or contact support if you suspect unauthorized activity.
            </p>
        </div>
    </div>
    """

    try:
        await _send_email_resend(email_to, subject, html_content)
        print(f"OTP sent to {email_to}")
    except Exception as e:
        print(f"Failed to send OTP to {email_to}: {e}")
        print(f"\n========================================\nDEVELOPMENT OTP FOR {email_to}: {otp_code}\n========================================\n")

async def send_welcome_email(email_to: str, full_name: str):
    subject = "Welcome to Coding Junction!"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6200EE;">Hello {full_name},</h2>
        <p>Welcome to <b>Coding Junction</b>! Your email has been successfully verified.</p>
        <p>You can now participate in events, quizzes, and polls.</p>
        <p>Happy Coding!</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Coding Junction Team</p>
    </div>
    """

    try:
        await _send_email_resend(email_to, subject, html_content)
        print(f"Welcome email sent to {email_to}")
    except Exception as e:
        print(f"Failed to send welcome email to {email_to}: {e}")

async def send_role_change_email(email_to: str, target_name: str, new_role: str, admin_name: str):
    role_mapping = {
        "admin": "Administrator",
        "core_member": "Core Member",
        "student": "Student"
    }
    role_title = role_mapping.get(new_role, new_role.replace("_", " ").title())
    
    subject = f"Congratulations! You have been promoted to {role_title}"
    title = f"Role Promotion: {role_title}"
    congrats_message = ""
    features_list = ""
    
    if new_role == "admin":
        congrats_message = f"We are thrilled to inform you that you have been promoted to the role of <b>{role_title}</b> by Admin <b>{admin_name}</b>. Thank you for your leadership and contributions to the community!"
        features_list = """
        <li>Access to the Admin Hub to manage users, events, quizzes, and polls</li>
        <li>Full creation and deletion authorization for all community content</li>
        <li>Ability to review and verify student identity documents</li>
        """
    elif new_role == "core_member":
        congrats_message = f"We are thrilled to inform you that you have been promoted to the role of <b>{role_title}</b> by Admin <b>{admin_name}</b>. Welcome to the Core Committee!"
        features_list = """
        <li>Access to the Core Hub dashboard</li>
        <li>Ability to create and manage your own events, quizzes, and polls</li>
        <li>Collaborative features to drive student engagement</li>
        """
    else:
        subject = f"Coding Junction - Role Update Notice"
        title = "Role Update Notification"
        congrats_message = f"Please be notified that your role on Coding Junction has been updated to <b>{role_title}</b> by Admin <b>{admin_name}</b>."
        features_list = """
        <li>Access to the standard student dashboard</li>
        <li>Participation in events, quizzes, and polls hosted by the community</li>
        """

    html_content = f"""
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 24px; font-weight: bold; color: #6200EE;">Coding Junction</span>
        </div>
        <div style="border-top: 4px solid #6200EE; padding-top: 20px;">
            <h2 style="color: #6200EE; font-size: 22px; margin-top: 0; font-weight: 600;">{title}</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #4A4A4A;">
                Hello {target_name},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #4A4A4A;">
                {congrats_message}
            </p>
            <div style="background-color: #F8F9FA; border-left: 4px solid #6200EE; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <h4 style="margin-top: 0; margin-bottom: 10px; color: #333333; font-size: 15px;">Your Access & Features:</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #555555;">
                    {features_list}
                </ul>
            </div>
            <p style="font-size: 15px; line-height: 1.6; color: #4A4A4A;">
                If you have any questions about your role or permissions, please feel free to reach out to the administrative team.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #4A4A4A; margin-bottom: 0;">
                Best regards,<br>
                <b>Coding Junction Team</b>
            </p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0 15px 0;" />
        <div style="text-align: center; font-size: 12px; color: #888888;">
            This is an automated notification from Coding Junction. Please do not reply directly to this email.
        </div>
    </div>
    """

    try:
        await _send_email_resend(email_to, subject, html_content)
        print(f"Role change notification sent to {email_to}")
    except Exception as e:
        print(f"Failed to send role change notification to {email_to}: {e}")

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def broadcast_event_email(emails: List[str], event_name: str, event_description: str, start_date: str, creator_email: str = None):
    if not settings.RESEND_API_KEY or not emails:
        return
        
    subject = f"New Event: {event_name}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #6200EE;">New Event Announcement!</h2>
        <h3>{event_name}</h3>
        <p><b>Starts:</b> {start_date}</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
            <p>{event_description or 'Join us for this exciting new event!'}</p>
        </div>
        <p>Open the Coding Junction app to view more details and register.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Coding Junction Team</p>
    </div>
    """
    
    # Send in chunks of 50 using BCC to respect Resend limits
    chunk_size = 50
    for i in range(0, len(emails), chunk_size):
        chunk = emails[i:i + chunk_size]
        params = {
            "from": _email_sender(),
            "to": creator_email or _email_sender(), # Send to creator or self
            "bcc": chunk,
            "subject": subject,
            "html": html_content,
        }
        for attempt in range(3):
            try:
                await asyncio.to_thread(resend.Emails.send, params)
                # Add a 1.0s delay to stay well under Resend's limit and avoid rate blocks
                await asyncio.sleep(1.0)
                break
            except Exception as e:
                print(f"Failed to broadcast event chunk (attempt {attempt + 1}/3): {e}")
                if attempt < 2:
                    await asyncio.sleep(5.0) # Wait 5 seconds before retrying
                else:
                    print(f"Failed to send chunk to: {chunk}")