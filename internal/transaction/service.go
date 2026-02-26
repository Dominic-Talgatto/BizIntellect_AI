package transaction

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

type Service struct {
	repo      *Repository
	mlBaseURL string
}

func NewService(repo *Repository) *Service {
	ml := os.Getenv("ML_SERVICE_URL")
	if ml == "" {
		ml = "http://localhost:8000"
	}
	return &Service{repo: repo, mlBaseURL: ml}
}

func (s *Service) Create(ctx context.Context, userID int, req CreateRequest) (*Transaction, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}
	if req.Amount <= 0 {
		return nil, errors.New("amount must be positive")
	}
	if req.Type != TypeIncome && req.Type != TypeExpense {
		return nil, errors.New("type must be income or expense")
	}

	category := req.Category
	if category == "" && req.Type == TypeExpense {
		category = s.classifyExpense(req.Description)
	}
	if category == "" {
		category = "Other"
	}

	t := &Transaction{
		UserID:      userID,
		Amount:      req.Amount,
		Type:        req.Type,
		Category:    category,
		Description: req.Description,
		Date:        date,
		Source:      SourceManual,
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Service) classifyExpense(description string) string {
	type classifyReq struct {
		Description string `json:"description"`
	}
	type classifyResp struct {
		Category string `json:"category"`
	}

	body, _ := json.Marshal(classifyReq{Description: description})
	resp, err := http.Post(s.mlBaseURL+"/classify", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "Other"
	}
	defer resp.Body.Close()

	var result classifyResp
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "Other"
	}
	return result.Category
}

func (s *Service) List(ctx context.Context, f Filter) ([]Transaction, int, error) {
	return s.repo.List(ctx, f)
}

func (s *Service) GetByID(ctx context.Context, id, userID int) (*Transaction, error) {
	return s.repo.GetByID(ctx, id, userID)
}

func (s *Service) Update(ctx context.Context, id, userID int, req UpdateRequest) (*Transaction, error) {
	t, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		return nil, errors.New("transaction not found")
	}

	if req.Amount != nil {
		t.Amount = *req.Amount
	}
	if req.Type != nil {
		t.Type = *req.Type
	}
	if req.Category != nil {
		t.Category = *req.Category
	}
	if req.Description != nil {
		t.Description = *req.Description
	}
	if req.Date != nil {
		d, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			return nil, errors.New("invalid date format")
		}
		t.Date = d
	}

	if err := s.repo.Update(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Service) Delete(ctx context.Context, id, userID int) error {
	return s.repo.Delete(ctx, id, userID)
}

func (s *Service) ParseExcel(ctx context.Context, userID int, data []byte) ([]Transaction, error) {
	f, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to open excel file: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, errors.New("excel file has no sheets")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, fmt.Errorf("failed to read rows: %w", err)
	}

	if len(rows) < 2 {
		return nil, errors.New("excel file must have a header row and at least one data row")
	}

	header := rows[0]
	colIndex := map[string]int{}
	for i, h := range header {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}

	colMap := map[string][]string{
		"date":        {"date", "дата"},
		"amount":      {"amount", "сумма", "sum"},
		"type":        {"type", "тип"},
		"description": {"description", "описание", "desc", "note", "notes"},
		"category":    {"category", "категория"},
	}

	getCol := func(key string) int {
		for _, alias := range colMap[key] {
			if idx, ok := colIndex[alias]; ok {
				return idx
			}
		}
		return -1
	}

	dateCol := getCol("date")
	amountCol := getCol("amount")
	typeCol := getCol("type")
	descCol := getCol("description")
	catCol := getCol("category")

	if dateCol == -1 || amountCol == -1 {
		return nil, errors.New("excel file must have 'date' and 'amount' columns")
	}

	var transactions []Transaction
	for rowIdx, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}

		getCell := func(col int) string {
			if col == -1 || col >= len(row) {
				return ""
			}
			return strings.TrimSpace(row[col])
		}

		amountStr := getCell(amountCol)
		if amountStr == "" {
			continue
		}
		amountStr = strings.ReplaceAll(amountStr, ",", ".")
		amountStr = strings.ReplaceAll(amountStr, " ", "")
		amount, err := strconv.ParseFloat(amountStr, 64)
		if err != nil {
			return nil, fmt.Errorf("row %d: invalid amount '%s'", rowIdx+2, amountStr)
		}

		dateStr := getCell(dateCol)
		var date time.Time
		formats := []string{"2006-01-02", "02.01.2006", "01/02/2006", "2006/01/02"}
		for _, format := range formats {
			if d, err := time.Parse(format, dateStr); err == nil {
				date = d
				break
			}
		}
		if date.IsZero() {
			return nil, fmt.Errorf("row %d: invalid date '%s'", rowIdx+2, dateStr)
		}

		txType := TypeExpense
		typeStr := strings.ToLower(getCell(typeCol))
		if strings.Contains(typeStr, "income") || strings.Contains(typeStr, "доход") || amount > 0 && typeStr == "" {
			txType = TypeIncome
		}
		if amount < 0 {
			amount = -amount
			txType = TypeExpense
		}

		description := getCell(descCol)
		category := getCell(catCol)
		if category == "" && txType == TypeExpense {
			category = s.classifyExpense(description)
		}
		if category == "" {
			category = "Other"
		}

		transactions = append(transactions, Transaction{
			UserID:      userID,
			Amount:      amount,
			Type:        txType,
			Category:    category,
			Description: description,
			Date:        date,
			Source:      SourceExcel,
		})
	}

	if err := s.repo.BulkCreate(ctx, transactions); err != nil {
		return nil, fmt.Errorf("failed to save transactions: %w", err)
	}

	return transactions, nil
}

func (s *Service) GetMonthlyTotals(ctx context.Context, userID, months int) ([]MonthlyTotal, error) {
	return s.repo.GetMonthlyTotals(ctx, userID, months)
}
