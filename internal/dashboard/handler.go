package dashboard

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/Dominic-Talgatto/go-project/internal/middleware"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

func respond(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func parseDateRange(r *http.Request) (time.Time, time.Time) {
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	now := time.Now()
	to := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, time.UTC)
	from := to.AddDate(0, -1, 0)

	if fromStr != "" {
		if d, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = d
		}
	}
	if toStr != "" {
		if d, err := time.Parse("2006-01-02", toStr); err == nil {
			to = d
		}
	}
	return from, to
}

func (h *Handler) Summary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	from, to := parseDateRange(r)

	s, err := h.repo.GetSummary(r.Context(), userID, from, to)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, s)
}

func (h *Handler) Breakdown(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	from, to := parseDateRange(r)

	txType := r.URL.Query().Get("type")
	if txType == "" {
		txType = "expense"
	}

	items, err := h.repo.GetCategoryBreakdown(r.Context(), userID, from, to, txType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, items)
}

func (h *Handler) CashFlow(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == 0 {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	from, to := parseDateRange(r)
	granularity := r.URL.Query().Get("granularity")
	if granularity == "" {
		granularity = "day"
	}

	points, err := h.repo.GetCashFlow(r.Context(), userID, from, to, granularity)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, points)
}
