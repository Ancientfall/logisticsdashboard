# Security Features - BP Logistics Dashboard

## Overview

This dashboard implements several security measures to protect admin functionality while allowing public viewing of data.

## Implemented Security Features

### 1. Password-Based Admin Authentication
- **Bcrypt hashed passwords** - Passwords are never stored in plain text
- **Environment variables** - Sensitive configuration stored in `.env` file
- **Session management** - Admin sessions expire after 1 hour of inactivity

### 2. Brute Force Protection
- **Login attempt limiting** - Maximum 5 failed attempts before lockout
- **Account lockout** - 15-minute lockout after exceeding attempts
- **Attempt tracking** - Failed attempts are tracked per session

### 3. HTTPS Enforcement
- **Security warning** - Shows warning banner if accessed over HTTP in production
- **Secure context detection** - Checks for secure connection

### 4. File Upload Security
- **File type validation** - Only Excel (.xlsx, .xls) and CSV files allowed
- **File size limits** - Maximum 50MB per file
- **Extension checking** - Validates file extensions match content type

### 5. Data Sanitization
- **Input sanitization** - Removes potentially harmful characters from user input
- **XSS prevention** - Strips script tags and event handlers
- **Safe data storage** - Data is sanitized before storing in IndexedDB

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Admin Authentication
REACT_APP_ADMIN_PASSWORD_HASH=$2a$10$YourHashedPasswordHere

# Security Settings
REACT_APP_SESSION_TIMEOUT=3600000        # 1 hour in milliseconds
REACT_APP_MAX_LOGIN_ATTEMPTS=5           # Max failed login attempts
REACT_APP_LOGIN_LOCKOUT_TIME=900000      # 15 minutes lockout
```

### Generating Password Hashes

To create a new admin password:

```bash
node scripts/generatePasswordHash.js
```

Follow the prompts to generate a bcrypt hash for your password.

## Default Credentials

- **Default Password**: `BPAdmin2024`
- **Password Requirements**: Minimum 8 characters

## Security Best Practices

1. **Change default password immediately**
2. **Use HTTPS in production** - Deploy with SSL/TLS certificate
3. **Keep dependencies updated** - Run `npm audit` regularly
4. **Limit admin access** - Only share admin credentials with authorized personnel
5. **Monitor failed logins** - Check browser console for security warnings

## Future Enhancements

Consider implementing:
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- API rate limiting
- Content Security Policy (CSP) headers
- Audit logging
- JWT token-based authentication

## Reporting Security Issues

If you discover a security vulnerability, please report it to your system administrator immediately.