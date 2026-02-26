package user

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

func (r *Repository) CreateUser(ctx context.Context, u *User) error {
	query := `
	INSERT INTO users (first_name, last_name, email, phone, password_hash)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, created_at`
	return r.db.QueryRow(ctx, query,
		u.FirstName, u.LastName, u.Email, u.Phone, u.PasswordHash,
	).Scan(&u.ID, &u.CreatedAt)
}

func (r *Repository) GetByIdentifier(ctx context.Context, identifier string) (*User, error) {
	query := `
	SELECT id, first_name, last_name, email, phone, password_hash, created_at
	FROM users
	WHERE email = $1 OR phone = $1`
	var u User
	err := r.db.QueryRow(ctx, query, identifier).Scan(
		&u.ID, &u.FirstName, &u.LastName,
		&u.Email, &u.Phone, &u.PasswordHash, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *Repository) GetByID(ctx context.Context, id int) (*User, error) {
	query := `
	SELECT id, first_name, last_name, email, phone, created_at
	FROM users WHERE id = $1`
	var u User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.FirstName, &u.LastName,
		&u.Email, &u.Phone, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}
