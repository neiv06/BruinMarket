package services

import (
	"fmt"
	"os"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type EmailService struct {
	client      *sendgrid.Client
	fromName    string
	fromEmail   string
	frontendURL string
}

func NewEmailService() *EmailService {
	return &EmailService{
		client:      sendgrid.NewSendClient(os.Getenv("SENDGRID_API_KEY")),
		fromName:    os.Getenv("SENDGRID_FROM_NAME"),
		fromEmail:   os.Getenv("SENDGRID_FROM_EMAIL"),
		frontendURL: os.Getenv("FRONTEND_URL"),
	}
}

func (e *EmailService) SendVerificationEmail(toEmail, toName, token string) error {
	from := mail.NewEmail(e.fromName, e.fromEmail)
	to := mail.NewEmail(toName, toEmail)

	verificationURL := fmt.Sprintf("%s/verify-email?token=%s", e.frontendURL, token)

	subject := "Verify your BruinMarket email"

	// HTML email content
	htmlContent := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: linear-gradient(135deg, #3b82f6 0%%, #0ea5e9 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
				.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
				.button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
				.footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Welcome to BruinMarket! 🐻</h1>
				</div>
				<div class="content">
					<p>Hi %s,</p>
					<p>Thanks for signing up for BruinMarket, UCLA's student marketplace!</p>
					<p>To get started, please verify your email address by clicking the button below:</p>
					<div style="text-align: center;">
						<a href="%s" class="button">Verify Email Address</a>
					</div>
					<p>Or copy and paste this link into your browser:</p>
					<p style="word-break: break-all; color: #3b82f6;">%s</p>
					<p><strong>This link will expire in 24 hours.</strong></p>
					<p>If you didn't create an account with BruinMarket, you can safely ignore this email.</p>
					<p>Best regards,<br>The BruinMarket Team</p>
				</div>
				<div class="footer">
					<p>BruinMarket - UCLA Student Marketplace</p>
					<p>This is an automated email. Please do not reply.</p>
				</div>
			</div>
		</body>
		</html>
	`, toName, verificationURL, verificationURL)

	// Plain text fallback
	plainTextContent := fmt.Sprintf(`
		Hi %s,

		Welcome to BruinMarket!

		Please verify your email address by clicking this link:
		%s

		This link will expire in 24 hours.

		If you didn't create an account with BruinMarket, you can safely ignore this email.

		Best regards,
		The BruinMarket Team
	`, toName, verificationURL)

	message := mail.NewSingleEmail(from, subject, to, plainTextContent, htmlContent)

	response, err := e.client.Send(message)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	if response.StatusCode >= 400 {
		return fmt.Errorf("sendgrid error: status code %d, body: %s", response.StatusCode, response.Body)
	}

	return nil
}

func (e *EmailService) SendWelcomeEmail(toEmail, toName string) error {
	from := mail.NewEmail(e.fromName, e.fromEmail)
	to := mail.NewEmail(toName, toEmail)

	subject := "Welcome to BruinMarket! 🎉"

	htmlContent := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
				.container { max-width: 600px; margin: 0 auto; padding: 20px; }
				.header { background: linear-gradient(135deg, #3b82f6 0%%, #0ea5e9 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
				.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
				.button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>Welcome to BruinMarket! 🎉</h1>
				</div>
				<div class="content">
					<p>Hi %s,</p>
					<p>Your email has been verified! You're all set to start buying and selling on BruinMarket.</p>
					<h3>What's next?</h3>
					<ul>
						<li>📦 Browse items in 11 different categories</li>
						<li>💬 Message sellers directly</li>
						<li>📸 Post items you want to sell</li>
						<li>🔍 Search for exactly what you need</li>
					</ul>
					<div style="text-align: center;">
						<a href="%s" class="button">Start Browsing</a>
					</div>
					<p>Happy trading!</p>
					<p>Best regards,<br>The BruinMarket Team</p>
				</div>
			</div>
		</body>
		</html>
	`, toName, e.frontendURL)

	message := mail.NewSingleEmail(from, subject, to, "", htmlContent)
	_, err := e.client.Send(message)
	return err
}
