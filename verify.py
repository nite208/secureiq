import os
from dotenv import load_dotenv

load_dotenv()

print("Checking setup...\n")

# Check Groq
groq_key = os.getenv("GROQ_API_KEY")
if groq_key and groq_key.startswith("gsk_"):
    print("✓ Groq API key found")
else:
    print("✗ Groq API key missing or wrong")

# Check Telegram
tg_token = os.getenv("TELEGRAM_BOT_TOKEN")
tg_chat = os.getenv("TELEGRAM_CHAT_ID")
if tg_token and tg_chat:
    print("✓ Telegram credentials found")
else:
    print("✗ Telegram credentials missing")

# Check packages
try:
    import langchain, langgraph, chromadb
    import llama_index, fastapi, sklearn
    print("✓ All packages installed")
except ImportError as e:
    print(f"✗ Missing package: {e}")

# Test Groq connection
try:
    from langchain_groq import ChatGroq
    llm = ChatGroq(model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    response = llm.invoke("Say: SecureIQ is ready")
    print(f"✓ Groq connected: {response.content}")
except Exception as e:
    print(f"✗ Groq connection failed: {e}")

# Test Telegram
try:
    import httpx
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    r = httpx.post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        json={"chat_id": chat_id, "text": "✅ SecureIQ Phase 0 complete!"}
    )
    if r.json().get("ok"):
        print("✓ Telegram alert sent — check your phone!")
    else:
        print(f"✗ Telegram failed: {r.json()}")
except Exception as e:
    print(f"✗ Telegram error: {e}")

print("\nPhase 0 done if all ✓ above.")