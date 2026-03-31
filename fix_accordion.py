import re

path = r'c:\Projects\Allure\snippets\product-filters-sidebar.liquid'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the bad CSS hack
content = re.sub(r'#filter-\{\{ section\.id \}\}-collection-sidebar \.accordion__content\s*\{\s*height: auto !important;\s*\}', '', content)
content = re.sub(r'#filter-\{\{ section\.id \}\}-collection-sidebar \.accordion__control\s*\{\s*aria-expanded: true;\s*\}', '', content)
content = re.sub(r'/\* Make Collection accordion open by default \*/\s*', '', content)

# Add is-active to the accordion item
old_item_re = re.compile(r'(class="accordion__item\s+product-filters__form-item\s+js-accordion-item\s+js-filter-item")')
content = old_item_re.sub(r'\1 is-active', content, count=1)

# Add is-active to the accordion control
old_control_re = re.compile(r'(class="focus-visible-outline\s+accordion__control\s+product-filters__form-item-toggle-button\s+js-accordion-control")')
content = old_control_re.sub(r'\1 is-active', content, count=1)

# Add is-active and style height to accordion content
old_content_re = re.compile(r'(class="accordion__content\s+accordion__content--animate\s+js-accordion-content")\s*id="filter-list-\{\{\s*section\.id\s*\}\}-collection-\{\{- id -\}\}"\s*aria-labelledby="Filter-accordion-\{\{\s*section\.id\s*\}\}-collection-\{\{- id -\}\}"\s*role="region"')
new_content_repl = r'\1 is-active"\n\t\t\t\t\t\t\tid="filter-list-\{\{ section.id \}\}-collection-\{\{- id -\}\}"\n\t\t\t\t\t\t\taria-labelledby="Filter-accordion-\{\{ section.id \}\}-collection-\{\{- id -\}\}"\n\t\t\t\t\t\t\trole="region"\n\t\t\t\t\t\t\tstyle="height: auto;"'
content = old_content_re.sub(new_content_repl, content, count=1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
