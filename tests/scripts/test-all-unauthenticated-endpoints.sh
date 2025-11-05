#!/bin/bash

# Comprehensive Unauthenticated Endpoint Testing
# Tests all API endpoints that don't require authentication
# Verifies proper 401 responses for protected endpoints
# Server must be running on http://localhost:3000

set -euo pipefail

readonly BASE_URL="http://localhost:3000"
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_RESET='\033[0m'

declare -i total_tests=0
declare -i tests_passed=0
declare -i tests_failed=0

log_test_start() {
  local test_number=$1
  local test_name=$2
  local http_method=$3
  local endpoint_path=$4
  local expected_status=$5
  
  total_tests=$((total_tests + 1))
  echo -e "\n${COLOR_YELLOW}[Test ${total_tests}]${COLOR_RESET} ${test_name}"
  echo "   Method: ${http_method} | Path: ${endpoint_path} | Expected: ${expected_status}"
}

log_test_result() {
  local test_name=$1
  local http_status_code=$2
  local expected_status_code=$3
  local response_body=$4
  
  if [ "$http_status_code" = "$expected_status_code" ]; then
    echo -e "   ${COLOR_GREEN}✅ PASS${COLOR_RESET} - Status: ${http_status_code}"
    if [ -n "$response_body" ] && [ "$response_body" != "null" ]; then
      echo "   Response: $(echo "$response_body" | head -c 150)"
    fi
    tests_passed=$((tests_passed + 1))
    return 0
  else
    echo -e "   ${COLOR_RED}❌ FAIL${COLOR_RESET} - Expected: ${expected_status_code}, Got: ${http_status_code}"
    echo "   Response: $(echo "$response_body" | head -c 200)"
    tests_failed=$((tests_failed + 1))
    return 1
  fi
}

execute_api_request() {
  local http_method=$1
  local endpoint_path=$2
  local request_body="${3:-}"
  
  local curl_command="curl -s -w '\n%{http_code}' -X '${http_method}' '${BASE_URL}${endpoint_path}' -H 'Content-Type: application/json'"
  
  if [ -n "$request_body" ]; then
    curl_command="${curl_command} -d '${request_body}'"
  fi
  
  local response=$(eval "$curl_command" 2>&1)
  local http_status_code=$(echo "$response" | tail -n1)
  local response_body=$(echo "$response" | sed '$d')
  
  echo "$http_status_code|$response_body"
}

test_single_endpoint() {
  local test_name=$1
  local http_method=$2
  local endpoint_path=$3
  local expected_status_code=$4
  local request_body="${5:-}"
  
  log_test_start "$total_tests" "$test_name" "$http_method" "$endpoint_path" "$expected_status_code"
  
  local response=$(execute_api_request "$http_method" "$endpoint_path" "$request_body")
  local http_status_code=$(echo "$response" | cut -d'|' -f1)
  local response_body=$(echo "$response" | cut -d'|' -f2-)
  
  log_test_result "$test_name" "$http_status_code" "$expected_status_code" "$response_body"
  
  echo "$response_body"
}

test_basic_endpoints() {
  echo "========================================="
  echo "1. Basic Endpoints"
  echo "========================================="
  
  test_single_endpoint "Health Check" "GET" "/health" "200"
}

test_public_form_endpoints() {
  echo ""
  echo "========================================="
  echo "2. Public Form Endpoints"
  echo "========================================="
  
  # Consent form may not exist yet, 404 is expected
  test_single_endpoint "Get Consent Form Template" "GET" "/api/forms/consent" "404"
}

test_authentication_flow() {
  echo ""
  echo "========================================="
  echo "3. Authentication Flow"
  echo "========================================="
  
  local valid_registration='{"username":"testuser","email":"test@test.com","password":"password123","confirmPassword":"password123"}'
  local registration_response=$(test_single_endpoint "Register New User" "POST" "/api/auth/register" "200" "$valid_registration")
  echo "$registration_response" > /tmp/register_response.json
  
  local invalid_missing_fields='{"username":"test"}'
  test_single_endpoint "Register User (Missing Required Fields)" "POST" "/api/auth/register" "400" "$invalid_missing_fields"
  
  local invalid_password_mismatch='{"username":"test2","email":"test2@test.com","password":"pass1","confirmPassword":"pass2"}'
  test_single_endpoint "Register User (Password Mismatch)" "POST" "/api/auth/register" "400" "$invalid_password_mismatch"
}

test_user_endpoints_without_authentication() {
  echo ""
  echo "========================================="
  echo "4. User Endpoints (Unauthenticated)"
  echo "========================================="
  echo "All should return 401 Unauthorized:"
  
  local user_endpoints=(
    "Get User Profile:/api/users/profile:GET"
    "Update User Profile:/api/users/profile:POST"
    "Enter Event Code:/api/users/eventCode:POST"
    "Get Current User:/api/users/me:GET"
  )
  
  for endpoint_spec in "${user_endpoints[@]}"; do
    local test_name=$(echo "$endpoint_spec" | cut -d':' -f1)
    local endpoint_path=$(echo "$endpoint_spec" | cut -d':' -f2)
    local http_method=$(echo "$endpoint_spec" | cut -d':' -f3)
    
    test_single_endpoint "$test_name (No Auth)" "$http_method" "$endpoint_path" "401"
  done
}

test_event_endpoints_without_authentication() {
  echo ""
  echo "========================================="
  echo "5. Event Endpoints (Unauthenticated)"
  echo "========================================="
  echo "All should return 401 Unauthorized:"
  
  test_single_endpoint "List Events (No Auth)" "GET" "/api/events" "401"
  test_single_endpoint "Get Event Surveys (No Auth)" "GET" "/api/events/test-id/surveys" "401"
}

test_guest_endpoints() {
  echo ""
  echo "========================================="
  echo "6. Guest Endpoints"
  echo "========================================="
  
  local missing_code='{}'
  test_single_endpoint "Validate Guest Code (Missing Code)" "POST" "/api/guests/validateCode" "400" "$missing_code"
  
  local invalid_code='{"code":"9999"}'
  test_single_endpoint "Validate Guest Code (Invalid Code)" "POST" "/api/guests/validateCode" "400" "$invalid_code"
  
  local missing_fields='{"email":"guest@test.com"}'
  test_single_endpoint "Register Guest (Missing Required Fields)" "POST" "/api/guests/register" "400" "$missing_fields"
}

test_survey_endpoints_without_authentication() {
  echo ""
  echo "========================================="
  echo "7. Survey Endpoints (Unauthenticated)"
  echo "========================================="
  echo "All should return 401 Unauthorized:"
  
  local survey_endpoints=(
    "Get User Surveys:/api/surveys:GET"
    "Get Survey Questions:/api/surveyQuestions?id=test:GET"
    "Get User Responses:/api/userResponses?id=test:GET"
  )
  
  for endpoint_spec in "${survey_endpoints[@]}"; do
    local test_name=$(echo "$endpoint_spec" | cut -d':' -f1)
    local endpoint_path=$(echo "$endpoint_spec" | cut -d':' -f2)
    local http_method=$(echo "$endpoint_spec" | cut -d':' -f3)
    
    test_single_endpoint "$test_name (No Auth)" "$http_method" "$endpoint_path" "401"
  done
}

test_admin_endpoints_without_authentication() {
  echo ""
  echo "========================================="
  echo "8. Admin Endpoints (Unauthenticated)"
  echo "========================================="
  echo "All should return 401 Unauthorized:"
  
  local admin_endpoints=(
    "List Form Templates:/api/formTemplates:GET"
    "List Event Types:/api/eventTypes:GET"
    "Create Event:/api/events:POST"
    "Activate Event:/api/events/test-id/activate:POST"
  )
  
  for endpoint_spec in "${admin_endpoints[@]}"; do
    local test_name=$(echo "$endpoint_spec" | cut -d':' -f1)
    local endpoint_path=$(echo "$endpoint_spec" | cut -d':' -f2)
    local http_method=$(echo "$endpoint_spec" | cut -d':' -f3)
    
    test_single_endpoint "$test_name (No Auth)" "$http_method" "$endpoint_path" "401"
  done
}

print_final_summary() {
  echo ""
  echo "========================================="
  echo "Test Summary"
  echo "========================================="
  echo -e "${COLOR_GREEN}✅ Passed: ${tests_passed}${COLOR_RESET}"
  echo -e "${COLOR_RED}❌ Failed: ${tests_failed}${COLOR_RESET}"
  echo "Total Tests: ${total_tests}"
  echo ""
  
  if [ $tests_failed -eq 0 ]; then
    echo -e "${COLOR_GREEN}All tests passed! ✅${COLOR_RESET}"
    exit 0
  else
    echo -e "${COLOR_RED}Some tests failed. Review output above.${COLOR_RESET}"
    exit 1
  fi
}

main() {
  echo "========================================="
  echo "Natural Highs API - Comprehensive Testing"
  echo "========================================="
  echo "Server: ${BASE_URL}"
  echo ""
  
  test_basic_endpoints
  test_public_form_endpoints
  test_authentication_flow
  test_user_endpoints_without_authentication
  test_event_endpoints_without_authentication
  test_guest_endpoints
  test_survey_endpoints_without_authentication
  test_admin_endpoints_without_authentication
  print_final_summary
}

main "$@"

