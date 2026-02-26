import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI(title="FinSight ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ──────────────────────────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    description: str

class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    scores: Dict[str, float]


class MonthData(BaseModel):
    month: str
    income: float = 0
    expense: float = 0

class ForecastRequest(BaseModel):
    history: List[MonthData]
    periods: int = 3

class ForecastMonth(BaseModel):
    month: str
    predicted_income: float
    predicted_expense: float
    predicted_profit: float
    income_lower: float
    income_upper: float
    expense_lower: float
    expense_upper: float
    negative_cash_flow_risk: bool

class ForecastResponse(BaseModel):
    method: str
    forecast: List[ForecastMonth]
    history_months: int


class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    context: List[MonthData] = []
    history: List[ChatMessage] = []
    user_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    model: str
    tokens_used: int


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "FinSight ML"}


@app.post("/classify", response_model=ClassifyResponse)
def classify_expense(req: ClassifyRequest):
    try:
        from classifier import classify
        result = classify(req.description)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/forecast", response_model=ForecastResponse)
def forecast_cashflow(req: ForecastRequest):
    try:
        from forecaster import forecast
        history = [h.model_dump() for h in req.history]
        result = forecast(history, periods=req.periods)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ocr")
async def ocr_receipt(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        from ocr import extract_receipt_data
        result = extract_receipt_data(contents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    try:
        from chatbot import chat
        context = [c.model_dump() for c in req.context]
        history = [{"role": h.role, "content": h.content} for h in req.history]
        result = chat(req.message, context, history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
