import sys
from markitdown import MarkItDown

def main():
    epub_path = "/Users/kumaraswamy/Downloads/Memoirs-of-Sherlock-Holmes-by-Sir-Arthur-Conan-Doyle.epub"
    md = MarkItDown()
    print("Converting...")
    res = md.convert(epub_path)
    print("Done. Length:", len(res.text_content))
    
    # Save a small sample of the extracted text to look at the format
    with open("scratch/sample_epub_text.md", "w") as f:
        f.write(res.text_content)
    print("Saved to scratch/sample_epub_text.md")

if __name__ == "__main__":
    main()
