#!/usr/bin/env bash

# Base URL for the API Gateway
BASE_URL="http://localhost:3000"

info() {
  echo -e "\n=== $1 ==="
}

# Generate random user credentials
RANDOM_PART=$((RANDOM % 10000))
USER_EMAIL="user${RANDOM_PART}@example.com"
USER_PASS="secretpass123"
USER_NAME="TestUser${RANDOM_PART}"

info "Register new user: $USER_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASS}\",\"name\":\"${USER_NAME}\"}" \
  "${BASE_URL}/api/auth/register")

echo "REGISTER_RESPONSE: $REGISTER_RESPONSE"

info "Login user to get JWT token"
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASS}\"}" \
  "${BASE_URL}/api/auth/login")

echo "LOGIN_RESPONSE: $LOGIN_RESPONSE"

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
if [[ -z "$ACCESS_TOKEN" || "$ACCESS_TOKEN" == "null" ]]; then
  echo "ERROR: Failed to obtain access token!"
  exit 1
fi
echo "Got access token: $ACCESS_TOKEN"

# Create a test contact
info "Create a test contact"
CONTACT_EMAIL="contact${RANDOM_PART}@example.com"
CONTACT_NAME="TestContact${RANDOM_PART}"
CONTACT_PASS="contactpass123"

CONTACT_REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${CONTACT_EMAIL}\",\"password\":\"${CONTACT_PASS}\",\"name\":\"${CONTACT_NAME}\"}" \
  "${BASE_URL}/api/auth/register")

echo "CONTACT_REGISTER_RESPONSE: $CONTACT_REGISTER_RESPONSE"

# Add contact to user's contacts
info "Add contact to user's contacts"
ADD_CONTACT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${CONTACT_EMAIL}\"}" \
  "${BASE_URL}/api/contacts/add")

echo "ADD_CONTACT_RESPONSE: $ADD_CONTACT_RESPONSE"

# Create a new chat
info "Create a new chat with contact"
CREATE_CHAT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"participantEmail\":\"${CONTACT_EMAIL}\"}" \
  "${BASE_URL}/api/chats/create")

echo "CREATE_CHAT_RESPONSE: $CREATE_CHAT_RESPONSE"

CHAT_ID=$(echo "$CREATE_CHAT_RESPONSE" | jq -r '.chatId')
if [[ -z "$CHAT_ID" || "$CHAT_ID" == "null" ]]; then
  echo "ERROR: Could not extract chat ID!"
  exit 1
fi
echo "Chat ID: $CHAT_ID"

# Send a test message
info "Send a test message in the chat"
MESSAGE_CONTENT="Hello, this is a test message!"
SEND_MESSAGE_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"${MESSAGE_CONTENT}\",\"chatId\":\"${CHAT_ID}\"}" \
  "${BASE_URL}/api/messages/send")

echo "SEND_MESSAGE_RESPONSE: $SEND_MESSAGE_RESPONSE"

# Get chat messages
info "Get chat messages"
GET_MESSAGES_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${BASE_URL}/api/chats/${CHAT_ID}/messages")

echo "GET_MESSAGES_RESPONSE: $GET_MESSAGES_RESPONSE"

# Get user profile
info "Get user profile"
GET_PROFILE_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${BASE_URL}/api/users/profile")

echo "GET_PROFILE_RESPONSE: $GET_PROFILE_RESPONSE"

echo -e "\n=== E2E Test Completed Successfully ===" 