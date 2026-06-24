import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from services.ai_service import generate_response

async def test():
    print("Testing AI Service...")
    response = await generate_response("Hello, what is Coding Junction?")
    print(f"Response: {response}")

if __name__ == "__main__":
    asyncio.run(test())
