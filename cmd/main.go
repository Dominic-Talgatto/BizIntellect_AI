package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	// "os"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Contact struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
}

func main() {
	dbURL := "postgres://postgres:2357@localhost:5432/mydb?sslmode=disable"

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}
	defer pool.Close()

	http.HandleFunc("/contacts", func(w http.ResponseWriter, r *http.Request) {
		rows, err := pool.Query(context.Background(), `
			SELECT id, first_name, last_name, email, phone
			FROM contacts
		`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		var contacts []Contact

		for rows.Next() {
			var c Contact
			err := rows.Scan(
				&c.ID,
				&c.FirstName,
				&c.LastName,
				&c.Email,
				&c.Phone,
			)
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
			contacts = append(contacts, c)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(contacts)
	})

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func checkPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
