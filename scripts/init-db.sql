-- VetHub Local Development Database Initialization
-- This script runs when the PostgreSQL Docker container is first created

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database user (already created by POSTGRES_USER env var)
-- Just ensure permissions
GRANT ALL PRIVILEGES ON DATABASE vethub_local TO vethub;

-- No need to create tables here - Prisma migrations will handle that
-- This file is just for initial setup and extensions
