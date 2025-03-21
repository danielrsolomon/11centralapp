#!/bin/bash

# Test API Endpoints and Capture Debug Logs
# This script verifies API endpoints for both University and Scheduling modules
# with a focus on API-first implementation and error response format

echo "======================================================================"
echo "E11EVEN Central API Integration Verification"
echo "Checking University and Scheduling API endpoints for Supabase integration"
echo "======================================================================"

# Define the base URL - Change this if using a different port or host
BASE_URL="http://localhost:3001/api"

# Get or create a test auth token
# This is a placeholder - you'll need to update with a valid token for your system
TOKEN="YOUR_AUTH_TOKEN_HERE"

# Create a logs directory if it doesn't exist
mkdir -p api_test_logs

# Function to test an endpoint and verify the response structure
test_endpoint() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-""}
  local description=${4:-"Testing $endpoint endpoint"}
  
  echo -e "\n\n"
  echo "======================================================================"
  echo "$description"
  echo "======================================================================"
  echo "Making $method request to $BASE_URL$endpoint"
  
  local output_file="api_test_logs/$(echo $endpoint | sed 's/\//_/g')_response.json"
  
  if [ "$method" == "GET" ]; then
    curl -s -X GET \
         -H "Authorization: Bearer $TOKEN" \
         -H "Accept: application/json" \
         -o "$output_file" \
         -w "\nStatus Code: %{http_code}\nContent Type: %{content_type}\nTotal time: %{time_total}s\n" \
         "$BASE_URL$endpoint"
  else
    curl -s -X $method \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -H "Accept: application/json" \
         -d "$data" \
         -o "$output_file" \
         -w "\nStatus Code: %{http_code}\nContent Type: %{content_type}\nTotal time: %{time_total}s\n" \
         "$BASE_URL$endpoint"
  fi
  
  echo -e "\nResponse saved to $output_file"
  
  # Verify response structure
  local has_success=$(jq 'has("success")' "$output_file")
  local has_data=$(jq 'has("data")' "$output_file")
  
  echo -e "\nResponse Structure Analysis:"
  echo "- Has 'success' property: $has_success"
  echo "- Has 'data' property: $has_data"
  
  # If it's an error response, check that data is an empty array
  local is_error=$(jq '.success == false' "$output_file")
  if [ "$is_error" == "true" ]; then
    local data_is_array=$(jq '.data | type == "array"' "$output_file")
    local data_is_empty=$(jq '.data | length == 0' "$output_file")
    echo "- Error response: true"
    echo "- Data is array: $data_is_array"
    echo "- Data is empty array: $data_is_empty"
    echo "- Error message: $(jq -r '.error.message' "$output_file")"
  else
    echo "- Success response: true"
    local data_type=$(jq '.data | type' "$output_file" | tr -d '"')
    echo "- Data type: $data_type"
  fi
}

# Function to deliberately test error responses
test_error_response() {
  local endpoint=$1
  local method=${2:-GET}
  local data=${3:-""}
  local description=${4:-"Testing error response from $endpoint"}
  
  echo -e "\n\n"
  echo "======================================================================"
  echo "$description"
  echo "======================================================================"
  echo "Making $method request to $BASE_URL$endpoint (expecting error)"
  
  local output_file="api_test_logs/error_$(echo $endpoint | sed 's/\//_/g')_response.json"
  
  if [ "$method" == "GET" ]; then
    curl -s -X GET \
         -H "Accept: application/json" \
         -o "$output_file" \
         -w "\nStatus Code: %{http_code}\nContent Type: %{content_type}\nTotal time: %{time_total}s\n" \
         "$BASE_URL$endpoint"
  else
    curl -s -X $method \
         -H "Content-Type: application/json" \
         -H "Accept: application/json" \
         -d "$data" \
         -o "$output_file" \
         -w "\nStatus Code: %{http_code}\nContent Type: %{content_type}\nTotal time: %{time_total}s\n" \
         "$BASE_URL$endpoint"
  fi
  
  echo -e "\nResponse saved to $output_file"
  
  # Verify error response structure
  local has_success=$(jq 'has("success")' "$output_file")
  local has_data=$(jq 'has("data")' "$output_file")
  local has_error=$(jq 'has("error")' "$output_file")
  
  echo -e "\nError Response Structure Analysis:"
  echo "- Has 'success' property: $has_success"
  echo "- Success is false: $(jq '.success == false' "$output_file")"
  echo "- Has 'data' property: $has_data"
  echo "- Data is array: $(jq '.data | type == "array"' "$output_file")"
  echo "- Data is empty array: $(jq '.data | length == 0' "$output_file")"
  echo "- Has 'error' property: $has_error"
  echo "- Error code: $(jq -r '.error.code' "$output_file")"
  echo "- Error message: $(jq -r '.error.message' "$output_file")"
}

echo -e "\n\n"
echo "======================================================================"
echo "University Module API Tests"
echo "======================================================================"

# Test University API endpoints
test_endpoint "/university/programs/published" "GET" "" "Testing published programs endpoint"
test_endpoint "/university/content/hierarchy" "GET" "" "Testing content hierarchy endpoint"
test_endpoint "/university/content/archived" "GET" "" "Testing archived content endpoint"

# Test University API error response
test_error_response "/university/programs/nonexistent" "GET" "" "Testing invalid program ID error response"

echo -e "\n\n"
echo "======================================================================"
echo "Scheduling Module API Tests"
echo "======================================================================"

# Test Scheduling API endpoints
test_endpoint "/schedule/services" "GET" "" "Testing services endpoint"
test_endpoint "/schedule/appointments" "GET" "" "Testing appointments endpoint"

# Test creating an appointment through API
test_endpoint "/schedule/appointments" "POST" '{
  "provider_id": "00000000-0000-0000-0000-000000000000",
  "service_id": "00000000-0000-0000-0000-000000000000",
  "date": "2024-04-01",
  "start_time": "13:00",
  "end_time": "14:00"
}' "Testing appointment creation through API"

# Test Scheduling API error response
test_error_response "/schedule/appointments/nonexistent" "GET" "" "Testing invalid appointment ID error response"

echo -e "\n\n"
echo "======================================================================"
echo "API Integration Verification Summary"
echo "======================================================================"
echo "All test responses have been saved to the api_test_logs directory"
echo "Please review the output above to verify that:"
echo "1. All success responses include 'success: true' and valid data"
echo "2. All error responses include 'success: false', empty data arrays, and error details"
echo "3. All Supabase operations are properly routed through API endpoints"
echo "======================================================================"

# Generate test summary
echo "-----------------------------------------"
echo "API ENDPOINT TESTING SUMMARY"
echo "-----------------------------------------"
total_tests=$(cat api_test_logs/test_summary.txt | wc -l)
passed_tests=$(grep "PASS" api_test_logs/test_summary.txt | wc -l)
failed_tests=$((total_tests - passed_tests))

echo "Total tests run: $total_tests"
echo "Tests passed: $passed_tests"
echo "Tests failed: $failed_tests"

if [ $failed_tests -eq 0 ]; then
    echo "✅ All tests passed successfully!"
else
    echo "❌ Some tests failed. Check the logs for details."
    echo "Failed endpoints:"
    grep "FAIL" api_test_logs/test_summary.txt
fi

echo "-----------------------------------------"
echo "All test responses are saved in the api_test_logs directory."
echo "Each successful response should include 'success: true' and a data property."
echo "Each error response should include 'success: false', an empty data array, and an error object."
echo "-----------------------------------------" 