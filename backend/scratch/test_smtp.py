import asyncio
import aiosmtplib
from email.message import EmailMessage
import os
from dotenv import load_dotenv

async def test_email():
    load_dotenv()
    
    host = "smtp.gmail.com"
    port = 587
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    
    print(f"Testing with User: {user}")
    print(f"Testing with Password: {'*' * len(password) if password else 'None'}")

    message = EmailMessage()
    message["From"] = user
    message["To"] = user # Send to self
    message["Subject"] = "SMTP Test"
    message.set_content("This is a test email from the Coding Junction diagnostic tool.")
    
    try:
        await aiosmtplib.send(
            message,
            hostname=host,
            port=port,
            username=user,
            password=password,
            use_tls=False,
            start_tls=True,
        )
        print("✅ SUCCESS: Email sent successfully!")
    except Exception as e:
        print(f"❌ FAILURE: {e}")

if __name__ == "__main__":
    asyncio.run(test_email())
