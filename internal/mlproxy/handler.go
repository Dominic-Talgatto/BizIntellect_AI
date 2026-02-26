package mlproxy

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/Dominic-Talgatto/go-project/internal/middleware"
	"github.com/Dominic-Talgatto/go-project/internal/transaction"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	mlBaseURL string
	db        *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	ml := os.Getenv("ML_SERVICE_URL")
	if ml == "" {
		ml = "http://localhost:8000"
	}
	return &Handler{mlBaseURL: ml, db: db}
}

func respond(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *Handler) Classify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	body, _ := json.Marshal(req)
	resp, err := http.Post(h.mlBaseURL+"/classify", "application/json", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "ML service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

func (h *Handler) Forecast(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	txRepo := transaction.NewRepository(h.db)
	totals, err := txRepo.GetMonthlyTotals(r.Context(), userID, 12)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	type monthData struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}

	monthMap := map[string]*monthData{}
	for _, t := range totals {
		key := t.Month.Format("2006-01")
		if monthMap[key] == nil {
			monthMap[key] = &monthData{Month: key}
		}
		if t.Type == transaction.TypeIncome {
			monthMap[key].Income = t.Total
		} else {
			monthMap[key].Expense = t.Total
		}
	}

	var series []monthData
	for _, v := range monthMap {
		series = append(series, *v)
	}

	body, _ := json.Marshal(map[string]interface{}{"history": series})
	resp, err := http.Post(h.mlBaseURL+"/forecast", "application/json", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "ML service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

func (h *Handler) OCR(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "file too large", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "file field required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	var buf bytes.Buffer
	bodyWriter := io.MultiWriter(&buf)
	_ = bodyWriter

	pr, pw := io.Pipe()
	mpw := multipartWriter(pw, header.Filename, file)
	go func() {
		defer pw.Close()
		mpw()
	}()

	resp, err := http.Post(h.mlBaseURL+"/ocr", "multipart/form-data; boundary=boundary123", pr)
	if err != nil {
		http.Error(w, "ML service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}

func multipartWriter(pw *io.PipeWriter, filename string, src io.Reader) func() {
	return func() {
		boundary := "boundary123"
		pw.Write([]byte("--" + boundary + "\r\n"))
		pw.Write([]byte("Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n"))
		pw.Write([]byte("Content-Type: image/jpeg\r\n\r\n"))
		io.Copy(pw, src)
		pw.Write([]byte("\r\n--" + boundary + "--\r\n"))
	}
}

func (h *Handler) Chat(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	txRepo := transaction.NewRepository(h.db)
	totals, _ := txRepo.GetMonthlyTotals(r.Context(), userID, 3)

	type monthSummary struct {
		Month   string  `json:"month"`
		Income  float64 `json:"income"`
		Expense float64 `json:"expense"`
	}

	monthMap := map[string]*monthSummary{}
	for _, t := range totals {
		key := t.Month.Format("2006-01")
		if monthMap[key] == nil {
			monthMap[key] = &monthSummary{Month: key}
		}
		if t.Type == transaction.TypeIncome {
			monthMap[key].Income = t.Total
		} else {
			monthMap[key].Expense = t.Total
		}
	}

	var context []monthSummary
	for _, v := range monthMap {
		context = append(context, *v)
	}

	body, _ := json.Marshal(map[string]interface{}{
		"message":  req.Message,
		"context":  context,
		"user_id":  userID,
	})

	resp, err := http.Post(h.mlBaseURL+"/chat", "application/json", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "ML service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	io.Copy(w, resp.Body)
}
