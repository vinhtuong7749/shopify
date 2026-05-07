import re

try:
    with open('page.html', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'<div class="product-reviews-and-sold">(.*?)</div>\s*</div>', html, re.DOTALL)
    if m:
        print(m.group(1).encode('ascii', 'ignore').decode('ascii'))
    else:
        print("Not found")
except Exception as e:
    print(e)
