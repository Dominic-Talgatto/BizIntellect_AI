package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Dominic-Talgatto/go-project/internal/dashboard"
	appdb "github.com/Dominic-Talgatto/go-project/internal/db"
	"github.com/Dominic-Talgatto/go-project/internal/middleware"
	"github.com/Dominic-Talgatto/go-project/internal/mlproxy"
	"github.com/Dominic-Talgatto/go-project/internal/tax"
	"github.com/Dominic-Talgatto/go-project/internal/transaction"
	"github.com/Dominic-Talgatto/go-project/internal/user"
	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:2357@localhost:5432/mydb?sslmode=disable"
	}

	db := appdb.NewPool(dbURL)
	defer db.Close()

	// Repositories
	userRepo := user.NewRepository(db)
	txRepo := transaction.NewRepository(db)
	dashRepo := dashboard.NewRepository(db)
	taxRepo := tax.NewRepository(db)

	// Services
	userService := user.NewService(userRepo)
	txService := transaction.NewService(txRepo)
	taxService := tax.NewService(taxRepo)

	// Handlers
	userHandler := user.NewHandler(userService)
	txHandler := transaction.NewHandler(txService)
	dashHandler := dashboard.NewHandler(dashRepo)
	taxHandler := tax.NewHandler(taxService)
	mlHandler := mlproxy.NewHandler(db)

	r := chi.NewRouter()
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Public routes
	r.Post("/api/auth/register", userHandler.Register)
	r.Post("/api/auth/login", userHandler.Login)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth)

		r.Get("/api/me", userHandler.Me)

		// Transactions
		r.Post("/api/transactions", txHandler.Create)
		r.Get("/api/transactions", txHandler.List)
		r.Get("/api/transactions/{id}", txHandler.GetByID)
		r.Patch("/api/transactions/{id}", txHandler.Update)
		r.Delete("/api/transactions/{id}", txHandler.Delete)
		r.Post("/api/transactions/upload/excel", txHandler.UploadExcel)

		// Dashboard
		r.Get("/api/dashboard/summary", dashHandler.Summary)
		r.Get("/api/dashboard/breakdown", dashHandler.Breakdown)
		r.Get("/api/dashboard/cashflow", dashHandler.CashFlow)

		// Tax
		r.Get("/api/tax/settings", taxHandler.GetSettings)
		r.Put("/api/tax/settings", taxHandler.SaveSettings)
		r.Get("/api/tax/estimate", taxHandler.Estimate)

		// ML / AI
		r.Post("/api/ml/classify", mlHandler.Classify)
		r.Get("/api/ml/forecast", mlHandler.Forecast)
		r.Post("/api/ml/ocr", mlHandler.OCR)
		r.Post("/api/chat", mlHandler.Chat)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("FinSight API running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}
