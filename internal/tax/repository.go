package tax

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetSettings(ctx context.Context, userID int) (*Settings, error) {
	query := `
	SELECT id, user_id, tax_rate, business_type, quarterly_start_month
	FROM tax_settings WHERE user_id = $1`

	var s Settings
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&s.ID, &s.UserID, &s.TaxRate, &s.BusinessType, &s.QuarterlyStartMonth,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *Repository) UpsertSettings(ctx context.Context, s *Settings) error {
	query := `
	INSERT INTO tax_settings (user_id, tax_rate, business_type, quarterly_start_month)
	VALUES ($1, $2, $3, $4)
	ON CONFLICT (user_id)
	DO UPDATE SET tax_rate = $2, business_type = $3, quarterly_start_month = $4
	RETURNING id`
	return r.db.QueryRow(ctx, query,
		s.UserID, s.TaxRate, s.BusinessType, s.QuarterlyStartMonth,
	).Scan(&s.ID)
}

func (r *Repository) GetAnnualIncome(ctx context.Context, userID, year int) (float64, float64, error) {
	query := `
	SELECT
		COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
		COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
	FROM transactions
	WHERE user_id = $1
	  AND EXTRACT(YEAR FROM date) = $2`

	var income, expense float64
	err := r.db.QueryRow(ctx, query, userID, year).Scan(&income, &expense)
	return income, expense, err
}
