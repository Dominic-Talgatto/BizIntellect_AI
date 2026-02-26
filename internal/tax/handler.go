package tax

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/Dominic-Talgatto/go-project/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func respond(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) GetSettings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	settings, err := h.service.GetSettings(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, settings)
}

func (h *Handler) SaveSettings(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var s Settings
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	result, err := h.service.SaveSettings(r.Context(), userID, &s)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, result)
}

func (h *Handler) Estimate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	yearStr := r.URL.Query().Get("year")
	year, err := strconv.Atoi(yearStr)
	if err != nil || year == 0 {
		year = time.Now().Year()
	}

	estimate, err := h.service.Estimate(r.Context(), userID, year)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respond(w, http.StatusOK, estimate)
}
