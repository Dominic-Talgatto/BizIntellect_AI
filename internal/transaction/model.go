package transaction

import "time"

type Type string
type Source string

const (
	TypeIncome  Type = "income"
	TypeExpense Type = "expense"

	SourceManual  Source = "manual"
	SourceExcel   Source = "excel"
	SourceReceipt Source = "receipt"
)

type Transaction struct {
	ID          int       `json:"id"`
	UserID      int       `json:"user_id"`
	Amount      float64   `json:"amount"`
	Type        Type      `json:"type"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	Source      Source    `json:"source"`
	CreatedAt   time.Time `json:"created_at"`
}

type CreateRequest struct {
	Amount      float64 `json:"amount"`
	Type        Type    `json:"type"`
	Category    string  `json:"category"`
	Description string  `json:"description"`
	Date        string  `json:"date"`
}

type UpdateRequest struct {
	Amount      *float64 `json:"amount,omitempty"`
	Type        *Type    `json:"type,omitempty"`
	Category    *string  `json:"category,omitempty"`
	Description *string  `json:"description,omitempty"`
	Date        *string  `json:"date,omitempty"`
}

type Filter struct {
	UserID    int
	Type      string
	Category  string
	DateFrom  string
	DateTo    string
	Page      int
	PageSize  int
}
