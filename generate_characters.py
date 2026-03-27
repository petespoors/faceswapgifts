"""
FaceSwapGifts — Generate characters.json from Cloudinary
=========================================================
Run this script after uploading new images to Cloudinary.
It fetches all your image data and saves a characters.json
file that the website uses to display characters.

Requirements: pip install requests
"""

import json
import requests
import time

# ── CONFIG ─────────────────────────────────────────────
CLOUD_NAME = 'dcyp4e7sp'

# All your character types and their keys
CHARACTER_TYPES = [
    {'key': 'armed-forces',          'label': 'Armed Forces',          'emoji': '🎖️'},
    {'key': 'cavemen',               'label': 'Cavemen',               'emoji': '🪨'},
    {'key': 'circus-performers',     'label': 'Circus Performers',     'emoji': '🎪'},
    {'key': 'cowboys',               'label': 'Cowboys',               'emoji': '🤠'},
    {'key': 'detectives',            'label': 'Detectives',            'emoji': '🔍'},
    {'key': 'egyptian-pharaohs',     'label': 'Egyptian Pharaohs',     'emoji': '👑'},
    {'key': 'firefighters',          'label': 'Firefighters',          'emoji': '🔥'},
    {'key': 'gangsters',             'label': 'Gangsters',             'emoji': '🎩'},
    {'key': 'gladiators',            'label': 'Gladiators',            'emoji': '⚔️'},
    {'key': 'knights',               'label': 'Knights',               'emoji': '🛡️'},
    {'key': 'medieval-monks',        'label': 'Medieval Monks',        'emoji': '📿'},
    {'key': 'mermaids',              'label': 'Mermaids',              'emoji': '🧜'},
    {'key': 'pirates',               'label': 'Pirates',               'emoji': '🏴‍☠️'},
    {'key': 'policemen',             'label': 'Policemen',             'emoji': '👮'},
    {'key': 'rockstars',             'label': 'Rockstars',             'emoji': '🎸'},
    {'key': 'royalty',               'label': 'Royalty',               'emoji': '👸'},
    {'key': 'steampunk-adventurers', 'label': 'Steampunk Adventurers', 'emoji': '🔭'},
    {'key': 'superheroes',           'label': 'Superheroes',           'emoji': '🦸'},
    {'key': 'victorians',            'label': 'Victorians',            'emoji': '🎩'},
    {'key': 'vikings',               'label': 'Vikings',               'emoji': '⚔️'},
]

AGE_ORDER = [
    'Toddler',
    'Child 6-9 years old',
    'Teenager 13-16 years old',
    'Young Adult 22-30 years old',
    'Older Adult 60-70 years old',
]

def fetch_tag(tag):
    """Fetch all images with a given tag from Cloudinary."""
    url = f'https://res.cloudinary.com/{CLOUD_NAME}/image/list/{tag}.json'
    try:
        res = requests.get(url, timeout=15)
        if res.status_code == 200:
            return res.json().get('resources', [])
        else:
            print(f'  HTTP {res.status_code} for tag: {tag}')
            return []
    except Exception as e:
        print(f'  Error fetching {tag}: {e}')
        return []

def cloudinary_url(public_id, width=400):
    return f'https://res.cloudinary.com/{CLOUD_NAME}/image/upload/w_{width},c_fill,q_auto,f_auto/{public_id}.jpg'

def main():
    print('=' * 60)
    print('  FaceSwapGifts — Character Data Generator')
    print('=' * 60)
    print()

    all_characters = []
    total_images = 0

    for char_type in CHARACTER_TYPES:
        key = char_type['key']
        label = char_type['label']
        print(f'Fetching: {label}...')

        resources = fetch_tag(key)
        if not resources:
            print(f'  No images found for {label}')
            continue

        total_images += len(resources)
        print(f'  Found {len(resources)} images')

        # Group by gender and age
        grouped = {}
        for img in resources:
            ctx = img.get('context', {}).get('custom', {})
            gender = ctx.get('gender', '').lower()
            age    = ctx.get('age', '')
            if not gender or not age:
                # Fall back to parsing public_id
                pid = img.get('public_id', '').split('/')[-1]
                if '-female-' in pid.lower():
                    gender = 'female'
                elif '-male-' in pid.lower():
                    gender = 'male'
                # Parse age from filename
                for a in AGE_ORDER:
                    if a.lower() in pid.lower():
                        age = a
                        break

            combo_key = f'{gender}_{age}'
            if combo_key not in grouped:
                grouped[combo_key] = []
            grouped[combo_key].append(img)

        # For each gender+age combo, pick one showcase image
        # Also keep a list of all image public_ids for that combo
        combos_added = set()
        for gender in ['female', 'male']:
            for age in AGE_ORDER:
                combo_key = f'{gender}_{age}'
                if combo_key not in grouped:
                    continue
                if combo_key in combos_added:
                    continue
                combos_added.add(combo_key)

                imgs = grouped[combo_key]
                showcase = imgs[0]  # first image as showcase
                all_public_ids = [img['public_id'] for img in imgs]

                all_characters.append({
                    'id':           showcase['public_id'],
                    'type':         key,
                    'typeLabel':    label,
                    'emoji':        char_type['emoji'],
                    'gender':       gender,
                    'age':          age,
                    'imageUrl':     cloudinary_url(showcase['public_id'], 400),
                    'fullRes':      cloudinary_url(showcase['public_id'], 1200),
                    'totalImages':  len(imgs),
                    'allImages':    all_public_ids,
                })

        time.sleep(0.3)  # be polite to Cloudinary

    # Save to characters.json
    output = {
        'generated':  __import__('datetime').datetime.now().isoformat(),
        'totalImages': total_images,
        'characters': all_characters,
    }

    with open('characters.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print()
    print(f'Done!')
    print(f'Total images: {total_images}')
    print(f'Character variants: {len(all_characters)}')
    print(f'Saved to: characters.json')
    print()
    print('Next step: copy characters.json into your faceswapgifts folder')
    print('and redeploy to Netlify.')
    input('\nPress Enter to close...')

if __name__ == '__main__':
    main()
