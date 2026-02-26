package dashboard

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

type Summary struct {
	TotalIncome   float64 `json:"total_income"`
	TotalExpenses float64 `json:"total_expenses"`
	Profit        float64 `json:"profit"`
	Period        string  `json:"period"`
}

type CategoryBreakdown struct {
	Category string  `json:"category"`
	Amount   float64 `json:"amount"`
	Count    int     `json:"count"`
	Percent  float64 `json:"percent"`
}

type CashFlowPoint struct {
	Date    string  `json:"date"`
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Balance float64 `json:"balance"`
}

func (r *Repository) GetSummary(ctx context.Context, userID int, from, to time.Time) (*Summary, error) {
	query := `
	SELECT
		COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
		COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses
	FROM transactions
	WHERE user_id = $1 AND date BETWEEN $2 AND $3`

	var s Summary
	err := r.db.QueryRow(ctx, query, userID, from, to).Scan(&s.TotalIncome, &s.TotalExpenses)
	if err != nil {
		return nil, err
	}
	s.Profit = s.TotalIncome - s.TotalExpenses
	s.Period = from.Format("2006-01-02") + " / " + to.Format("2006-01-02")
	return &s, nil
}

func (r *Repository) GetCategoryBreakdown(ctx context.Context, userID int, from, to time.Time, txType string) ([]CategoryBreakdown, error) {
	query := `
	SELECT category, SUM(amount) AS amount, COUNT(*) AS cnt
	FROM transactions
	WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND type = $4
	GROUP BY category
	ORDER BY amount DESC`

	rows, err := r.db.Query(ctx, query, userID, from, to, txType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []CategoryBreakdown
	var totalAmount float64
	for rows.Next() {
		var c CategoryBreakdown
		if err := rows.Scan(&c.Category, &c.Amount, &c.Count); err != nil {
			return nil, err
		}
		totalAmount += c.Amount
		items = append(items, c)
	}

	for i := range items {
		if totalAmount > 0 {
			items[i].Percent = (items[i].Amount / totalAmount) * 100
		}
	}
	return items, nil
}

func (r *Repository) GetCashFlow(ctx context.Context, userID int, from, to time.Time, granularity string) ([]CashFlowPoint, error) {
	truncExpr := "DATE_TRUNC('day', date)"
	switch granularity {
	case "week":
		truncExpr = "DATE_TRUNC('week', date)"
	case "month":
		truncExpr = "DATE_TRUNC('month', date)"
	}

	query := `
	SELECT
		` + truncExpr + ` AS period,
		COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
		COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
	FROM transactions
	WHERE user_id = $1 AND date BETWEEN $2 AND $3
	GROUP BY period
	ORDER BY period`

	rows, err := r.db.Query(ctx, query, userID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []CashFlowPoint
	var runningBalance float64
	for rows.Next() {
		var p CashFlowPoint
		var period time.Time
		if err := rows.Scan(&period, &p.Income, &p.Expense); err != nil {
			return nil, err
		}
		p.Date = period.Format("2006-01-02")
		runningBalance += p.Income - p.Expense
		p.Balance = runningBalance
		points = append(points, p)
	}
	return points, nil
}
