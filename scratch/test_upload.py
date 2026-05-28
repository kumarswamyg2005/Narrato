import os
import requests

def main():
    epub_path = "/Users/kumaraswamy/Downloads/Memoirs-of-Sherlock-Holmes-by-Sir-Arthur-Conan-Doyle.epub"
    url = "http://localhost:8000/api/books/upload"
    
    print(f"Uploading {epub_path} to {url}...")
    
    if not os.path.exists(epub_path):
        print(f"Error: file not found at {epub_path}")
        return
        
    with open(epub_path, 'rb') as f:
        files = {'file': (os.path.basename(epub_path), f, 'application/epub+zip')}
        data = {'title': 'Memoirs of Sherlock Holmes', 'author': 'Sir Arthur Conan Doyle'}
        
        try:
            res = requests.post(url, files=files, data=data)
            print("Response Code:", res.status_code)
            print("Response:", res.json())
        except Exception as e:
            print("Request failed:", e)

if __name__ == "__main__":
    main()
