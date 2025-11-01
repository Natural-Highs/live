#!/bin/bash

# Test Public API Endpoints
# Verifies all publicly accessible endpoints without authentication
# Server must be running on http://localhost:3000

set -euo pipefail

readonly BASE_URL="http://localhost:3000"
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_RESET='\033[0m'

declare -i tests_passed=0
declare -i tests_failed=0

print_test_result() {
  local test_name=$1
  local http_status_code=$2
  local expected_status_code=$3
  local response_body=$4
  
  if [ "$http_status_code" = "$expected_status_code" ]; then
    echo -e "${COLOR_GREEN}✅ PASS${COLOR_RESET} - ${test_name} (Status: ${http_status_code})"
    tests_passed=$((tests_passed + 1))
    return 0
  else
    echo -e "${COLOR_RED}❌ FAIL${COLOR_RESET} - ${test_name}"
    echo "   Expected: ${expected_status_code}, Got: ${http_status_code}"
    echo "   Response: $(echo "$response_body" | head -c 150)"
    tests_failed=$((tests_failed + 1))
    return 1
  fi
}

execute_api_request() {
  local http_method=$1
  local endpoint_path=$2
  local request_body=$3
  
  local curl_command="curl -s -w '\n%{http_code}' -X '${http_method}' '${BASE_URL}${endpoint_path}' -H 'Content-Type: application/json'"
  
  if [ -n "${request_body:-}" ]; then
    curl_command="${curl_command} -d '${request_body}'"
  fi
  
  local response=$(eval "$curl_command" 2>&1)
  local http_status_code=$(echo "$response" | tail -n1)
  local response_body=$(echo "$response" | sed '$d')
  
  echo "$http_status_code|$response_body"
}

run_health_check() {
  echo "========================================="
  echo "1. Server Health Check"
  echo "========================================="
  
  local response=$(execute_api_request "GET" "/health")
  local http_status_code=$(echo "$response" | cut -d'|' -f1)
  local response_body=$(echo "$response" | cut -d'|' -f2-)
  
  print_test_result "Health Check" "$http_status_code" "200" "$response_body"
}

test_public_endpoints() {
  echo ""
  echo "========================================="
  echo "2. Public Endpoints"
  echo "========================================="
  
  local response=$(execute_api_request "GET" "/api/forms/consent")
  local http_status_code=$(echo "$response" | cut -d'|' -f1)
  local response_body=$(echo "$response" | cut -d'|' -f2-)
  
  # Consent form may not exist yet, so 404 is acceptable
  if [ "$http_status_code" = "200" ] || [ "$http_status_code" = "404" ]; then
    print_test_result "Get Consent Form (Public)" "$http_status_code" "$http_status_code" "$response_body"
  else
    print_test_result "Get Consent Form (Public)" "$http_status_code" "200" "$response_body"
  fi
}

test_authentication_endpoints() {
  echo ""
  echo "========================================="
  echo "3. Authentication Endpoints"
  echo "========================================="
  
  # Test registration with invalid data (should fail validation)
  local invalid_registration='{"username":"test","email":"invalid"}'
  local response=$(execute_api_request "POST" "/api/auth/register" "$invalid_registration")
  local http_status_code=$(echo "$response" | cut -d'|' -f1)
  local response_body=$(echo "$response" | cut -d'|' -f2-)
  
  print_test_result "Register User (Invalid Data)" "$http_status_code" "400" "$response_body"
}

test_protected_endpoints_without_auth() {
  echo ""
  echo "========================================="
  echo "4. Protected Endpoints (No Authentication)"
  echo "========================================="
  echo "These should all return 401 Unauthorized:"
  echo ""
  
  local protected_endpoints=(
    "GET:/api/events:List Events"
    "GET:/api/formTemplates:List Form Templates"
    "GET:/api/eventTypes:List Event Types"
    "GET:/api/surveys:Get Surveys"
  )
  
  for endpoint_spec in "${protected_endpoints[@]}"; do
    local http_method=$(echo "$endpoint_spec" | cut -d':' -f1)
    local endpoint_path=$(echo "$endpoint_spec" | cut -d':' -f2)
    local test_name=$(echo "$endpoint_spec" | cut -d':' -f3)
    
    local response=$(execute_api_request "$http_method" "$endpoint_path")
    local http_status_code=$(echo "$response" | cut -d'|' -f1)
    local response_body=$(echo "$response" | cut -d'|' -f2-)
    
    print_test_result "$test_name (No Auth)" "$http_status_code" "401" "$response_body"
  done
}

test_guest_endpoints() {
  echo ""
  echo "========================================="
  echo "5. Guest Endpoints"
  echo "========================================="
  
  local invalid_code_request='{"code":"0000"}'
  local response=$(execute_api_request "POST" "/api/guests/validateCode" "$invalid_code_request")
  local http_status_code=$(echo "$response" | cut -d'|' -f1)
  local response_body=$(echo "$response" | cut -d'|' -f2-)
  
  print_test_result "Validate Guest Code (Invalid)" "$http_status_code" "400" "$response_body"
}

print_test_summary() {
  echo ""
  echo "========================================="
  echo "Test Summary"
  echo "========================================="
  echo -e "${COLOR_GREEN}✅ Passed: ${tests_passed}${COLOR_RESET}"
  echo -e "${COLOR_RED}❌ Failed: ${tests_failed}${COLOR_RESET}"
  echo "Total Tests: $((tests_passed + tests_failed))"
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
  echo "Natural Highs API - Public Endpoint Tests"
  echo "========================================="
  echo "Server: ${BASE_URL}"
  echo ""
  
  run_health_check
  test_public_endpoints
  test_authentication_endpoints
  test_protected_endpoints_without_auth
  test_guest_endpoints
  print_test_summary
}

main "$@"

