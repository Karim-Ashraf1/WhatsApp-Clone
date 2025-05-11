#!/usr/bin/env bash

# Base URL for the API Gateway
BASE_URL="http://localhost:5000"

info() {
  echo -e "\n=== $1 ==="
}

# Generate random user credentials
RANDOM_PART=$((RANDOM % 10000))
USER_EMAIL="user${RANDOM_PART}@example.com"
USER_PASS="secretpass123456"  # Made longer to meet minimum requirement
USER_NAME="TestUser${RANDOM_PART}"

# Create a temporary cookie file
COOKIE_FILE=$(mktemp)

info "Register new user: $USER_EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASS}\",\"fullName\":\"${USER_NAME}\"}" \
  -c "$COOKIE_FILE" \
  "${BASE_URL}/api/auth/signup")

echo "REGISTER_RESPONSE: $REGISTER_RESPONSE"

info "Login user to get JWT token"
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASS}\"}" \
  -c "$COOKIE_FILE" \
  "${BASE_URL}/api/auth/login")

echo "LOGIN_RESPONSE: $LOGIN_RESPONSE"

# Create a test contact
info "Create a test contact"
CONTACT_EMAIL="contact${RANDOM_PART}@example.com"
CONTACT_NAME="TestContact${RANDOM_PART}"
CONTACT_PASS="contactpass123456"  # Made longer to meet minimum requirement

CONTACT_REGISTER_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"email\":\"${CONTACT_EMAIL}\",\"password\":\"${CONTACT_PASS}\",\"fullName\":\"${CONTACT_NAME}\"}" \
  "${BASE_URL}/api/auth/signup")

echo "CONTACT_REGISTER_RESPONSE: $CONTACT_REGISTER_RESPONSE"

# Add contact to user's contacts
info "Add contact to user's contacts"
ADD_CONTACT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"email\":\"${CONTACT_EMAIL}\"}" \
  "${BASE_URL}/api/users/contacts")

echo "ADD_CONTACT_RESPONSE: $ADD_CONTACT_RESPONSE"

# Get users for sidebar (this will include our contact)
info "Get users for sidebar"
GET_USERS_RESPONSE=$(curl -s -X GET \
  -b "$COOKIE_FILE" \
  "${BASE_URL}/api/messages/users")

echo "GET_USERS_RESPONSE: $GET_USERS_RESPONSE"

# Send a test message
info "Send a test message"
MESSAGE_CONTENT="Hello, this is a test message!"
SEND_MESSAGE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"content\":\"${MESSAGE_CONTENT}\"}" \
  "${BASE_URL}/api/messages/send/${CONTACT_EMAIL}")

echo "SEND_MESSAGE_RESPONSE: $SEND_MESSAGE_RESPONSE"

# Get messages
info "Get messages"
GET_MESSAGES_RESPONSE=$(curl -s -X GET \
  -b "$COOKIE_FILE" \
  "${BASE_URL}/api/messages/${CONTACT_EMAIL}")

echo "GET_MESSAGES_RESPONSE: $GET_MESSAGES_RESPONSE"

# Get user profile
info "Get user profile"
GET_PROFILE_RESPONSE=$(curl -s -X GET \
  -b "$COOKIE_FILE" \
  "${BASE_URL}/api/users/profile")

echo "GET_PROFILE_RESPONSE: $GET_PROFILE_RESPONSE"

# Clean up cookie file
rm "$COOKIE_FILE"

echo -e "\n=== E2E Test Completed Successfully ===" 