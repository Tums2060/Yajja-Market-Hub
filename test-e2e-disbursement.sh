#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
RAND=$((100000 + RANDOM % 900000))

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE} Yajja Market Hub - E2E Payment & Payout Test${NC}"
echo -e "${BLUE}====================================================${NC}"

# Step 1: Register Vendor
echo -e "\n${YELLOW}[STEP 1] Registering Vendor...${NC}"
VENDOR_EMAIL="vendor-${RAND}@test.com"
VENDOR_PHONE="+254700${RAND}"
VENDOR_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Vendor $RAND\",
    \"email\": \"$VENDOR_EMAIL\",
    \"phone\": \"$VENDOR_PHONE\",
    \"password\": \"password123\",
    \"role\": \"vendor\",
    \"businessName\": \"E2E Restaurant $RAND\",
    \"category\": \"food\",
    \"payoutMethod\": {
      \"type\": \"send_money\",
      \"accountNumber\": \"$VENDOR_PHONE\"
    }
  }")

VENDOR_TOKEN=$(echo $VENDOR_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
VENDOR_ID=$(echo $VENDOR_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo -e "Vendor Registered: Token=${GREEN}$VENDOR_TOKEN${NC}, VendorID=${GREEN}$VENDOR_ID${NC}"

if [ -z "$VENDOR_TOKEN" ]; then
  echo -e "${RED}Vendor registration failed! Response: $VENDOR_RESPONSE${NC}"
  exit 1
fi

# Step 2: Create a Product
echo -e "\n${YELLOW}[STEP 2] Creating a Product (Price: 100 KES)...${NC}"
PRODUCT_RESPONSE=$(curl -s -X POST "$API_URL/api/products" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E2E Burger",
    "description": "Tasty E2E Burger",
    "price": 100,
    "category": "food",
    "imageUrl": "https://via.placeholder.com/150"
  }')
PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo -e "Product Created: ProductID=${GREEN}$PRODUCT_ID${NC}"

if [ -z "$PRODUCT_ID" ]; then
  echo -e "${RED}Product creation failed! Response: $PRODUCT_RESPONSE${NC}"
  exit 1
fi

# Step 3: Register Rider
echo -e "\n${YELLOW}[STEP 3] Registering Rider...${NC}"
RIDER_EMAIL="rider-${RAND}@test.com"
RIDER_PHONE="+254711${RAND}"
RIDER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Rider $RAND\",
    \"email\": \"$RIDER_EMAIL\",
    \"phone\": \"$RIDER_PHONE\",
    \"password\": \"password123\",
    \"role\": \"rider\"
  }")

RIDER_TOKEN=$(echo $RIDER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "Rider Registered: Token=${GREEN}$RIDER_TOKEN${NC}"

if [ -z "$RIDER_TOKEN" ]; then
  echo -e "${RED}Rider registration failed! Response: $RIDER_RESPONSE${NC}"
  exit 1
fi

# Fetch Rider Profile to get riderId
RIDER_PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/riders/me" \
  -H "Authorization: Bearer $RIDER_TOKEN")
RIDER_ID=$(echo $RIDER_PROFILE_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
echo -e "Rider Profile ID: ${GREEN}$RIDER_ID${NC}"

# Step 4: Register Customer
echo -e "\n${YELLOW}[STEP 4] Registering Customer...${NC}"
CUSTOMER_EMAIL="customer-${RAND}@test.com"
CUSTOMER_PHONE="+254722${RAND}"
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Customer $RAND\",
    \"email\": \"$CUSTOMER_EMAIL\",
    \"phone\": \"$CUSTOMER_PHONE\",
    \"password\": \"password123\",
    \"role\": \"customer\"
  }")

CUSTOMER_TOKEN=$(echo $CUSTOMER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "Customer Registered: Token=${GREEN}$CUSTOMER_TOKEN${NC}"

if [ -z "$CUSTOMER_TOKEN" ]; then
  echo -e "${RED}Customer registration failed! Response: $CUSTOMER_RESPONSE${NC}"
  exit 1
fi

# Step 5: Customer Adds Product to Cart
echo -e "\n${YELLOW}[STEP 5] Customer Adding Product to Cart...${NC}"
ADD_CART_RESPONSE=$(curl -s -X POST "$API_URL/api/cart/items" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": $PRODUCT_ID,
    \"quantity\": 1
  }")
echo -e "Cart Add Response: $ADD_CART_RESPONSE"

# Step 6: Customer Places Order
echo -e "\n${YELLOW}[STEP 6] Customer Placing Order...${NC}"
PLACE_ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryAddress": "456 E2E Test Lane",
    "notes": "Deliver quickly"
  }')

ORDER_ID=$(echo $PLACE_ORDER_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2 | head -1)
SUBTOTAL=$(echo $PLACE_ORDER_RESPONSE | grep -o '"subtotal":[0-9]*' | cut -d':' -f2 | head -1)
DELIVERY_FEE=$(echo $PLACE_ORDER_RESPONSE | grep -o '"deliveryFee":[0-9]*' | cut -d':' -f2 | head -1)
TOTAL=$(echo $PLACE_ORDER_RESPONSE | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)

echo -e "Order Placed: OrderID=${GREEN}$ORDER_ID${NC}, Subtotal=${GREEN}$SUBTOTAL${NC}, DeliveryFee=${GREEN}$DELIVERY_FEE${NC}, Total=${GREEN}$TOTAL${NC}"

if [ -z "$ORDER_ID" ]; then
  echo -e "${RED}Order placement failed! Response: $PLACE_ORDER_RESPONSE${NC}"
  exit 1
fi

# Step 7: Customer Triggers STK Push (Payment)
echo -e "\n${YELLOW}[STEP 7] Customer Triggering Payment (STK Push)...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/stk-push" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderIds\": [$ORDER_ID],
    \"phone\": \"$CUSTOMER_PHONE\"
  }")
echo -e "Payment Response: $PAYMENT_RESPONSE"

# Settle payment using simulation callback to trigger vendor payout
CHECKOUT_REQUEST_ID=$(echo $PAYMENT_RESPONSE | grep -o '"checkoutRequestId":"[^"]*' | cut -d'"' -f4)
echo -e "Simulating callback for CheckoutRequestID: ${GREEN}$CHECKOUT_REQUEST_ID${NC}"
SIMULATE_RESPONSE=$(curl -s -X POST "$API_URL/api/payments/simulate-callback" \
  -H "Content-Type: application/json" \
  -d "{
    \"checkoutRequestId\": \"$CHECKOUT_REQUEST_ID\",
    \"success\": true
  }")
echo -e "Simulated Callback Response: $SIMULATE_RESPONSE"


# Step 8: Vendor Accepts Order
echo -e "\n${YELLOW}[STEP 8] Vendor Accepting Order...${NC}"
ACCEPT_RESPONSE=$(curl -s -X PUT "$API_URL/api/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted"
  }')
echo -e "Accept Response Status: $(echo $ACCEPT_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

# Step 9: Vendor Marks Order as Ready
echo -e "\n${YELLOW}[STEP 9] Vendor Marking Order as Ready...${NC}"
READY_RESPONSE=$(curl -s -X PUT "$API_URL/api/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $VENDOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready"
  }')
echo -e "Ready Response Status: $(echo $READY_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

# Step 10: Rider Claims Order
echo -e "\n${YELLOW}[STEP 10] Rider Assigning/Claiming Order...${NC}"
ASSIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/orders/$ORDER_ID/assign-rider" \
  -H "Authorization: Bearer $RIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"riderId\": $RIDER_ID
  }")
echo -e "Assign Response: $ASSIGN_RESPONSE"

# Step 11: Rider Picks Up Order
echo -e "\n${YELLOW}[STEP 11] Rider Marking Order as Picked Up...${NC}"
PICKUP_RESPONSE=$(curl -s -X POST "$API_URL/api/riders/pickup/$ORDER_ID" \
  -H "Authorization: Bearer $RIDER_TOKEN")
echo -e "Pickup Response Status: $(echo $PICKUP_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

# Step 12: Rider Delivers Order
echo -e "\n${YELLOW}[STEP 12] Rider Marking Order as Delivered (Releases Escrow)...${NC}"
DELIVER_RESPONSE=$(curl -s -X POST "$API_URL/api/riders/deliver/$ORDER_ID" \
  -H "Authorization: Bearer $RIDER_TOKEN")
echo -e "Deliver Response Status: $(echo $DELIVER_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)"

# Step 13: Customer Confirms Delivery (Triggers Rider Payout)
echo -e "\n${YELLOW}[STEP 13] Customer Confirming Delivery (Triggers B2C Payout to Rider)...${NC}"
CONFIRM_RESPONSE=$(curl -s -X POST "$API_URL/api/orders/$ORDER_ID/confirm-delivery" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN")
echo -e "Confirm Response: $CONFIRM_RESPONSE"

# Give background async disbursement task a second to write logs
sleep 2

# Step 14: Inspect Payout & Log Status
echo -e "\n${YELLOW}[STEP 14] Querying final order details to inspect payout logs...${NC}"
FINAL_ORDER_RESPONSE=$(curl -s -X GET "$API_URL/api/orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -d "orderCode=$(echo $PLACE_ORDER_RESPONSE | grep -o '"orderCode":"[^"]*' | cut -d'"' -f4)")

DISBURSE_STATUS=$(echo $FINAL_ORDER_RESPONSE | grep -o '"disbursementStatus":"[^"]*' | cut -d'"' -f4)
DISBURSE_REC=$(echo $FINAL_ORDER_RESPONSE | grep -o '"disbursementReceipt":"[^"]*' | cut -d'"' -f4)
RIDER_DISBURSE_STATUS=$(echo $FINAL_ORDER_RESPONSE | grep -o '"riderDisbursementStatus":"[^"]*' | cut -d'"' -f4)
RIDER_DISBURSE_REC=$(echo $FINAL_ORDER_RESPONSE | grep -o '"riderDisbursementReceipt":"[^"]*' | cut -d'"' -f4)

echo -e "Vendor Disbursement Status: ${GREEN}$DISBURSE_STATUS${NC}"
echo -e "Vendor Disbursement Receipt: ${GREEN}$DISBURSE_REC${NC}"
echo -e "Rider Disbursement Status: ${GREEN}$RIDER_DISBURSE_STATUS${NC}"
echo -e "Rider Disbursement Receipt: ${GREEN}$RIDER_DISBURSE_REC${NC}"

if [ "$DISBURSE_STATUS" = "completed" ] && [ "$RIDER_DISBURSE_STATUS" = "completed" ]; then
  echo -e "\n${GREEN}SUCCESS: End-to-end transaction, escrow release, vendor disbursement, and rider payout confirmed!${NC}"
else
  echo -e "\n${RED}FAILURE: Disbursements did not complete as expected.${NC}"
  exit 1
fi
