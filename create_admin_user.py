import requests
import json
import time

# The backend URL
url = "http://localhost:8080/api/auth/bootstrap"

# The data for the new user
payload = {
    "username": "admin",
    "password": "admin4321",
    "role": "coordinator"
}

# Set the headers
headers = {
    "Content-Type": "application/json"
}

# Wait for the server to start
time.sleep(5)

try:
    # Send the POST request
    response = requests.post(url, data=json.dumps(payload), headers=headers)

    # Check the response
    if response.status_code == 200:
        print("User created successfully!")
        print("Username: admin")
        print("Password: admin4321")
    else:
        print(f"Error creating user: {response.status_code}")
        print(response.json())

except requests.exceptions.ConnectionError as e:
    print(f"Could not connect to the server at {url}.")
    print("Please make sure the backend server is running.")