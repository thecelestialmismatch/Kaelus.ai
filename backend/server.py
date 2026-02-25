from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'synqra-super-secret-key-2026')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Create the main app
app = FastAPI(title="SYNQRA API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    plan: str = "free"
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class AgentCreate(BaseModel):
    name: str
    description: str
    system_prompt: str
    model: str = "claude-opus-4-5-20251101"
    temperature: float = 0.7
    template: str = "custom"

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None

class AgentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: str
    system_prompt: str
    model: str
    temperature: float
    template: str
    created_at: str
    updated_at: str

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str
    thinking: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    agent_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    thinking: Optional[str] = None
    session_id: str

class ComplianceScanRequest(BaseModel):
    text: str

class ComplianceScanResult(BaseModel):
    risk_level: str
    findings: List[Dict[str, Any]]
    blocked: bool
    summary: str

class CheckoutRequest(BaseModel):
    plan: str
    origin_url: str

class CheckoutResponse(BaseModel):
    url: str
    session_id: str

# ==================== AUTH UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "plan": "free",
        "created_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email)
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        plan="free",
        created_at=now
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        plan=user.get("plan", "free"),
        created_at=user["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        plan=current_user.get("plan", "free"),
        created_at=current_user["created_at"]
    )

# ==================== AGENT ROUTES ====================

AGENT_TEMPLATES = {
    "code_assistant": {
        "name": "Code Assistant",
        "description": "Expert programming assistant for code review, debugging, and development",
        "system_prompt": "You are an expert software engineer with deep knowledge in multiple programming languages. Help users write clean, efficient, and well-documented code. Provide explanations for your suggestions and best practices."
    },
    "data_analyst": {
        "name": "Data Analyst",
        "description": "Analyze data, create insights, and help with statistical analysis",
        "system_prompt": "You are a skilled data analyst. Help users understand their data, perform statistical analysis, and create meaningful insights. Explain your methodology and findings clearly."
    },
    "customer_support": {
        "name": "Customer Support",
        "description": "Professional customer service agent for handling inquiries",
        "system_prompt": "You are a professional customer support agent. Be helpful, empathetic, and solution-oriented. Always maintain a friendly tone while efficiently resolving customer issues."
    },
    "content_writer": {
        "name": "Content Writer",
        "description": "Creative writer for blogs, marketing, and documentation",
        "system_prompt": "You are a talented content writer. Create engaging, well-structured content that resonates with the target audience. Adapt your writing style based on the content type and purpose."
    }
}

@api_router.get("/agents/templates")
async def get_agent_templates():
    return AGENT_TEMPLATES

@api_router.post("/agents", response_model=AgentResponse)
async def create_agent(agent_data: AgentCreate, current_user: dict = Depends(get_current_user)):
    agent_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    agent_doc = {
        "id": agent_id,
        "user_id": current_user["id"],
        "name": agent_data.name,
        "description": agent_data.description,
        "system_prompt": agent_data.system_prompt,
        "model": agent_data.model,
        "temperature": agent_data.temperature,
        "template": agent_data.template,
        "created_at": now,
        "updated_at": now
    }
    
    await db.agents.insert_one(agent_doc)
    return AgentResponse(**agent_doc)

@api_router.get("/agents", response_model=List[AgentResponse])
async def get_agents(current_user: dict = Depends(get_current_user)):
    agents = await db.agents.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    return [AgentResponse(**agent) for agent in agents]

@api_router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    agent = await db.agents.find_one(
        {"id": agent_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(**agent)

@api_router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, agent_data: AgentUpdate, current_user: dict = Depends(get_current_user)):
    agent = await db.agents.find_one({"id": agent_id, "user_id": current_user["id"]})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    update_data = {k: v for k, v in agent_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.agents.update_one({"id": agent_id}, {"$set": update_data})
    
    updated_agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    return AgentResponse(**updated_agent)

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.agents.delete_one({"id": agent_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted successfully"}

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    session_id = request.session_id or str(uuid.uuid4())
    
    # Get agent configuration if specified
    system_message = "You are SYNQRA, a powerful AI assistant. Be helpful, accurate, and thoughtful in your responses. When solving complex problems, think step by step."
    model = "claude-opus-4-5-20251101"
    
    if request.agent_id:
        agent = await db.agents.find_one({"id": request.agent_id, "user_id": current_user["id"]})
        if agent:
            system_message = agent["system_prompt"]
            model = agent.get("model", model)
    
    # Get conversation history
    history = await db.chat_history.find(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(50)
    
    # Initialize chat with Claude Opus and extended thinking
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message
    ).with_model("anthropic", model)
    
    # Add history to chat context
    for msg in history:
        if msg["role"] == "user":
            await chat.send_message(UserMessage(text=msg["content"]))
    
    # Send current message
    user_message = UserMessage(text=request.message)
    response_text = await chat.send_message(user_message)
    
    # Extract thinking if present (simulated for now as extended thinking visualization)
    thinking = None
    if "think" in request.message.lower() or "analyze" in request.message.lower() or "explain" in request.message.lower():
        thinking = f"Analyzing the request: '{request.message[:100]}...'\nConsidering multiple approaches and best practices.\nFormulating a comprehensive response."
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Save user message
    await db.chat_history.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": current_user["id"],
        "role": "user",
        "content": request.message,
        "timestamp": now
    })
    
    # Save assistant response
    await db.chat_history.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": current_user["id"],
        "role": "assistant",
        "content": response_text,
        "thinking": thinking,
        "timestamp": now
    })
    
    # Update analytics
    await db.analytics.update_one(
        {"user_id": current_user["id"], "date": now[:10]},
        {"$inc": {"chat_messages": 1, "tokens_used": len(request.message) + len(response_text)}},
        upsert=True
    )
    
    return ChatResponse(response=response_text, thinking=thinking, session_id=session_id)

@api_router.get("/chat/sessions")
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$group": {
            "_id": "$session_id",
            "last_message": {"$last": "$content"},
            "message_count": {"$sum": 1},
            "updated_at": {"$max": "$timestamp"}
        }},
        {"$sort": {"updated_at": -1}},
        {"$limit": 20}
    ]
    sessions = await db.chat_history.aggregate(pipeline).to_list(20)
    return [{"session_id": s["_id"], "last_message": s["last_message"][:50], "message_count": s["message_count"], "updated_at": s["updated_at"]} for s in sessions]

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.chat_history.find(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return messages

@api_router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    await db.chat_history.delete_many({"session_id": session_id, "user_id": current_user["id"]})
    return {"message": "Session deleted"}

# ==================== COMPLIANCE FIREWALL ====================

COMPLIANCE_PATTERNS = {
    "email": {
        "pattern": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "risk": "MEDIUM",
        "category": "PII",
        "description": "Email address detected"
    },
    "phone": {
        "pattern": r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b',
        "risk": "MEDIUM",
        "category": "PII",
        "description": "Phone number detected"
    },
    "ssn": {
        "pattern": r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b',
        "risk": "CRITICAL",
        "category": "PII",
        "description": "Social Security Number detected"
    },
    "credit_card": {
        "pattern": r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b',
        "risk": "CRITICAL",
        "category": "FINANCIAL",
        "description": "Credit card number detected"
    },
    "api_key": {
        "pattern": r'\b(?:sk[-_]|api[-_]?key[-_]?|secret[-_]?|password[-_]?)[a-zA-Z0-9]{16,}\b',
        "risk": "HIGH",
        "category": "SECRET",
        "description": "API key or secret detected"
    },
    "aws_key": {
        "pattern": r'\bAKIA[0-9A-Z]{16}\b',
        "risk": "CRITICAL",
        "category": "SECRET",
        "description": "AWS Access Key detected"
    },
    "private_key": {
        "pattern": r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----',
        "risk": "CRITICAL",
        "category": "SECRET",
        "description": "Private key detected"
    },
    "ip_address": {
        "pattern": r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b',
        "risk": "LOW",
        "category": "INFRASTRUCTURE",
        "description": "IP address detected"
    },
    "bank_account": {
        "pattern": r'\b[0-9]{8,17}\b.*(?:routing|account|iban|swift)',
        "risk": "HIGH",
        "category": "FINANCIAL",
        "description": "Bank account information detected"
    },
    "passport": {
        "pattern": r'\b[A-Z]{1,2}[0-9]{6,9}\b',
        "risk": "HIGH",
        "category": "PII",
        "description": "Passport number pattern detected"
    }
}

@api_router.post("/compliance/scan", response_model=ComplianceScanResult)
async def scan_compliance(request: ComplianceScanRequest, current_user: dict = Depends(get_current_user)):
    findings = []
    text = request.text
    
    for name, config in COMPLIANCE_PATTERNS.items():
        matches = re.findall(config["pattern"], text, re.IGNORECASE)
        if matches:
            for match in matches[:5]:  # Limit to 5 matches per pattern
                findings.append({
                    "type": name,
                    "category": config["category"],
                    "risk": config["risk"],
                    "description": config["description"],
                    "match": match[:20] + "..." if len(match) > 20 else match
                })
    
    # Determine overall risk level
    risk_levels = [f["risk"] for f in findings]
    if "CRITICAL" in risk_levels:
        overall_risk = "CRITICAL"
        blocked = True
    elif "HIGH" in risk_levels:
        overall_risk = "HIGH"
        blocked = True
    elif "MEDIUM" in risk_levels:
        overall_risk = "MEDIUM"
        blocked = False
    elif "LOW" in risk_levels:
        overall_risk = "LOW"
        blocked = False
    else:
        overall_risk = "SAFE"
        blocked = False
    
    # Log scan
    await db.compliance_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "risk_level": overall_risk,
        "findings_count": len(findings),
        "blocked": blocked,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Update analytics
    await db.analytics.update_one(
        {"user_id": current_user["id"], "date": datetime.now(timezone.utc).isoformat()[:10]},
        {"$inc": {"compliance_scans": 1, "blocked_count": 1 if blocked else 0}},
        upsert=True
    )
    
    summary = f"Found {len(findings)} potential data leak(s)" if findings else "No sensitive data detected"
    
    return ComplianceScanResult(
        risk_level=overall_risk,
        findings=findings,
        blocked=blocked,
        summary=summary
    )

@api_router.get("/compliance/logs")
async def get_compliance_logs(current_user: dict = Depends(get_current_user)):
    logs = await db.compliance_logs.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)
    return logs

# ==================== ANALYTICS ====================

@api_router.get("/analytics/stats")
async def get_analytics_stats(current_user: dict = Depends(get_current_user)):
    # Get agent count
    agent_count = await db.agents.count_documents({"user_id": current_user["id"]})
    
    # Get chat session count
    chat_sessions = await db.chat_history.distinct("session_id", {"user_id": current_user["id"]})
    
    # Get total messages
    message_count = await db.chat_history.count_documents({"user_id": current_user["id"]})
    
    # Get compliance scans
    scan_count = await db.compliance_logs.count_documents({"user_id": current_user["id"]})
    blocked_count = await db.compliance_logs.count_documents({"user_id": current_user["id"], "blocked": True})
    
    return {
        "agents": agent_count,
        "chat_sessions": len(chat_sessions),
        "messages": message_count,
        "compliance_scans": scan_count,
        "threats_blocked": blocked_count
    }

@api_router.get("/analytics/activity")
async def get_analytics_activity(current_user: dict = Depends(get_current_user)):
    # Get last 7 days activity
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=7)
    
    pipeline = [
        {"$match": {
            "user_id": current_user["id"],
            "date": {"$gte": start_date.isoformat()[:10], "$lte": end_date.isoformat()[:10]}
        }},
        {"$sort": {"date": 1}}
    ]
    
    activity = await db.analytics.aggregate(pipeline).to_list(7)
    
    # Fill in missing days
    result = []
    for i in range(7):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        day_data = next((a for a in activity if a.get("date") == date), None)
        result.append({
            "date": date,
            "day": (start_date + timedelta(days=i)).strftime("%a"),
            "messages": day_data.get("chat_messages", 0) if day_data else 0,
            "scans": day_data.get("compliance_scans", 0) if day_data else 0
        })
    
    return result

# ==================== PAYMENTS ====================

PRICING_PLANS = {
    "free": {"price": 0.0, "name": "Free", "features": ["1 Agent", "100 Messages/mo", "Basic Compliance"]},
    "pro": {"price": 49.0, "name": "Pro", "features": ["10 Agents", "Unlimited Messages", "Advanced Compliance", "Priority Support"]},
    "enterprise": {"price": 299.0, "name": "Enterprise", "features": ["Unlimited Agents", "Unlimited Messages", "Full Compliance Suite", "Dedicated Support", "Custom Integrations"]}
}

@api_router.get("/pricing")
async def get_pricing():
    return PRICING_PLANS

@api_router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(request: CheckoutRequest, http_request: Request, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    if request.plan not in PRICING_PLANS or request.plan == "free":
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    plan = PRICING_PLANS[request.plan]
    
    host_url = str(http_request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{request.origin_url}/dashboard?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/pricing"
    
    checkout_request = CheckoutSessionRequest(
        amount=plan["price"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": current_user["id"],
            "plan": request.plan,
            "user_email": current_user["email"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "plan": request.plan,
        "amount": plan["price"],
        "currency": "usd",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return CheckoutResponse(url=session.url, session_id=session.session_id)

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    host_url = "https://synqra.preview.emergentagent.com"
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and user plan if paid
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$set": {"plan": transaction["plan"]}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == "paid":
            metadata = event.metadata
            user_id = metadata.get("user_id")
            plan = metadata.get("plan")
            
            if user_id and plan:
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {"plan": plan}}
                )
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== HEALTH & STATUS ====================

@api_router.get("/")
async def root():
    return {"message": "SYNQRA API v1.0", "status": "operational"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
