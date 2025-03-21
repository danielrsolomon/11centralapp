import google.generativeai as genai

# Replace 'YOUR_API_KEY' with your actual API key
genai.configure(api_key="AIzaSyC3tXFsC8qLCqL7C3t20NXC5IH4mYnHrb8")

# Initialize the Gemini 2.0 Flash model
model = genai.GenerativeModel("gemini-2.0-flash")

# Send a simple prompt to test the model
response = model.generate_content("What is the capital of France?")
print(response.text)