package user

import (
	"context"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (*User, error) {
	if input.Email == "" && input.Phone == "" {
		return nil, errors.New("email or phone required")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	u := &User{
		FirstName:    input.FirstName,
		LastName:     input.LastName,
		PasswordHash: string(hashed),
	}
	if input.Email != "" {
		u.Email = &input.Email
	}
	if input.Phone != "" {
		u.Phone = &input.Phone
	}

	if err := s.repo.CreateUser(ctx, u); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Service) Login(ctx context.Context, identifier, password string) (*User, error) {
	u, err := s.repo.GetByIdentifier(ctx, identifier)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}
	return u, nil
}

func (s *Service) GetByID(ctx context.Context, id int) (*User, error) {
	return s.repo.GetByID(ctx, id)
}
