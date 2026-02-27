import os
import glob

replacements = {
    "bg-[#050505]": "bg-background",
    "bg-[#0a0a0a]": "bg-card",
    "bg-[#0d0d0d]": "bg-muted/50",
    "bg-[#111]": "bg-secondary",
    "bg-[#1a1a1a]": "bg-muted",
    "bg-[#262626]": "bg-secondary",
    "border-[#1a1a1a]": "border-border",
    "border-[#222]": "border-input",
    "border-[#333]": "border-border",
    "border-[#333333]": "border-border",
    "text-white": "text-foreground",
    "text-gray-100": "text-foreground",
    "text-gray-200": "text-foreground",
    "text-gray-300": "text-muted-foreground",
    "text-gray-400": "text-muted-foreground",
    "text-gray-500": "text-muted",
    "hover:bg-[#1a1a1a]": "hover:bg-muted",
    "hover:border-[#222]": "hover:border-input",
    "hover:bg-[#111]": "hover:bg-secondary/80",
    "bg-red-500/10": "bg-destructive/10",
    "border-red-500/20": "border-destructive/20",
    "text-red-400": "text-destructive",
}

for filepath in glob.glob("/Users/yashnaidu/Downloads/AgroAI-main/ECSFINAL/frontend/src/**/*.tsx", recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)
