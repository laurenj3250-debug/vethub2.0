#!/usr/bin/env python3
"""
Script to transform the SOAP Builder modal to a compact two-column layout.
This script will update the page.tsx file with all necessary changes.
"""

import re

def transform_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # Store the original content for safety
    original_content = content

    # Transform all remaining input/select/textarea classes to be more compact
    # Change px-4 py-2 to px-3 py-1.5 or px-3 py-1
    content = re.sub(
        r'className="(w-full\s+)?px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white',
        r'className="\1px-3 py-1 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white',
        content
    )

    # Change section headers from text-xl to text-base
    content = re.sub(
        r'className="text-xl font-bold text-purple-400 mb-3"',
        r'className="text-base font-bold text-purple-400"',
        content
    )

    # Change section padding from p-4 to p-3
    content = re.sub(
        r'<div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">',
        r'<div className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden">',
        content
    )

    # Change gap-4 to gap-2
    content = re.sub(r'gap-4', r'gap-2', content)

    # Change button padding from px-3 py-2 to px-2 py-1 for quick fill buttons
    content = re.sub(
        r'className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm"',
        r'className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold"',
        content
    )

    # Write the transformed content
    with open(file_path, 'w') as f:
        f.write(content)

    print("Transformation complete!")
    print(f"Modified {file_path}")

if __name__ == "__main__":
    transform_file("/Users/laurenjohnston/Documents/vethub2.0/src/app/page.tsx")
