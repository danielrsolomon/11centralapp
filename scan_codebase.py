import google.generativeai as genai
import os

# Replace 'YOUR_API_KEY' with your actual API key
genai.configure(api_key="AIzaSyC3tXFsC8qLCqL7C3t20NXC5IH4mYnHrb8")

# Initialize the Gemini 2.0 Flash model
model = genai.GenerativeModel("gemini-2.0-flash")

# Function to upload files and return a list of file objects
def upload_codebase_files(directory):
    file_objects = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.py', '.js', '.ts', '.jsx', '.tsx', '.css', '.html')):  # Add more file extensions as needed
                file_path = os.path.join(root, file)
                try:
                    uploaded_file = genai.upload_file(file_path)
                    file_objects.append(uploaded_file)
                    print(f"Uploaded: {file_path}")
                except Exception as e:
                    print(f"Failed to upload {file_path}: {e}")
    return file_objects

# Get the current directory (your local project directory)
current_dir = os.getcwd()

# Upload all relevant files in the directory
uploaded_files = upload_codebase_files(current_dir)

if not uploaded_files:
    print("No files were uploaded. Please check file extensions or directory.")
    exit()

# Prompt Gemini to analyze the uploaded files and generate documentation
prompt = """
Analyze the following uploaded files to identify their structure, key functions, classes, and dependencies. Then, generate documentation in Markdown format, including a README, API documentation, and inline comments where necessary. Ensure the documentation is clear, concise, and follows best practices for [specify your tech stack, e.g., Python, JavaScript, NextJS].
"""

# Generate content using the uploaded files
response = model.generate_content([prompt] + uploaded_files)
print(response.text)

# Optionally, save the documentation to a file (e.g., README.md)
with open("README.md", "w", encoding='utf-8') as doc_file:
    doc_file.write(response.text)