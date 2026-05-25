import os
import json
import re

def clean_json_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file has comment at the start
        if content.strip().startswith('/*'):
            # Find the closing comment tag */
            end_comment_idx = content.find('*/')
            if end_comment_idx != -1:
                clean_content = content[end_comment_idx + 2:].strip()
                # Try parsing to verify it's valid JSON
                json_data = json.loads(clean_content)
                # Write back the clean valid JSON
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=2, ensure_ascii=False)
                print(f"Cleaned: {file_path}")
            else:
                print(f"Warning: Comment start found but no closing */ in {file_path}")
        else:
            # Check if we can parse it as is
            try:
                json.loads(content)
            except json.JSONDecodeError:
                # If there are any inline comments, let's strip them
                # Regex to strip /* ... */
                cleaned = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
                try:
                    json_data = json.loads(cleaned)
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(json_data, f, indent=2, ensure_ascii=False)
                    print(f"Cleaned inline comments: {file_path}")
                except Exception as e:
                    print(f"Error parsing JSON in {file_path}: {e}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    for root, dirs, files in os.walk(root_dir):
        # Exclude hidden directories like .git
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                clean_json_file(file_path)

if __name__ == '__main__':
    main()
