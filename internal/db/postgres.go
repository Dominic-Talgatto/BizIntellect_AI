package db

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(dbURL string) *pgxpool.Pool {
	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("Database ping failed:", err)
	}
	log.Println("Connected to database")
	return pool
}
