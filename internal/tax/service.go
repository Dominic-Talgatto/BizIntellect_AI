package tax

import (
	"context"
	"fmt"
	"time"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetSettings(ctx context.Context, userID int) (*Settings, error) {
	settings, err := s.repo.GetSettings(ctx, userID)
	if err != nil {
		return &Settings{
			UserID:              userID,
			TaxRate:             20.0,
			BusinessType:        "general",
			QuarterlyStartMonth: 1,
		}, nil
	}
	return settings, nil
}

func (s *Service) SaveSettings(ctx context.Context, userID int, settings *Settings) (*Settings, error) {
	settings.UserID = userID
	if settings.TaxRate <= 0 || settings.TaxRate > 100 {
		settings.TaxRate = 20.0
	}
	if settings.QuarterlyStartMonth < 1 || settings.QuarterlyStartMonth > 12 {
		settings.QuarterlyStartMonth = 1
	}
	if settings.BusinessType == "" {
		settings.BusinessType = "general"
	}
	if err := s.repo.UpsertSettings(ctx, settings); err != nil {
		return nil, err
	}
	return settings, nil
}

func (s *Service) Estimate(ctx context.Context, userID, year int) (*Estimate, error) {
	settings, err := s.GetSettings(ctx, userID)
	if err != nil {
		return nil, err
	}

	income, expenses, err := s.repo.GetAnnualIncome(ctx, userID, year)
	if err != nil {
		return nil, err
	}

	taxableIncome := income - expenses
	if taxableIncome < 0 {
		taxableIncome = 0
	}

	estimatedTax := taxableIncome * (settings.TaxRate / 100)
	netProfit := taxableIncome - estimatedTax

	quarterly := s.buildQuarterlySchedule(estimatedTax, year, settings.QuarterlyStartMonth)
	tips := s.buildOptimizationTips(income, expenses, settings)

	return &Estimate{
		TaxableIncome:     taxableIncome,
		TaxRate:           settings.TaxRate,
		EstimatedTax:      estimatedTax,
		NetProfit:         netProfit,
		QuarterlyPayments: quarterly,
		OptimizationTips:  tips,
	}, nil
}

func (s *Service) buildQuarterlySchedule(totalTax float64, year, startMonth int) []QuarterlyPayment {
	perQuarter := totalTax / 4
	payments := make([]QuarterlyPayment, 4)

	for i := 0; i < 4; i++ {
		month := ((startMonth - 1 + i*3) % 12) + 1
		payYear := year
		if month < startMonth {
			payYear++
		}
		dueDate := time.Date(payYear, time.Month(month+1), 15, 0, 0, 0, 0, time.UTC)
		payments[i] = QuarterlyPayment{
			Quarter: i + 1,
			DueDate: dueDate.Format("2006-01-02"),
			Amount:  perQuarter,
		}
	}
	return payments
}

func (s *Service) buildOptimizationTips(income, expenses float64, settings *Settings) []string {
	tips := []string{}

	expenseRatio := 0.0
	if income > 0 {
		expenseRatio = (expenses / income) * 100
	}

	if expenseRatio < 30 {
		tips = append(tips, "Your expense ratio is low — consider reinvesting profits in equipment or marketing to reduce taxable income.")
	}
	if expenseRatio > 80 {
		tips = append(tips, "High expense ratio detected — review recurring costs and identify areas to cut.")
	}
	if settings.TaxRate > 25 {
		tips = append(tips, fmt.Sprintf("Your tax rate is %.1f%% — explore whether your business qualifies for a simplified tax regime.", settings.TaxRate))
	}
	tips = append(tips, "Keep all receipts and invoices to maximize deductible business expenses.")
	tips = append(tips, "Consider a retirement/pension fund contribution — these are typically tax-deductible.")

	return tips
}
