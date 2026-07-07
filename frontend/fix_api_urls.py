import os
import re
import glob

# Files to update
files_to_update = [
    r"C:\CreatorHUB\frontend\app\(dashboard)\calendar\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\crm\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\dashboard\DashboardClient.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\dashboard\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\insights\InsightsClient.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\media-kit\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\pricing\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\repurpose\page.tsx",
    r"C:\CreatorHUB\frontend\app\(dashboard)\settings\page.tsx",
    r"C:\CreatorHUB\frontend\app\kit\[id]\page.tsx",
    r"C:\CreatorHUB\frontend\components\CreatePostModal.tsx",
    r"C:\CreatorHUB\frontend\components\EditPostModal.tsx"
]

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove local definitions of API_URL
    content = re.sub(r'^\s*const API_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*".*?";\s*$', '', content, flags=re.MULTILINE)
    
    # 2. Add import for API_URL if not present
    if "API_URL" not in content or "import" not in content:
        # Only add if we actually use it
        pass

    # Actually, the easiest way is to ensure import { API_URL } from "@/lib/utils" is at the top
    if 'from "@/lib/utils"' in content:
        if 'API_URL' not in content.split('from "@/lib/utils"')[0].split('{')[-1]:
            # It has the import but not API_URL
            content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+"@/lib/utils"', r'import { \1, API_URL } from "@/lib/utils"', content)
    else:
        # Add after the first line (use client if present)
        if '"use client";' in content or "'use client';" in content:
            content = re.sub(r'("use client";|''use client'';)', r'\1\nimport { API_URL } from "@/lib/utils";', content)
        else:
            content = 'import { API_URL } from "@/lib/utils";\n' + content

    # 3. Replace direct URLs
    # Matches http://localhost:8000/api/... or http://localhost:8001/api/... inside ticks or quotes
    # For template literals: `http://localhost:8000/api/...` -> `${API_URL}/api/...`
    content = re.sub(r'`http://localhost:800[01]([/?#a-zA-Z0-9_-]*)', r'`${API_URL}\1', content)
    
    # For strings: "http://localhost:8000/api/..." -> `${API_URL}/api/...`
    content = re.sub(r'"http://localhost:800[01]([/?#a-zA-Z0-9_-]*)"', r'`${API_URL}\1`', content)
    
    # Matches process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    content = re.sub(r"\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*'http://localhost:800[01]'\}(/api/payments.*?)`", r"${API_URL}\1`", content)
    
    # Sometimes it's inside fetch("...")
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {path}")

for f in files_to_update:
    if os.path.exists(f):
        fix_file(f)
    else:
        print(f"Not found: {f}")

