# MicLocker AI Chatbot Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Stateless)                      │
│  ┌──────────────────┐                ┌──────────────────┐   │
│  │ Custom Widget    │  OR            │ Crisp Widget     │   │
│  │ (ChatWidget.js)  │  ──────────►   │ (Third-party)    │   │
│  └────────┬─────────┘                └────────┬─────────┘   │
│           │                                   │             │
│           │ POST /api/chatbot/message         │ Webhook     │
│           ▼                                   ▼             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Stateful)                        │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ Conversation   │  │ Context        │  │ AI Service    │  │
│  │ Service        │  │ Service        │  │ (OpenAI)      │  │
│  │                │  │                │  │               │  │
│  │ • History      │  │ • Business     │  │ • LLM Calls   │  │
│  │ • State        │  │   Rules        │  │ • Prompts     │  │
│  │ • Logging      │  │ • User Context │  │ • Memory      │  │
│  └────────────────┘  └────────────────┘  └───────────────┘  │
│                           │                                  │
│                           ▼                                  │
│                    ┌──────────────┐                         │
│                    │   MongoDB    │                         │
│                    │ Conversations│                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Key Principle: **Stateless UI, Stateful Backend**

- **The UI can change** - Swap between custom widget, Crisp, Intercom, etc.
- **The intelligence persists** - All logic, memory, and business rules stay in the backend

---

## Current Implementation (Custom Widget)

The current implementation uses a custom React widget (`/frontend/src/components/ChatWidget.js`) that:
- Generates/stores a session ID in localStorage
- Sends messages to `/api/chatbot/message`
- Displays AI responses with quick reply buttons
- Handles escalation to human agents

---

## Integrating with Crisp

### Step 1: Create a Crisp Account
1. Go to [crisp.chat](https://crisp.chat) and sign up
2. Create a new website/inbox
3. Get your Website ID from Settings → Website Settings

### Step 2: Add Crisp Script to MicLocker
Replace or disable the custom ChatWidget and add Crisp's script to `public/index.html`:

```html
<script type="text/javascript">
  window.$crisp=[];
  window.CRISP_WEBSITE_ID="YOUR_WEBSITE_ID";
  (function(){
    d=document;s=d.createElement("script");
    s.src="https://client.crisp.chat/l.js";
    s.async=1;d.getElementsByTagName("head")[0].appendChild(s);
  })();
</script>
```

### Step 3: Set Up Crisp Webhook
1. In Crisp Dashboard, go to Settings → Integrations → Webhooks
2. Create a webhook pointing to: `https://your-domain.com/api/chatbot/crisp-webhook`
3. Select events: `message:send` (when user sends a message)

### Step 4: Create Webhook Endpoint
Add this endpoint to `/backend/chatbot/routes/chatbot.py`:

```python
@router.post("/crisp-webhook")
async def crisp_webhook(request: Request):
    """Handle incoming Crisp messages and respond with AI"""
    data = await request.json()
    
    # Extract message from Crisp webhook payload
    event = data.get("event")
    if event != "message:send":
        return {"status": "ignored"}
    
    session_id = data.get("data", {}).get("session_id")
    message = data.get("data", {}).get("content")
    user_email = data.get("data", {}).get("user", {}).get("email")
    
    # Process through our AI backend
    chat_request = ChatRequest(
        session_id=f"crisp_{session_id}",
        message=message,
        source="crisp"
    )
    
    # Get AI response
    response = await send_message(chat_request, None)
    
    # Send response back to Crisp via their API
    await send_crisp_message(session_id, response.message)
    
    return {"status": "ok"}
```

### Step 5: Send Responses to Crisp
Use Crisp's REST API to send the AI response back:

```python
import httpx

async def send_crisp_message(session_id: str, message: str):
    """Send a message to Crisp conversation"""
    CRISP_ID = os.getenv("CRISP_ID")
    CRISP_KEY = os.getenv("CRISP_KEY")
    WEBSITE_ID = os.getenv("CRISP_WEBSITE_ID")
    
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.crisp.chat/v1/website/{WEBSITE_ID}/conversation/{session_id}/message",
            auth=(CRISP_ID, CRISP_KEY),
            json={
                "type": "text",
                "from": "operator",
                "origin": "chat",
                "content": message
            }
        )
```

---

## API Reference

### POST /api/chatbot/message
Send a message and receive AI response.

**Request:**
```json
{
  "session_id": "unique_session_id",
  "message": "User's message",
  "user_id": "optional_user_id",
  "source": "web_widget",
  "context": {
    "page": "/current/path"
  }
}
```

**Response:**
```json
{
  "session_id": "unique_session_id",
  "message": "AI response text",
  "conversation_id": "uuid",
  "intent": "order_inquiry",
  "suggested_actions": [
    {"label": "Button text", "value": "Message to send"}
  ],
  "escalate_to_human": false,
  "metadata": {}
}
```

### GET /api/chatbot/conversation/{session_id}
Get conversation history for a session.

### POST /api/chatbot/resolve/{session_id}
Mark a conversation as resolved.

### GET /api/chatbot/admin/stats
Get chatbot analytics (admin only).

### GET /api/chatbot/admin/conversations
List all conversations (admin only).

---

## Business Logic (Context Service)

The AI is configured with MicLocker-specific knowledge in `/backend/chatbot/services/context_service.py`:

- **Return Policy**: 7-day returns, seller pays if item not as described
- **Fees**: 3% platform fee, 3.19% + $0.49 payment processing
- **Support Hours**: Mon-Fri 3:30am-9pm CT, Sat-Sun 8:30am-4:30pm CT
- **Intent Detection**: Automatically detects order inquiries, refund requests, account help, etc.
- **Escalation Rules**: Automatically escalates frustrated users or complex issues

---

## Extending the Chatbot

### Adding New Intents
Edit `context_service.py` → `detect_intent()`:

```python
if any(word in message_lower for word in ["warranty", "guarantee"]):
    return "warranty_inquiry"
```

### Adding Quick Reply Actions
Edit `context_service.py` → `get_suggested_actions()`:

```python
"warranty_inquiry": [
    {"label": "Check warranty", "value": "What's my warranty status?"},
    {"label": "File a claim", "value": "I need to file a warranty claim"}
]
```

### Updating Business Rules
Edit the `SYSTEM_PROMPT` in `context_service.py` to update the AI's knowledge base.

---

## MongoDB Collections

### chatbot_conversations
```javascript
{
  id: "uuid",
  session_id: "external_session_id",
  user_id: "optional_miclocker_user_id",
  messages: [
    { role: "user", content: "...", timestamp: "...", metadata: {} },
    { role: "assistant", content: "...", timestamp: "...", metadata: {} }
  ],
  status: "active|resolved|escalated|abandoned",
  detected_intent: "order_inquiry",
  escalated_to_human: false,
  source: "web_widget|crisp|api",
  started_at: "datetime",
  last_activity: "datetime"
}
```

---

## Environment Variables

```env
# Required for AI
EMERGENT_LLM_KEY=sk-emergent-xxx

# Optional for Crisp integration
CRISP_WEBSITE_ID=your_website_id
CRISP_ID=your_crisp_identifier
CRISP_KEY=your_crisp_api_key
```

---

## Future Enhancements

1. **Vector Search**: Use embeddings to search product catalog during conversations
2. **Order Lookup**: Automatically fetch order status when user provides order ID
3. **Handoff to Human**: Integrate with Crisp's operator features for seamless escalation
4. **Analytics Dashboard**: Build UI to view chatbot metrics and conversation logs
5. **Multi-language**: Add translation layer for international users
