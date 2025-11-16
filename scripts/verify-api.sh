#!/bin/bash

echo "======================================"
echo "VetHub API Verification Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "Checking if dev server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Dev server not running on port 3000${NC}"
    echo "Run 'npm run dev' first"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Test patients endpoint
echo "Testing GET /api/patients..."
PATIENTS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/patients)
HTTP_CODE=$(echo "$PATIENTS_RESPONSE" | tail -n1)
BODY=$(echo "$PATIENTS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ GET /api/patients - 200 OK${NC}"
    echo "$BODY" | jq -r 'if type=="array" then "  Found \(length) patients" else "  Response: \(.)" end'
else
    echo -e "${RED}❌ GET /api/patients - $HTTP_CODE${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

# Test general tasks endpoint
echo "Testing GET /api/tasks/general..."
TASKS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/tasks/general)
HTTP_CODE=$(echo "$TASKS_RESPONSE" | tail -n1)
BODY=$(echo "$TASKS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ GET /api/tasks/general - 200 OK${NC}"
    echo "$BODY" | jq -r 'if type=="array" then "  Found \(length) general tasks" else "  Response: \(.)" end'
else
    echo -e "${RED}❌ GET /api/tasks/general - $HTTP_CODE${NC}"
    echo "$BODY" | jq '.'
fi
echo ""

# Test patient tasks endpoint (if we have patients)
PATIENT_COUNT=$(echo "$PATIENTS_RESPONSE" | sed '$d' | jq '. | length' 2>/dev/null || echo "0")
if [ "$PATIENT_COUNT" -gt 0 ]; then
    FIRST_PATIENT_ID=$(echo "$PATIENTS_RESPONSE" | sed '$d' | jq -r '.[0].id' 2>/dev/null)

    echo "Testing GET /api/tasks/patients/$FIRST_PATIENT_ID/tasks..."
    PATIENT_TASKS_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/tasks/patients/$FIRST_PATIENT_ID/tasks)
    HTTP_CODE=$(echo "$PATIENT_TASKS_RESPONSE" | tail -n1)
    BODY=$(echo "$PATIENT_TASKS_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ GET /api/tasks/patients/$FIRST_PATIENT_ID/tasks - 200 OK${NC}"
        echo "$BODY" | jq -r 'if type=="array" then "  Found \(length) tasks for patient" else "  Response: \(.)" end'
    else
        echo -e "${RED}❌ GET /api/tasks/patients/$FIRST_PATIENT_ID/tasks - $HTTP_CODE${NC}"
        echo "$BODY" | jq '.'
    fi
    echo ""

    # Test creating a task
    echo "Testing POST /api/tasks/patients/$FIRST_PATIENT_ID/tasks..."
    CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"title":"Test Task from verify-api.sh","category":"medication","priority":"medium"}' \
        http://localhost:3000/api/tasks/patients/$FIRST_PATIENT_ID/tasks)
    HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
    BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "201" ]; then
        echo -e "${GREEN}✓ POST /api/tasks/patients/$FIRST_PATIENT_ID/tasks - 201 Created${NC}"
        TASK_ID=$(echo "$BODY" | jq -r '.id')
        echo "  Created task ID: $TASK_ID"

        # Test updating the task
        echo ""
        echo "Testing PATCH /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID..."
        UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
            -H "Content-Type: application/json" \
            -d '{"completed":true}' \
            http://localhost:3000/api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID)
        HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)

        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ PATCH /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID - 200 OK${NC}"
            echo "  Task marked as completed"
        else
            echo -e "${RED}❌ PATCH /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID - $HTTP_CODE${NC}"
            echo "$UPDATE_RESPONSE" | sed '$d' | jq '.'
        fi

        # Test deleting the task
        echo ""
        echo "Testing DELETE /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID..."
        DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
            http://localhost:3000/api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID)
        HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ DELETE /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID - 200 OK${NC}"
            echo "  Test task cleaned up"
        else
            echo -e "${RED}❌ DELETE /api/tasks/patients/$FIRST_PATIENT_ID/tasks/$TASK_ID - $HTTP_CODE${NC}"
            echo "$DELETE_RESPONSE" | sed '$d' | jq '.'
        fi
    else
        echo -e "${RED}❌ POST /api/tasks/patients/$FIRST_PATIENT_ID/tasks - $HTTP_CODE${NC}"
        echo "$BODY" | jq '.'
    fi
else
    echo -e "${YELLOW}⚠ No patients found - skipping patient tasks tests${NC}"
fi

echo ""
echo "======================================"
echo "Verification complete"
echo "======================================"
