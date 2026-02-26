package transaction

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Create(ctx context.Context, t *Transaction) error {
	query := `
	INSERT INTO transactions (user_id, amount, type, category, description, date, source)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING id, created_at`
	return r.db.QueryRow(ctx, query,
		t.UserID, t.Amount, t.Type, t.Category, t.Description, t.Date, t.Source,
	).Scan(&t.ID, &t.CreatedAt)
}

func (r *Repository) BulkCreate(ctx context.Context, txs []Transaction) error {
	for i := range txs {
		if err := r.Create(ctx, &txs[i]); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) List(ctx context.Context, f Filter) ([]Transaction, int, error) {
	args := []interface{}{f.UserID}
	conditions := []string{"user_id = $1"}
	argIdx := 2

	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, f.Type)
		argIdx++
	}
	if f.Category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIdx))
		args = append(args, f.Category)
		argIdx++
	}
	if f.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("date >= $%d", argIdx))
		args = append(args, f.DateFrom)
		argIdx++
	}
	if f.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("date <= $%d", argIdx))
		args = append(args, f.DateTo)
		argIdx++
	}

	where := strings.Join(conditions, " AND ")

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM transactions WHERE %s", where)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	if f.Page <= 0 {
		f.Page = 1
	}
	if f.PageSize <= 0 {
		f.PageSize = 50
	}
	offset := (f.Page - 1) * f.PageSize

	dataArgs := append(args, f.PageSize, offset)
	dataQuery := fmt.Sprintf(`
	SELECT id, user_id, amount, type, category, description, date, source, created_at
	FROM transactions
	WHERE %s
	ORDER BY date DESC
	LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []Transaction
	for rows.Next() {
		var t Transaction
		if err := rows.Scan(
			&t.ID, &t.UserID, &t.Amount, &t.Type,
			&t.Category, &t.Description, &t.Date, &t.Source, &t.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		result = append(result, t)
	}
	return result, total, nil
}

func (r *Repository) GetByID(ctx context.Context, id, userID int) (*Transaction, error) {
	query := `
	SELECT id, user_id, amount, type, category, description, date, source, created_at
	FROM transactions WHERE id = $1 AND user_id = $2`
	var t Transaction
	err := r.db.QueryRow(ctx, query, id, userID).Scan(
		&t.ID, &t.UserID, &t.Amount, &t.Type,
		&t.Category, &t.Description, &t.Date, &t.Source, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *Repository) Update(ctx context.Context, t *Transaction) error {
	query := `
	UPDATE transactions
	SET amount=$1, type=$2, category=$3, description=$4, date=$5
	WHERE id=$6 AND user_id=$7
	RETURNING created_at`
	return r.db.QueryRow(ctx, query,
		t.Amount, t.Type, t.Category, t.Description, t.Date, t.ID, t.UserID,
	).Scan(&t.CreatedAt)
}

func (r *Repository) Delete(ctx context.Context, id, userID int) error {
	_, err := r.db.Exec(ctx,
		"DELETE FROM transactions WHERE id=$1 AND user_id=$2", id, userID)
	return err
}

func (r *Repository) GetMonthlyTotals(ctx context.Context, userID int, months int) ([]MonthlyTotal, error) {
	query := `
	SELECT
		DATE_TRUNC('month', date) AS month,
		type,
		SUM(amount) AS total
	FROM transactions
	WHERE user_id = $1
	  AND date >= NOW() - ($2 || ' months')::INTERVAL
	GROUP BY month, type
	ORDER BY month`

	rows, err := r.db.Query(ctx, query, userID, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []MonthlyTotal
	for rows.Next() {
		var m MonthlyTotal
		var t string
		if err := rows.Scan(&m.Month, &t, &m.Total); err != nil {
			return nil, err
		}
		m.Type = Type(t)
		result = append(result, m)
	}
	return result, nil
}

type MonthlyTotal struct {
	Month time.Time `json:"month"`
	Type  Type      `json:"type"`
	Total float64   `json:"total"`
}
