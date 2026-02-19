package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	// "os"

	"github.com/golang-jwt/jwt/v5"
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

type User struct {
	ID           int       `json:"id"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        *string   `json:"email,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}
type Repository struct {
	// pgxpool.Pool provides QueryRow, Exec, Query, etc.
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Service holds dependencies for business logic.
type Service struct {
	repo *Repository
}

// RegisterInput is the payload for registering a new user.
type RegisterInput struct {
	FirstName string
	LastName  string
	Email     string
	Phone     string
	Password  string
}

type RegisterRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	Password  string `json:"password"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // email or phone
	Password   string `json:"password"`
}

func main() {
	dbURL := "postgres://postgres:2357@localhost:5432/mydb?sslmode=disable"

	pool, err := pgxpool.New(context.Background(), dbURL)
	repo := NewRepository(pool)
	service := &Service{repo: repo}

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

	http.HandleFunc("/register", func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req RegisterRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		user, err := service.Register(r.Context(), RegisterInput{
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
			Phone:     req.Phone,
			Password:  req.Password,
		})

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		token, err := generateJWT(user.ID)
		if err != nil {
			http.Error(w, "could not generate token", 500)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"access_token": token,
		})

	})

	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {

		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req LoginRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		user, err := service.Login(r.Context(), req.Identifier, req.Password)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		token, err := generateJWT(user.ID)
		if err != nil {
			http.Error(w, "could not generate token", 500)
			return
		}

		json.NewEncoder(w).Encode(map[string]string{
			"access_token": token,
		})

	})

	http.HandleFunc("/me", func(w http.ResponseWriter, r *http.Request) {

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "missing token", 401)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "invalid token", 401)
			return
		}

		w.Write([]byte("Authorized"))
	})

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func (r *Repository) CreateUser(ctx context.Context, user *User) error {
	query := `
	INSERT INTO users (first_name, last_name, email, phone, password_hash)
	VALUES ($1, $2, $3, $4, $5)
	RETURNING id, created_at
	`

	return r.db.QueryRow(ctx, query,
		user.FirstName,
		user.LastName,
		user.Email,
		user.Phone,
		user.PasswordHash,
	).Scan(&user.ID, &user.CreatedAt)
}

func (r *Repository) GetUserByIdentifier(ctx context.Context, identifier string) (*User, error) {
	query := `
	SELECT id, first_name, last_name, email, phone, password_hash, created_at
	FROM users
	WHERE email = $1 OR phone = $1
	`

	var user User
	err := r.db.QueryRow(ctx, query, identifier).
		Scan(
			&user.ID,
			&user.FirstName,
			&user.LastName,
			&user.Email,
			&user.Phone,
			&user.PasswordHash,
			&user.CreatedAt,
		)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (*User, error) {

	if input.Email == "" && input.Phone == "" {
		return nil, errors.New("email or phone required")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(input.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, err
	}

	user := &User{
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		PasswordHash: string(hashedPassword),
	}

	if input.Email != "" {
		user.Email = &input.Email
	}

	if input.Phone != "" {
		user.Phone = &input.Phone
	}

	err = s.repo.CreateUser(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *Service) Login(ctx context.Context, identifier, password string) (*User, error) {

	user, err := s.repo.GetUserByIdentifier(ctx, identifier)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(password),
	)

	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}

// func hashPassword(password string) (string, error) {
// 	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
// 	return string(bytes), err
// }

// func checkPassword(password, hash string) error {
// 	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
// }

var jwtSecret = []byte("super-secret-key")

func generateJWT(userID int) (string, error) {

	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString(jwtSecret)
}
