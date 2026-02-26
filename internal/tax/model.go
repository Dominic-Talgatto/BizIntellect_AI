package tax

type Settings struct {
	ID                   int     `json:"id"`
	UserID               int     `json:"user_id"`
	TaxRate              float64 `json:"tax_rate"`
	BusinessType         string  `json:"business_type"`
	QuarterlyStartMonth  int     `json:"quarterly_start_month"`
}

type Estimate struct {
	TaxableIncome      float64            `json:"taxable_income"`
	TaxRate            float64            `json:"tax_rate"`
	EstimatedTax       float64            `json:"estimated_tax"`
	NetProfit          float64            `json:"net_profit"`
	QuarterlyPayments  []QuarterlyPayment `json:"quarterly_payments"`
	OptimizationTips   []string           `json:"optimization_tips"`
}

type QuarterlyPayment struct {
	Quarter    int     `json:"quarter"`
	DueDate    string  `json:"due_date"`
	Amount     float64 `json:"amount"`
}
