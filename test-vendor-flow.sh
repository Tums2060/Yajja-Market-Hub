#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

# Step 1: Register a vendor account
echo -e "${YELLOW}[TEST 1] Registering vendor account...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Vendor",
    "email": "testvendor@test.com",
    "phone": "+254700000001",
    "password": "password123",
    "role": "vendor"
  }')

echo "Response: $REGISTER_RESPONSE"
TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}Token: $TOKEN${NC}"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}Failed to get token!${NC}"
  exit 1
fi

# Step 2: Fetch vendor profile
echo -e "\n${YELLOW}[TEST 2] Fetching vendor profile...${NC}"
VENDOR_RESPONSE=$(curl -s -X GET "$API_URL/api/vendors/me" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $VENDOR_RESPONSE"
VENDOR_ID=$(echo $VENDOR_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo -e "${GREEN}Vendor ID: $VENDOR_ID${NC}"

if [ -z "$VENDOR_ID" ]; then
  echo -e "${RED}Failed to get vendor ID!${NC}"
  exit 1
fi

# Step 3: Create a product
echo -e "\n${YELLOW}[TEST 3] Creating a product...${NC}"
PRODUCT_RESPONSE=$(curl -s -X POST "$API_URL/api/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "A test product",
    "price": 100,
    "category": "food",
    "imageUrl": "https://via.placeholder.com/150"
  }')

echo "Response: $PRODUCT_RESPONSE"

if echo "$PRODUCT_RESPONSE" | grep -q "Vendor profile required"; then
  echo -e "${RED}ERROR: Vendor profile still not found!${NC}"
  exit 1
else
  echo -e "${GREEN}SUCCESS: Product created!${NC}"
fi

echo -e "\n${GREEN}All tests passed!${NC}"
