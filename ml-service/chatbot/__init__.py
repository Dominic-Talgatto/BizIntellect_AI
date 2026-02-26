import os
from typing import List, Dict, Any, Optional


def chat(message: str, context: List[Dict[str, Any]], history: Optional[List[Dict]] = None) -> dict:
    """
    Sends user message to OpenAI with financial context injected as system prompt.
    Falls back to rule-based response if OpenAI is unavailable.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key == "your-openai-api-key-here":
        return _rule_based_response(message, context)

    try:
        return _openai_response(message, context, history or [], api_key)
    except Exception as e:
        return _rule_based_response(message, context)


def _build_context_prompt(context: List[Dict[str, Any]]) -> str:
    if not context:
        return "The user has no transaction data yet."

    lines = ["User's recent financial data (last 3 months):"]
    total_income = 0
    total_expense = 0
    for item in context:
        income = item.get("income", 0)
        expense = item.get("expense", 0)
        profit = income - expense
        total_income += income
        total_expense += expense
        lines.append(
            f"  - {item['month']}: Income={income:.2f}, Expenses={expense:.2f}, Profit={profit:.2f}"
        )

    net = total_income - total_expense
    lines.append(f"\nTotal: Income={total_income:.2f}, Expenses={total_expense:.2f}, Net={net:.2f}")
    return "\n".join(lines)


def _openai_response(message: str, context: List[Dict], history: List[Dict], api_key: str) -> dict:
    # import openai dynamically to avoid static import errors in editors/linters
    try:
        import importlib
        openai_mod = importlib.import_module("openai")
        OpenAI = getattr(openai_mod, "OpenAI")
    except Exception:
        # If openai isn't available, fall back to the rule-based responder.
        return _rule_based_response(message, context)

    client = OpenAI(api_key=api_key)
    system_prompt = f"""You are FinSight AI, a smart financial advisor for small and medium businesses.
You help business owners understand their finances, reduce costs, and grow profits.
Be concise, practical, and friendly. Use bullet points where helpful.

{_build_context_prompt(context)}"""

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        messages.append(h)
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=500,
        temperature=0.7,
    )

    reply = response.choices[0].message.content
    return {
        "reply": reply,
        "model": "gpt-4o-mini",
        "tokens_used": response.usage.total_tokens,
    }


def _rule_based_response(message: str, context: List[Dict]) -> dict:
    msg = message.lower()
    context_summary = _build_context_prompt(context)

    if any(w in msg for w in ["profit", "прибыль", "earn"]):
        reply = "Based on your data:\n\n" + context_summary + "\n\nTo improve profit, focus on reducing the highest expense categories and growing recurring income streams."
    elif any(w in msg for w in ["expense", "cost", "расход", "reduce"]):
        reply = "To reduce costs:\n• Review subscriptions and cancel unused ones\n• Negotiate better rates with suppliers\n• Track daily expenses more carefully\n\n" + context_summary
    elif any(w in msg for w in ["forecast", "predict", "прогноз"]):
        reply = "Check the Forecast page for AI-powered predictions of your next 3 months of income and expenses, including risk alerts for negative cash flow."
    elif any(w in msg for w in ["tax", "налог"]):
        reply = "Visit the Tax page to see your estimated tax liability, quarterly payment schedule, and optimization tips based on your actual transactions."
    elif any(w in msg for w in ["hello", "hi", "привет", "help"]):
        reply = "Hello! I'm FinSight AI, your financial advisor.\n\nYou can ask me about:\n• Your profit and loss trends\n• How to reduce expenses\n• Cash flow forecasts\n• Tax optimization\n• Any financial question about your business!"
    else:
        reply = "I can help you analyze your business finances. Try asking:\n• 'How is my profit trending?'\n• 'How can I reduce costs?'\n• 'What's my tax estimate?'\n• 'Should I hire another employee?'"

    return {
        "reply": reply,
        "model": "rule-based",
        "tokens_used": 0,
    }
