import firebase_admin
from firebase_admin import credentials, messaging
from aiosmtplib import send
from email.message import EmailMessage
from core.config import settings

import json
import urllib.request
import urllib.error

# Initialize Firebase app if credentials exist
try:
    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)
    FIREBASE_INITIALIZED = True
except Exception as e:
    print(f"Warning: Firebase could not be initialized: {e}")
    FIREBASE_INITIALIZED = False

def send_expo_notification(token: str, title: str, body: str) -> bool:
    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = response.read()
            print(f"Expo push response: {res.decode('utf-8')}")
            return True
    except Exception as e:
        print(f"Failed to send Expo push notification: {e}")
        return False

def broadcast_expo_notification(tokens: list[str], title: str, body: str):
    if not tokens:
        return
    url = "https://exp.host/--/api/v2/push/send"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    # Expo supports batching up to 100 notifications per call
    payload = []
    for token in tokens:
        payload.append({
            "to": token,
            "title": title,
            "body": body,
            "sound": "default"
        })
        
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            res = response.read()
            print(f"Expo broadcast response: {res.decode('utf-8')}")
            return True
    except Exception as e:
        print(f"Failed to broadcast Expo push notification: {e}")
        return False

async def send_push_notification(token: str, title: str, body: str) -> bool:
    if token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken["):
        return send_expo_notification(token, title, body)

    if not FIREBASE_INITIALIZED:
        return False
        
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
    )
    try:
        messaging.send(message)
        return True
    except Exception as e:
        print(f"Failed to send push notification: {e}")
        return False

async def broadcast_notification(tokens: list[str], title: str, body: str):
    if not tokens:
        return
        
    expo_tokens = [t for t in tokens if t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")]
    fcm_tokens = [t for t in tokens if not (t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken["))]
    
    if expo_tokens:
        print(f"Sending broadcast to {len(expo_tokens)} Expo token(s)...")
        broadcast_expo_notification(expo_tokens, title, body)
        
    if fcm_tokens:
        if not FIREBASE_INITIALIZED:
            print("Cannot send FCM notifications: Firebase is not initialized")
            return
            
        print(f"Sending broadcast to {len(fcm_tokens)} FCM token(s)...")
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            tokens=fcm_tokens,
        )
        try:
            response = messaging.send_multicast(message)
            print(f"Successfully sent {response.success_count} messages via FCM")
        except Exception as e:
            print(f"Failed to broadcast FCM push notification: {e}")

async def send_email(to_email: str, subject: str, content: str) -> bool:
    message = EmailMessage()
    message["From"] = settings.EMAILS_FROM_EMAIL
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(content)
    
    try:
        await send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_TLS,
        )
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
