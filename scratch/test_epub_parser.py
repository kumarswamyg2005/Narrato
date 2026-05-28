import os
import zipfile
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

def parse_epub_clean(epub_path):
    print(f"Reading EPUB: {epub_path}")
    chapters = []
    
    with zipfile.ZipFile(epub_path, 'r') as z:
        # 1. Read container.xml to locate the OPF file
        container_xml = z.read("META-INF/container.xml")
        root = ET.fromstring(container_xml)
        ns = {"ns": "urn:oasis:names:tc:opendocument:xmlns:container"}
        rootfile = root.find(".//ns:rootfile", namespaces=ns)
        if rootfile is None:
            raise ValueError("No rootfile found in container.xml")
        
        opf_path = rootfile.attrib["full-path"]
        print(f"OPF Path: {opf_path}")
        opf_dir = os.path.dirname(opf_path)
        
        # 2. Read OPF file
        opf_xml = z.read(opf_path)
        opf_root = ET.fromstring(opf_xml)
        
        # Define namespaces for OPF
        opf_ns = {
            "opf": "http://www.idpf.org/2007/opf",
            "dc": "http://purl.org/dc/elements/1.1/"
        }
        
        # Find title and author
        title_el = opf_root.find(".//dc:title", namespaces=opf_ns)
        author_el = opf_root.find(".//dc:creator", namespaces=opf_ns)
        title = title_el.text if title_el is not None else "Unknown Title"
        author = author_el.text if author_el is not None else "Unknown Author"
        print(f"Title: {title}, Author: {author}")
        
        # Build manifest dictionary: item_id -> href
        manifest_items = {}
        manifest = opf_root.find(".//opf:manifest", namespaces=opf_ns)
        if manifest is not None:
            for item in manifest.findall("opf:item", namespaces=opf_ns):
                manifest_items[item.attrib["id"]] = item.attrib["href"]
                
        # Parse spine to get reading order
        spine = opf_root.find(".//opf:spine", namespaces=opf_ns)
        if spine is None:
            raise ValueError("No spine found in OPF file")
            
        spine_items = []
        for itemref in spine.findall("opf:itemref", namespaces=opf_ns):
            idref = itemref.attrib["idref"]
            if idref in manifest_items:
                # Resolve relative path
                href = manifest_items[idref]
                full_href = os.path.normpath(os.path.join(opf_dir, href)) if opf_dir else href
                spine_items.append(full_href)
                
        print(f"Spine has {len(spine_items)} documents in reading order.")
        
        # 3. Read and extract text from each spine item
        for i, path in enumerate(spine_items):
            try:
                # Read file content
                html_content = z.read(path)
                soup = BeautifulSoup(html_content, "html.parser")
                
                # Extract text
                # Remove script and style elements
                for element in soup(["script", "style"]):
                    element.decompose()
                    
                # Extract heading for title
                ch_title = ""
                for h_tag in ["h1", "h2", "h3", "h4"]:
                    h_el = soup.find(h_tag)
                    if h_el:
                        ch_title = h_el.get_text().strip()
                        break
                        
                if not ch_title:
                    # Fallback to HTML title or file name
                    title_tag = soup.find("title")
                    if title_tag:
                        ch_title = title_tag.get_text().strip()
                    if not ch_title:
                        ch_title = f"Section {i+1}"
                        
                # Clean up title if it contains weird spaces/newlines
                ch_title = " ".join(ch_title.split())
                
                # Get raw text
                raw_text = soup.get_text()
                # Clean up spacing
                lines = [line.strip() for line in raw_text.splitlines()]
                # group lines with double newlines
                clean_text = "\n\n".join([line for line in lines if line])
                
                word_count = len(clean_text.split())
                
                chapters.append({
                    "chapter_num": i + 1,
                    "title": ch_title,
                    "word_count": word_count,
                    "text_len": len(clean_text),
                    "snippet": clean_text[:200].replace("\n", " ")
                })
            except Exception as e:
                print(f"Error parsing item {path}: {e}")
                
    return chapters

def main():
    epub_path = "/Users/kumaraswamy/Downloads/Memoirs-of-Sherlock-Holmes-by-Sir-Arthur-Conan-Doyle.epub"
    chapters = parse_epub_clean(epub_path)
    print(f"\nExtracted {len(chapters)} chapters:")
    for ch in chapters[:20]:
        print(f"Ch {ch['chapter_num']}: {ch['title']} ({ch['word_count']} words) - Snippet: {ch['snippet']}")

if __name__ == "__main__":
    main()
