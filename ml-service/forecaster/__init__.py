import pandas as pd
from typing import List, Dict, Any


def forecast(history: List[Dict[str, Any]], periods: int = 3) -> Dict[str, Any]:
    """
    Takes monthly income/expense history and returns Prophet forecast.
    Falls back to simple moving average if Prophet fails or history is too short.
    """
    if len(history) < 3:
        return _simple_forecast(history, periods)

    try:
        return _prophet_forecast(history, periods)
    except Exception as e:
        return _simple_forecast(history, periods)


def _prophet_forecast(history: List[Dict], periods: int) -> Dict[str, Any]:
    from prophet import Prophet

    df_income = pd.DataFrame([
        {"ds": pd.to_datetime(h["month"] + "-01"), "y": h.get("income", 0)}
        for h in history
    ]).sort_values("ds")

    df_expense = pd.DataFrame([
        {"ds": pd.to_datetime(h["month"] + "-01"), "y": h.get("expense", 0)}
        for h in history
    ]).sort_values("ds")

    results = []
    for label, df in [("income", df_income), ("expense", df_expense)]:
        m = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            uncertainty_samples=100,
        )
        m.fit(df)
        future = m.make_future_dataframe(periods=periods, freq="MS")
        forecast_df = m.predict(future)
        predictions = forecast_df.tail(periods)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
        predictions["yhat"] = predictions["yhat"].clip(lower=0)
        predictions["yhat_lower"] = predictions["yhat_lower"].clip(lower=0)
        results.append((label, predictions))

    income_pred = results[0][1]
    expense_pred = results[1][1]

    forecast_months = []
    for i in range(periods):
        inc = float(income_pred.iloc[i]["yhat"])
        exp = float(expense_pred.iloc[i]["yhat"])
        profit = inc - exp
        forecast_months.append({
            "month": income_pred.iloc[i]["ds"].strftime("%Y-%m"),
            "predicted_income": round(inc, 2),
            "predicted_expense": round(exp, 2),
            "predicted_profit": round(profit, 2),
            "income_lower": round(float(income_pred.iloc[i]["yhat_lower"]), 2),
            "income_upper": round(float(income_pred.iloc[i]["yhat_upper"]), 2),
            "expense_lower": round(float(expense_pred.iloc[i]["yhat_lower"]), 2),
            "expense_upper": round(float(expense_pred.iloc[i]["yhat_upper"]), 2),
            "negative_cash_flow_risk": profit < 0,
        })

    return {
        "method": "prophet",
        "forecast": forecast_months,
        "history_months": len(history),
    }


def _simple_forecast(history: List[Dict], periods: int) -> Dict[str, Any]:
    """Moving average fallback when Prophet can't run."""
    recent = history[-3:] if len(history) >= 3 else history
    avg_income = sum(h.get("income", 0) for h in recent) / len(recent) if recent else 0
    avg_expense = sum(h.get("expense", 0) for h in recent) / len(recent) if recent else 0

    last_month = history[-1]["month"] if history else "2025-01"
    year, month = map(int, last_month.split("-"))

    forecast_months = []
    for i in range(1, periods + 1):
        m = month + i
        y = year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        profit = avg_income - avg_expense
        forecast_months.append({
            "month": f"{y:04d}-{m:02d}",
            "predicted_income": round(avg_income, 2),
            "predicted_expense": round(avg_expense, 2),
            "predicted_profit": round(profit, 2),
            "income_lower": round(avg_income * 0.8, 2),
            "income_upper": round(avg_income * 1.2, 2),
            "expense_lower": round(avg_expense * 0.8, 2),
            "expense_upper": round(avg_expense * 1.2, 2),
            "negative_cash_flow_risk": profit < 0,
        })

    return {
        "method": "moving_average",
        "forecast": forecast_months,
        "history_months": len(history),
    }
