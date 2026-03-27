"""
FaceSwapGifts — Image Filename Cleaner v2
==========================================
Converts filenames to clean standard format:
  Armed Forces-Female-Child 6-9 years old-image-341-0.jpg

From the old format:
  Armed_Forces-Female-Child_6to9_years_old-image-341-0.jpg

Double-click to run.
"""

import os
import re

# ── SET YOUR FOLDER PATH HERE ──────────────────────────────
IMAGE_FOLDER = r""
# ──────────────────────────────────────────────────────────

# Character type name fixes (underscore → space, any other corrections)
CHAR_TYPE_MAP = {
    'Armed_Forces':         'Armed Forces',
    'Circus_Performers':    'Circus Performers',
    'Egyptian_Pharaohs':    'Egyptian Pharaohs',
    'Medieval_Monks':       'Medieval Monks',
    'Steampunk_Adventurers':'Steampunk Adventurers',
    # These are already clean but include for safety
    'Cavemen':              'Cavemen',
    'Cowboy':               'Cowboys',   # normalise singular to plural
    'Detectives':           'Detectives',
    'Firefighters':         'Firefighters',
    'Gangsters':            'Gangsters',
    'Gladiators':           'Gladiators',
    'Knights':              'Knights',
    'Mermaids':             'Mermaids',
    'Pirates':              'Pirates',
    'Policemen':            'Policemen',
    'Rockstars':            'Rockstars',
    'Royalty':              'Royalty',
    'Superheros':           'Superheroes',  # fix spelling
    'Victorians':           'Victorians',
    'Vikings':              'Vikings',
}

# Age format fixes (old → new)
AGE_MAP = {
    'Child_6to9_years_old':         'Child 6-9 years old',
    'Teenager_13to16_years_old':    'Teenager 13-16 years old',
    'Young_Adult_22to30_years_old': 'Young Adult 22-30 years old',
    'Older_Adult_60to70_years_old': 'Older Adult 60-70 years old',
    'Toddler':                      'Toddler',
}


def clean_filename(filename):
    name, ext = os.path.splitext(filename)
    
    # Match the pattern: CharType-Gender-Age-image-NNN-N
    match = re.match(r'^(.+?)-(Male|Female)-(.+?)(-image-.+)$', name, re.IGNORECASE)
    if not match:
        return None  # Can't parse — skip
    
    raw_char  = match.group(1).strip()
    gender    = match.group(2).strip()  # Male or Female — keep as-is
    raw_age   = match.group(3).strip()
    image_num = match.group(4).strip()  # -image-341-0 part
    
    # Fix character type
    char_type = CHAR_TYPE_MAP.get(raw_char, raw_char.replace('_', ' '))
    
    # Fix age
    age = AGE_MAP.get(raw_age)
    if not age:
        # Try to fix unknown age formats
        age = raw_age.replace('_', ' ').replace('to', '-')
    
    # Build clean filename
    new_name = f"{char_type}-{gender}-{age}{image_num}"
    return new_name + '.jpg'  # always .jpg


def main():
    print("=" * 60)
    print("  FaceSwapGifts — Filename Cleaner v2")
    print("=" * 60)
    print()

    folder = IMAGE_FOLDER
    if not folder:
        folder = input("Paste your image folder path and press Enter:\n> ").strip().strip('"')

    if not os.path.isdir(folder):
        print(f"\nFolder not found: {folder}")
        input("\nPress Enter to close...")
        return

    print(f"\nScanning: {folder}\n")

    files = [f for f in os.listdir(folder)
             if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]

    renames = []
    skipped = []

    for original in sorted(files):
        cleaned = clean_filename(original)
        if cleaned is None:
            skipped.append(original)
        elif cleaned != original:
            renames.append((original, cleaned))

    print(f"Files to rename:  {len(renames)}")
    print(f"Already clean:    {len(files) - len(renames) - len(skipped)}")
    print(f"Could not parse:  {len(skipped)}")
    print()

    # Show first 10 as a sample
    print("SAMPLE (first 10 renames):")
    print("-" * 60)
    for old, new in renames[:10]:
        print(f"  {old}")
        print(f"  -> {new}")
        print()

    print("Renaming all files now...\n")

    success = 0
    errors = []

    for old, new in renames:
        old_path = os.path.join(folder, old)
        new_path = os.path.join(folder, new)
        try:
            if os.path.exists(new_path) and new_path.lower() != old_path.lower():
                errors.append(f"Skipped (exists): {new}")
                continue
            os.rename(old_path, new_path)
            success += 1
        except Exception as e:
            errors.append(f"Error: {old} — {e}")

    print(f"Successfully renamed: {success} files")

    if skipped:
        print(f"\nFiles that could not be parsed ({len(skipped)}):")
        for s in skipped[:20]:
            print(f"  {s}")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for e in errors[:10]:
            print(f"  {e}")

    # Save log
    log_path = os.path.join(folder, '_rename_log_v2.txt')
    with open(log_path, 'w', encoding='utf-8') as f:
        f.write("FaceSwapGifts Rename Log v2\n")
        f.write(f"Folder: {folder}\n")
        f.write(f"Renamed: {success}\n")
        f.write(f"Skipped: {len(skipped)}\n\n")
        for old, new in renames:
            f.write(f"{old}\n  -> {new}\n")
        if skipped:
            f.write("\nCOULD NOT PARSE:\n")
            for s in skipped:
                f.write(f"  {s}\n")

    print(f"\nLog saved to: _rename_log_v2.txt")
    print("\nAll done!")
    input("\nPress Enter to close...")


if __name__ == '__main__':
    main()
