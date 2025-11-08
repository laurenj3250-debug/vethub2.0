# VetHub Backend API

Express + PostgreSQL backend for VetHub patient management system.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL=your_railway_postgres_url
JWT_SECRET=your_super_secret_random_string
PORT=3001
NODE_ENV=production
```

### 3. Deploy to Railway

#### Step 1: Link to Railway Project

```bash
# Install Railway CLI (if not already installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your Railway project
railway link
```

#### Step 2: Set Environment Variables in Railway Dashboard

1. Go to your Railway project dashboard
2. Select your service
3. Go to "Variables" tab
4. Add these variables:
   - `DATABASE_URL` - Copy from your PostgreSQL service
   - `JWT_SECRET` - Generate a random string (32+ characters)
   - `PORT` - Railway will set this automatically
   - `NODE_ENV` - Set to `production`

#### Step 3: Deploy

```bash
# Deploy from the backend directory
railway up
```

Or push to your Git repository connected to Railway.

### 4. Run Locally

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Create patient
- `PATCH /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Tasks
- `POST /api/tasks/patients/:patientId/tasks` - Create task
- `PATCH /api/tasks/patients/:patientId/tasks/:taskId` - Update task
- `DELETE /api/tasks/patients/:patientId/tasks/:taskId` - Delete task
- `GET /api/tasks/general` - Get general tasks
- `POST /api/tasks/general` - Create general task
- `PATCH /api/tasks/general/:id` - Update general task
- `DELETE /api/tasks/general/:id` - Delete general task

### Common Items
- `GET /api/common/problems` - Get common problems
- `POST /api/common/problems` - Create common problem
- `DELETE /api/common/problems/:id` - Delete common problem
- (Same pattern for `/comments` and `/medications`)

## Database Migrations

Migrations run automatically on server start. The schema is defined in `src/db/schema.sql`.

## Authentication

All routes except `/api/auth/*` and `/health` require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```
