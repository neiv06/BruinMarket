package models

import (
	"time"
)

type User struct {
	ID                       int        `json:"id"`
	Email                    string     `json:"email"`
	Password                 string     `json:"-"` // Never return password
	Name                     string     `json:"name"`
	ProfilePictureURL        string     `json:"profile_picture_url,omitempty"`
	EmailVerified            bool       `json:"email_verified"`
	VerificationToken        *string    `json:"-"` // Never return token
	VerificationTokenExpires *time.Time `json:"-"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}
