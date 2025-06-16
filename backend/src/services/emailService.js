const nodemailer = require('nodemailer')
const logger = require('../utils/logger')

class EmailService {
	constructor() {
		// For internal use, we'll use a simple SMTP configuration
		// You can use your company's SMTP server or a service like Gmail
		this.transporter = nodemailer.createTransport({
			host: process.env.SMTP_HOST || 'smtp.gmail.com',
			port: process.env.SMTP_PORT || 587,
			secure: false, // true for 465, false for other ports
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS
			},
			tls: {
				rejectUnauthorized: false // Allow self-signed certificates for internal use
			}
		})

		// Verify the connection configuration
		this.transporter.verify((error, success) => {
			if (error) {
				logger.error('Email service error:', error)
			} else {
				logger.info('Email service is ready')
			}
		})
	}

	async sendPasswordResetEmail(email, resetUrl) {
		try {
			const mailOptions = {
				from: process.env.SMTP_FROM || '"BP Logistics Dashboard" <noreply@bplogistics.com>',
				to: email,
				subject: 'Password Reset Request - BP Logistics Dashboard',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<div style="background-color: #00754F; color: white; padding: 20px; text-align: center;">
							<h1 style="margin: 0;">BP Logistics Dashboard</h1>
						</div>
						<div style="padding: 30px; background-color: #f5f5f5;">
							<h2 style="color: #333;">Password Reset Request</h2>
							<p style="color: #666; line-height: 1.6;">
								You have requested to reset your password. Click the button below to create a new password:
							</p>
							<div style="text-align: center; margin: 30px 0;">
								<a href="${resetUrl}" style="background-color: #00754F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
									Reset Password
								</a>
							</div>
							<p style="color: #666; font-size: 14px;">
								Or copy and paste this link into your browser:<br>
								<a href="${resetUrl}" style="color: #00754F; word-break: break-all;">${resetUrl}</a>
							</p>
							<p style="color: #999; font-size: 12px; margin-top: 30px;">
								This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
							</p>
						</div>
						<div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
							© ${new Date().getFullYear()} BP Logistics Dashboard. All rights reserved.
						</div>
					</div>
				`
			}

			const info = await this.transporter.sendMail(mailOptions)
			logger.info('Password reset email sent:', info.messageId)
			return true
		} catch (error) {
			logger.error('Failed to send password reset email:', error)
			// For internal use, we don't want to expose email errors to users
			return false
		}
	}

	async sendWelcomeEmail(email, firstName) {
		try {
			const mailOptions = {
				from: process.env.SMTP_FROM || '"BP Logistics Dashboard" <noreply@bplogistics.com>',
				to: email,
				subject: 'Welcome to BP Logistics Dashboard',
				html: `
					<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
						<div style="background-color: #00754F; color: white; padding: 20px; text-align: center;">
							<h1 style="margin: 0;">BP Logistics Dashboard</h1>
						</div>
						<div style="padding: 30px; background-color: #f5f5f5;">
							<h2 style="color: #333;">Welcome ${firstName}!</h2>
							<p style="color: #666; line-height: 1.6;">
								Your account has been successfully created. You can now access the BP Logistics Dashboard to:
							</p>
							<ul style="color: #666; line-height: 1.8;">
								<li>View drilling and production analytics</li>
								<li>Track vessel voyages and operations</li>
								<li>Monitor cost allocations</li>
								<li>Compare performance across facilities</li>
							</ul>
							<div style="text-align: center; margin: 30px 0;">
								<a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background-color: #00754F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
									Login to Dashboard
								</a>
							</div>
							<p style="color: #999; font-size: 12px; margin-top: 30px;">
								If you have any questions, please contact your system administrator.
							</p>
						</div>
						<div style="background-color: #333; color: #999; padding: 20px; text-align: center; font-size: 12px;">
							© ${new Date().getFullYear()} BP Logistics Dashboard. All rights reserved.
						</div>
					</div>
				`
			}

			const info = await this.transporter.sendMail(mailOptions)
			logger.info('Welcome email sent:', info.messageId)
			return true
		} catch (error) {
			logger.error('Failed to send welcome email:', error)
			return false
		}
	}

	// Test email configuration
	async testConnection() {
		try {
			await this.transporter.verify()
			return { success: true, message: 'Email service is configured correctly' }
		} catch (error) {
			return { success: false, message: error.message }
		}
	}
}

module.exports = new EmailService()