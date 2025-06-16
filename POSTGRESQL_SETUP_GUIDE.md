# PostgreSQL Setup Guide for VPS Server

This guide will help you set up PostgreSQL on your VPS server and fix the "connection refused" error.

## Prerequisites

- SSH access to your VPS server
- Root or sudo privileges
- Ubuntu/Debian-based system (adjust commands for other distributions)

## Step 1: Check if PostgreSQL is Installed and Running

First, SSH into your VPS server:

```bash
ssh your_username@your_vps_ip
```

Check if PostgreSQL is installed:

```bash
psql --version
```

Check if PostgreSQL service is running:

```bash
sudo systemctl status postgresql
```

If PostgreSQL is not installed, you'll see an error. If it's installed but not running, you'll see the service status as "inactive" or "failed".

## Step 2: Install PostgreSQL (if needed)

If PostgreSQL is not installed, install it:

```bash
# Update package list
sudo apt update

# Install PostgreSQL and additional contrib package
sudo apt install postgresql postgresql-contrib -y

# Verify installation
psql --version
```

Start and enable PostgreSQL service:

```bash
# Start the service
sudo systemctl start postgresql

# Enable it to start on boot
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql
```

## Step 3: Create Database and User

Switch to the postgres user:

```bash
sudo -i -u postgres
```

Access PostgreSQL prompt:

```bash
psql
```

Create the database and user:

```sql
-- Create database
CREATE DATABASE logistics_dashboard;

-- Create user with password
CREATE USER logistics_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant all privileges on database to user
GRANT ALL PRIVILEGES ON DATABASE logistics_dashboard TO logistics_user;

-- Grant schema permissions (important for PostgreSQL 15+)
\c logistics_dashboard
GRANT ALL ON SCHEMA public TO logistics_user;

-- Exit PostgreSQL
\q
```

Exit from postgres user:

```bash
exit
```

## Step 4: Configure PostgreSQL to Accept Connections

### 4.1 Configure PostgreSQL to Listen on All Interfaces

Edit the PostgreSQL configuration file:

```bash
# Find the correct version number
ls /etc/postgresql/

# Edit the configuration (replace XX with your version)
sudo nano /etc/postgresql/XX/main/postgresql.conf
```

Find and modify the `listen_addresses` line:

```conf
# Change from:
#listen_addresses = 'localhost'

# To:
listen_addresses = '*'
```

### 4.2 Configure Client Authentication

Edit the pg_hba.conf file:

```bash
sudo nano /etc/postgresql/XX/main/pg_hba.conf
```

Add these lines at the end of the file:

```conf
# Allow connections from any IP with password authentication
host    all             all             0.0.0.0/0               md5
host    all             all             ::/0                    md5

# Or for more security, restrict to specific IP ranges:
# host    all             all             your_app_server_ip/32   md5
```

### 4.3 Configure Firewall

If you're using UFW (Ubuntu Firewall):

```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp

# Check firewall status
sudo ufw status
```

If using iptables:

```bash
# Allow PostgreSQL port
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Save iptables rules
sudo iptables-save
```

### 4.4 Restart PostgreSQL

Apply all configuration changes:

```bash
sudo systemctl restart postgresql
```

## Step 5: Test the Connection

### 5.1 Test Local Connection

Test connection as the postgres user:

```bash
sudo -u postgres psql -d logistics_dashboard
```

### 5.2 Test Remote Connection

From your local machine or application server:

```bash
# Install PostgreSQL client if needed
sudo apt install postgresql-client

# Test connection
psql -h your_vps_ip -U logistics_user -d logistics_dashboard -p 5432
```

You should be prompted for the password. Enter the password you created earlier.

### 5.3 Test with Python (Optional)

Create a test script:

```python
import psycopg2

try:
    conn = psycopg2.connect(
        host="your_vps_ip",
        database="logistics_dashboard",
        user="logistics_user",
        password="your_secure_password",
        port=5432
    )
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    record = cursor.fetchone()
    print("Connected to:", record)
    cursor.close()
    conn.close()
except Exception as error:
    print("Error:", error)
```

## Step 6: Update Your .env File

Update your application's `.env` file with the correct credentials:

```bash
# Database configuration
DB_TYPE=postgresql
DB_HOST=your_vps_ip
DB_PORT=5432
DB_NAME=logistics_dashboard
DB_USER=logistics_user
DB_PASSWORD=your_secure_password

# If using DATABASE_URL format:
DATABASE_URL=postgresql://logistics_user:your_secure_password@your_vps_ip:5432/logistics_dashboard
```

## Troubleshooting

### Connection Refused Error

If you still get connection refused error:

1. **Check PostgreSQL is listening on the correct port:**
   ```bash
   sudo netstat -plnt | grep 5432
   ```
   You should see PostgreSQL listening on 0.0.0.0:5432

2. **Check PostgreSQL logs:**
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-XX-main.log
   ```

3. **Verify firewall rules:**
   ```bash
   sudo iptables -L -n | grep 5432
   ```

4. **Test connectivity from client:**
   ```bash
   telnet your_vps_ip 5432
   ```

### Authentication Failed

If you get authentication errors:

1. **Reset user password:**
   ```bash
   sudo -u postgres psql
   ALTER USER logistics_user WITH PASSWORD 'new_secure_password';
   \q
   ```

2. **Check pg_hba.conf settings:**
   Ensure the authentication method is set to `md5` or `scram-sha-256`

### Performance Optimization

For production use, consider these PostgreSQL settings in `postgresql.conf`:

```conf
# Memory settings (adjust based on your VPS RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

## Security Best Practices

1. **Use strong passwords:** Generate secure passwords using:
   ```bash
   openssl rand -base64 32
   ```

2. **Restrict access:** Instead of allowing all IPs (0.0.0.0/0), restrict to specific IP addresses in pg_hba.conf

3. **Enable SSL:** Configure PostgreSQL to use SSL for encrypted connections

4. **Regular backups:** Set up automated backups:
   ```bash
   # Create backup
   pg_dump -U logistics_user -h localhost logistics_dashboard > backup.sql
   
   # Restore backup
   psql -U logistics_user -h localhost logistics_dashboard < backup.sql
   ```

5. **Monitor logs:** Regularly check PostgreSQL logs for suspicious activity

## Quick Setup Script

Here's a script that automates most of the setup:

```bash
#!/bin/bash

# Variables
DB_NAME="logistics_dashboard"
DB_USER="logistics_user"
DB_PASS="$(openssl rand -base64 32)"
PG_VERSION=$(ls /etc/postgresql/ | head -1)

echo "Setting up PostgreSQL..."

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE ${DB_NAME};
CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF

# Configure PostgreSQL
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/${PG_VERSION}/main/postgresql.conf

# Add authentication rule
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/${PG_VERSION}/main/pg_hba.conf

# Configure firewall
sudo ufw allow 5432/tcp

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "PostgreSQL setup complete!"
echo "Database: ${DB_NAME}"
echo "Username: ${DB_USER}"
echo "Password: ${DB_PASS}"
echo "Save these credentials in your .env file!"
```

Save this script as `setup_postgresql.sh`, make it executable (`chmod +x setup_postgresql.sh`), and run it with `./setup_postgresql.sh`.

## Next Steps

After completing this setup:

1. Test your application's database connection
2. Run any database migrations
3. Set up regular backups
4. Monitor database performance
5. Consider setting up connection pooling for better performance

If you encounter any issues, check the PostgreSQL logs and ensure all configuration files are properly formatted.