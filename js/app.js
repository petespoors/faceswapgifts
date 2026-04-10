// ═══════════════════════════════════════════
// FACESWAPGIFTS.CO.UK — MAIN APP v6.01
// ═══════════════════════════════════════════

const CONFIG = {
  segmindApiKey:          'SG_3a1babf77f819ac3',
  segmindFaceswapModel:   'https://api.segmind.com/v1/faceswap-v5',
  stripePublicKey:        'pk_test_51TFy0dDcAbosXrTZToO6ls2eWiErnlUyE2QTtEsHrtBRQ6DHpy8sNPrXBts9QIlmslELGADbg0yg6cZHKRZUJ0TF0043DYi2Xy',
  workerUrl:              'https://eswapgifts.faceswapgifts.workers.dev',
  cloudinaryCloud:        'dcyp4e7sp',
  cloudinaryUploadPreset: 'faceswapgifts',
  deliveryPrice:          3.99,
  freeDeliveryThreshold:  30.00,
  version:                'v6.23',
  versionDate:            'April 2026',

  workerAdminKey: '1MissionImpossible2!',
  gelatoProducts: {
    mug:       'mug_product_msz_10-oz-slim_mmat_porcelain-white_cl_4-0',
    tote:      'bag_product_bsc_tote-bag_bqa_prm_bsi_std-t_bco_natural_bpr_4-0',
    pillow:    'YOUR_PILLOW_UID',
    blanket:   'YOUR_BLANKET_UID',
    canvas:    'YOUR_CANVAS_UID',
    tshirt:    'YOUR_TSHIRT_UID',
    phonecase: 'YOUR_PHONECASE_UID',
    poster:    'YOUR_POSTER_UID',
  },
};

// ══════════════════════════════════════════
// FETCH LIVE SHIPPING SETTINGS
// ══════════════════════════════════════════
async function loadShippingSettings() {
  try {
    const res  = await fetch(CONFIG.workerUrl + '/get-shipping');
    const data = await res.json();
    if (data.shippingPrice !== undefined)
      CONFIG.deliveryPrice = data.shippingPrice;
    if (data.freeShippingThreshold !== undefined)
      CONFIG.freeDeliveryThreshold = data.freeShippingThreshold;
  } catch(e) {
    console.warn('Could not load shipping settings — using defaults');
  }
}

// ══════════════════════════════════════════
// GIFT CARD VALIDATION
// ══════════════════════════════════════════
async function applyGiftCard() {
  const code  = document.getElementById('giftCardInput') ?
                document.getElementById('giftCardInput').value.trim().toUpperCase() : '';
  const msgEl = document.getElementById('giftCardMsg');
  if (!code) { if (msgEl) { msgEl.textContent = 'Please enter a code'; msgEl.style.color = 'red'; } return; }

  try {
    const res  = await fetch(CONFIG.workerUrl + '/validate-gift-card', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();

    if (!data.valid) {
      if (msgEl) { msgEl.textContent = '❌ ' + data.error; msgEl.style.color = 'red'; }
      state.giftCard = null;
      return;
    }

    state.giftCard = { code: data.code, remaining: data.remaining, expiry: data.expiry };
    if (msgEl) {
      msgEl.textContent = `✅ Gift card applied — £${data.remaining.toFixed(2)} available`;
      msgEl.style.color = '#0E9F8A';
    }
    updateCheckoutSummary();

  } catch(e) {
    if (msgEl) { msgEl.textContent = '❌ Could not validate code'; msgEl.style.color = 'red'; }
  }
}

;

// ── STATE ──
let state = {
  allCharacters: [],       // loaded from Cloudinary
  filteredCharacters: [],
  selectedChar: null,
  uploadedPhoto: null,
  swappedImageUrl: null,
  selectedProduct: null,
  selectedProductPrice: 0,
  currentUser: null,
};

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  checkLoggedIn();
  loadCharactersFromCloudinary();
});

// ══════════════════════════════════════════
// LOAD & DISPLAY CHARACTER TYPES (Step 1A)
// ══════════════════════════════════════════
async function loadCharactersFromCloudinary() {
  loadShippingSettings(); // fetch live shipping prices
  try {
    const res = await fetch('characters.json?v=' + Date.now());
    if (!res.ok) throw new Error('characters.json not found');
    const data = await res.json();
    state.allCharacters = data.characters || [];
    renderTypeGrid();
  } catch(err) {
    console.error('Failed to load characters:', err);
    const grid = document.getElementById('typeGrid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888;">Could not load characters. Please refresh the page.</div>';
  }
}

function renderTypeGrid() {
  const grid = document.getElementById('typeGrid');
  if (!grid) return;

  // Get unique types with counts
  const typeMap = {};
  state.allCharacters.forEach(c => {
    if (!typeMap[c.type]) {
      typeMap[c.type] = { key: c.type, label: c.typeLabel, emoji: c.emoji, count: 0 };
    }
    typeMap[c.type].count += c.totalImages || 1;
  });

  const types = Object.values(typeMap).sort((a,b) => a.label.localeCompare(b.label));
  grid.innerHTML = '';

  types.forEach(type => {
    // Pick a RANDOM character variant for showcase — different each page load
    const variants = state.allCharacters.filter(c => c.type === type.key);
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];
    // Then pick a random image from that variant's pool
    let imgUrl = '';
    if (randomVariant && randomVariant.allImages && randomVariant.allImages.length > 0) {
      const CLOUD = 'dcyp4e7sp';
      const randomId = randomVariant.allImages[Math.floor(Math.random() * randomVariant.allImages.length)];
      imgUrl = `https://res.cloudinary.com/${CLOUD}/image/upload/w_400,c_fill,q_auto,f_auto/${randomId}.jpg`;
    } else if (randomVariant) {
      imgUrl = randomVariant.imageUrl;
    }

    const div = document.createElement('div');
    div.className = 'type-card';
    div.onclick = () => selectType(type.key, type.label);
    div.innerHTML = imgUrl
      ? `<img src="${imgUrl}" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px;margin-bottom:10px;" onerror="this.style.display='none'">`
      : `<span class="type-card-emoji">${type.emoji}</span>`;
    div.innerHTML += `
      <div class="type-card-name">${type.label}</div>
      <div class="type-card-count">${type.count} images</div>`;
    grid.appendChild(div);
  });
}

function selectType(typeKey, typeLabel) {
  state.selectedType = typeKey;

  // Filter characters for this type
  state.typeCharacters = state.allCharacters.filter(c => c.type === typeKey);

  // Update step 1b title
  document.getElementById('step1bTitle').textContent = `Choose Your ${typeLabel} Character`;

  // Reset filters
  document.getElementById('filterGender').value = 'all';
  document.getElementById('filterAge').value = 'all';

  // Show step 1b
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step1b').classList.remove('hidden');

  renderCharacterImages(state.typeCharacters);
}

function showTypeGrid() {
  document.getElementById('step1b').classList.add('hidden');
  document.getElementById('step1').classList.remove('hidden');
  state.selectedType = null;
}

function filterCharacterImages() {
  const gender = document.getElementById('filterGender').value;
  const age    = document.getElementById('filterAge').value;
  const ageMap = {
    'toddler': 'toddler', 'child': 'child 6-9',
    'teenager': 'teenager', 'young-adult': 'young adult', 'older-adult': 'older adult'
  };

  let filtered = state.typeCharacters || [];
  if (gender !== 'all') filtered = filtered.filter(c => c.gender === gender);
  if (age !== 'all') filtered = filtered.filter(c => c.age.toLowerCase().includes(ageMap[age] || age));

  renderCharacterImages(filtered);
}

// ══════════════════════════════════════════
// CHARACTER GRID (Step 1B — exact images)
// ══════════════════════════════════════════
function renderCharacterImages(characters) {
  const grid = document.getElementById('charGrid');
  const noResults = document.getElementById('noResults');
  if (!grid) return;
  grid.innerHTML = '';

  if (characters.length === 0) {
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  // Show ALL individual images for customer to pick exact one
  characters.forEach(variant => {
    if (!variant.allImages || variant.allImages.length === 0) return;

    variant.allImages.forEach(publicId => {
      const CLOUD = 'dcyp4e7sp';
      const displayUrl = `https://res.cloudinary.com/${CLOUD}/image/upload/w_400,c_fill,q_auto,f_auto/${publicId}.jpg`;
      const fullRes    = `https://res.cloudinary.com/${CLOUD}/image/upload/w_1200,c_fill,q_auto,f_auto/${publicId}.jpg`;

      const div = document.createElement('div');
      div.className = 'char-card';
      div.onclick = () => selectCharacter({
        ...variant,
        id: publicId,
        imageUrl: displayUrl,
        fullRes: fullRes,
      }, div);

      div.innerHTML = `
        <img class="char-img" src="${displayUrl}" alt="${variant.typeLabel}"
             loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="char-placeholder" style="display:none">${variant.emoji}</div>
        <div class="char-info">
          <div class="char-name">${variant.typeLabel}</div>
          <div class="char-meta">${capitalise(variant.gender)} · ${variant.age}</div>
        </div>`;
      grid.appendChild(div);
    });
  });
}

// ══════════════════════════════════════════
// CHARACTER GRID
// ══════════════════════════════════════════
function renderCharacterGrid(characters) {
  const grid = document.getElementById('charGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (characters.length === 0) {
    document.getElementById('noResults').style.display = 'block';
    return;
  }
  document.getElementById('noResults').style.display = 'none';

  characters.forEach(char => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.dataset.id = char.id;
    div.onclick = () => selectCharacter(char, div);

    // Pick a random image from the pool to show diversity
    const CLOUD = 'dcyp4e7sp';
    let displayUrl = char.imageUrl;
    if (char.allImages && char.allImages.length > 1) {
      const randomId = char.allImages[Math.floor(Math.random() * char.allImages.length)];
      displayUrl = `https://res.cloudinary.com/${CLOUD}/image/upload/w_400,c_fill,q_auto,f_auto/${randomId}.jpg`;
    }

    div.innerHTML = `
      <img class="char-img" src="${displayUrl}" alt="${char.typeLabel}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="char-placeholder" style="display:none">${char.emoji}</div>
      <div class="char-info">
        <div class="char-name">${char.typeLabel}</div>
        <div class="char-meta">${capitalise(char.gender)} · ${char.age}</div>
      </div>`;
    grid.appendChild(div);
  });
}

function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function filterCharacters() {
  const type    = document.getElementById('filterType').value;
  const gender  = document.getElementById('filterGender').value;
  const age     = document.getElementById('filterAge').value;

  // Age filter values map to age strings
  const ageMap = {
    'toddler':     'toddler',
    'child':       'child 6-9',
    'teenager':    'teenager',
    'young-adult': 'young adult',
    'older-adult': 'older adult',
  };

  state.filteredCharacters = state.allCharacters.filter(c => {
    const typeMatch   = type   === 'all' || c.type === type;
    const genderMatch = gender === 'all' || c.gender === gender;
    const ageMatch    = age    === 'all' || c.age.toLowerCase().includes(ageMap[age] || age);
    return typeMatch && genderMatch && ageMatch;
  });

  renderCharacterGrid(state.filteredCharacters);
}

function selectCharacter(char, el) {
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  // Use EXACTLY the image the customer clicked — no randomness
  state.selectedChar = {
    ...char,
    // fullRes already set correctly when card was created
  };

  const preview = document.getElementById('selectedCharPreview');
  preview.innerHTML = `<span style="font-size:28px">${char.emoji}</span> You chose: <strong>${char.typeLabel} — ${capitalise(char.gender)} — ${char.age}</strong>`;

  setTimeout(() => goToStep(2), 300);
}

// ══════════════════════════════════════════
// STEP NAVIGATION
// ══════════════════════════════════════════
function goToStep(n) {
  // Hide both step1 variants when moving forward
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step1b').classList.add('hidden');
  [2,3,4].forEach(i => document.getElementById(`step${i}`).classList.add('hidden'));

  // Show the right step
  if (n === 1) {
    document.getElementById('step1').classList.remove('hidden');
  } else {
    document.getElementById(`step${n}`).classList.remove('hidden');
  }

  // Update progress bar
  [1,2,3,4].forEach(i => {
    const prog = document.getElementById(`prog${i}`);
    prog.classList.remove('active','done');
    if (i === n) prog.classList.add('active');
    if (i < n)  prog.classList.add('done');
  });

  document.getElementById('builder').scrollIntoView({ behavior: 'smooth' });
  if (n === 4) initStripe(); // initialise Stripe Elements when checkout shown
}

// ══════════════════════════════════════════
// PHOTO UPLOAD & FACE SWAP
// ══════════════════════════════════════════
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (file) processPhoto(file);
}

function processPhoto(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    state.uploadedPhoto = e.target.result;
    performFaceSwap();
  };
  reader.readAsDataURL(file);
}

async function performFaceSwap() {
  document.getElementById('uploadArea').classList.add('hidden');
  document.getElementById('swapProgress').classList.remove('hidden');
  document.getElementById('swapResult').classList.add('hidden');

  const progressMsg = document.querySelector('#swapProgress p');
  if (progressMsg) progressMsg.innerHTML = 'Swapping your face onto the character... <strong>about 30 seconds</strong>';

  // Log to on-screen debug area
  debugLog('Starting face swap...');
  debugLog('Character: ' + state.selectedChar.typeLabel);
  debugLog('Target URL: ' + state.selectedChar.fullRes);

  try {
    // Get target image as base64
    // We must convert from URL because Segmind v5 requires base64, not URL
    debugLog('Fetching character image...');
    let targetBase64;
    try {
      targetBase64 = await urlToBase64(state.selectedChar.fullRes);
      debugLog('Character image fetched OK, size: ' + targetBase64.length + ' chars');
    } catch(fetchErr) {
      throw new Error('Could not load character image: ' + fetchErr.message);
    }

    // Get source (selfie) base64 — strip the data:image/...;base64, prefix
    const sourceBase64 = state.uploadedPhoto.includes(',')
      ? state.uploadedPhoto.split(',')[1]
      : state.uploadedPhoto;

    debugLog('Selfie size: ' + sourceBase64.length + ' chars');

    if (!targetBase64 || targetBase64.length < 100) {
      throw new Error('Character image is empty or too small');
    }
    if (!sourceBase64 || sourceBase64.length < 100) {
      throw new Error('Selfie image is empty or too small');
    }

    const payload = {
      source_image:       sourceBase64,
      target_image:       targetBase64,
      input_faces_index:  0,
      source_faces_index: 0,
      face_restore:       true,
      base64_encoded:     true,
      output_format:      'jpg',
    };

    debugLog('Sending to Segmind v5...');

    const response = await fetch(CONFIG.segmindFaceswapModel, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.segmindApiKey,
      },
      body: JSON.stringify(payload)
    });

    debugLog('Segmind response status: ' + response.status);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Segmind ' + response.status + ': ' + errText);
    }

    // Segmind v5 returns raw binary JPEG, not JSON
    const contentType = response.headers.get('content-type') || '';
    debugLog('Content-Type: ' + contentType);

    let imageUrl;

    if (contentType.includes('application/json')) {
      // JSON response with base64 image
      const data = await response.json();
      if (!data.image) throw new Error('No image in JSON. Keys: ' + Object.keys(data).join(', '));
      imageUrl = 'data:image/jpeg;base64,' + data.image;
    } else {
      // Raw binary image response — convert blob to data URL
      const blob = await response.blob();
      debugLog('Received blob size: ' + blob.size + ' bytes, type: ' + blob.type);
      imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    state.swappedImageUrl = imageUrl;
    debugLog('Face swap successful!');
    showSwapResult(imageUrl);

  } catch (err) {
    console.error('Face swap error:', err);
    debugLog('ERROR: ' + err.message);
    document.getElementById('swapProgress').classList.add('hidden');
    document.getElementById('uploadArea').classList.remove('hidden');
    showToast('Face swap failed: ' + err.message, 'error');
  }
}

// Convert a URL to base64 string
async function urlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' fetching ' + url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Compress an image to reduce size before sending to API
async function compressImageBase64(dataUrl, quality, maxSize) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      // Scale down if larger than maxSize
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed.split(',')[1]);
    };
    img.src = dataUrl;
  });
}

// ══════════════════════════════════════════
// STRIPE ELEMENTS INITIALISATION
// ══════════════════════════════════════════
let stripe       = null;
let cardElement  = null;
let gcCardElement = null;

function initStripe() {
  if (stripe) return; // already initialised
  stripe = Stripe(CONFIG.stripePublicKey);
  const elements = stripe.elements();

  // Product checkout card element
  const cardEl = document.getElementById('stripe-card-element');
  if (cardEl) {
    cardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          fontFamily: "'Nunito', sans-serif",
          color: '#1C1C2E',
          '::placeholder': { color: '#aab7c4' },
        },
        invalid: { color: '#E24B4A' },
      }
    });
    cardElement.mount('#stripe-card-element');
    cardElement.on('change', e => {
      document.getElementById('stripe-card-errors').textContent = e.error ? e.error.message : '';
    });
  }

  // Gift card purchase card element
  const gcCardEl = document.getElementById('gc-stripe-card-element');
  if (gcCardEl) {
    gcCardElement = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          fontFamily: "'Nunito', sans-serif",
          color: '#1C1C2E',
          '::placeholder': { color: '#aab7c4' },
        },
        invalid: { color: '#E24B4A' },
      }
    });
    gcCardElement.mount('#gc-stripe-card-element');
    gcCardElement.on('change', e => {
      document.getElementById('gc-stripe-card-errors').textContent = e.error ? e.error.message : '';
    });
  }
}

// Initialise Stripe when page loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initStripe, 500);
});

// ══════════════════════════════════════════
// GIFT CARD PURCHASE (customer-facing)
// ══════════════════════════════════════════
let gcSelectedAmount = 25;

function selectGcAmount(amount, btn, isCustom = false) {
  gcSelectedAmount = parseFloat(amount) || 0;

  // Update preset button styles
  if (!isCustom) {
    document.querySelectorAll('.gc-preset-btn').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');
    document.getElementById('gcCustomAmount').value = '';
  } else {
    document.querySelectorAll('.gc-preset-btn').forEach(b => b.classList.remove('selected'));
  }

  // Update total display
  const totalEl = document.getElementById('gcTotalDisplay');
  if (totalEl) totalEl.textContent = gcSelectedAmount > 0 ? `£${gcSelectedAmount.toFixed(2)}` : '£—';
}

async function purchaseGiftCard() {
  const recipientName  = document.getElementById('gcRecipientName').value.trim();
  const recipientEmail = document.getElementById('gcRecipientEmail').value.trim().replace(/[^a-zA-Z0-9@._+-]/g,'').toLowerCase();
  const senderName     = document.getElementById('gcSenderName').value.trim();
  const message        = document.getElementById('gcPersonalMessage') ? document.getElementById('gcPersonalMessage').value.trim() : '';
  const btn            = document.getElementById('gcPayBtn');

  // Validate
  if (!recipientName)  { showToast('Please enter recipient name', 'error'); return; }
  if (!recipientEmail || !recipientEmail.includes('@')) { showToast('Please enter a valid recipient email', 'error'); return; }
  if (!senderName)     { showToast('Please enter your name', 'error'); return; }
  if (!gcSelectedAmount || gcSelectedAmount < 5) { showToast('Please select or enter an amount (minimum £5)', 'error'); return; }
  if (gcSelectedAmount > 200) { showToast('Maximum gift card amount is £200', 'error'); return; }
  if (!gcCardElement)  { showToast('Payment not ready — please refresh and try again', 'error'); return; }

  btn.textContent = 'Processing...';
  btn.disabled    = true;

  try {
    // Step 1 — Create payment intent via Worker
    debugLog('Creating gift card payment intent...');
    const orderRef = generateOrderRef();

    const intentRes = await fetch(CONFIG.workerUrl + '/stripe-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: gcSelectedAmount, currency: 'gbp', orderRef }),
    });
    const intentData = await intentRes.json();
    if (!intentData.success) throw new Error('Payment setup failed: ' + (intentData.error || 'unknown'));

    debugLog('Payment intent created: ' + intentData.paymentIntentId);

    // Step 2 — Confirm payment with card details
    btn.textContent = 'Confirming payment...';
    const { paymentIntent, error } = await stripe.confirmCardPayment(intentData.clientSecret, {
      payment_method: { card: gcCardElement }
    });

    if (error) throw new Error(error.message);
    if (paymentIntent.status !== 'succeeded') throw new Error('Payment not completed');

    debugLog('Payment confirmed!');

    // Step 3 — Create gift card in Worker
    btn.textContent = 'Creating gift card...';

    // Expiry = 1 year from today
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryStr = expiry.toISOString().split('T')[0];

    const gcRes = await fetch(CONFIG.workerUrl + '/create-gift-card', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': CONFIG.workerAdminKey },
      body: JSON.stringify({
        amount:    gcSelectedAmount,
        expiry:    expiryStr,
        note:      `Purchased by ${senderName} for ${recipientName}`,
        source:    'customer',
        purchasedBy: senderName,
        recipientName,
        recipientEmail,
        paymentIntentId: paymentIntent.id,
      }),
    });
    const gcData = await gcRes.json();
    if (!gcData.success) throw new Error('Gift card creation failed');

    debugLog('Gift card created: ' + gcData.code);

    // Step 4 — Send email via EmailJS
    btn.textContent = 'Sending email...';
    if (typeof emailjs !== 'undefined') {
      await emailjs.send('service_k1hxvoj', 'template_fc6gxpz', {
        to_name:        recipientName,
        to_email:       recipientEmail,
        gift_card_code: gcData.code,
        amount:         gcSelectedAmount.toFixed(2),
        expiry:         new Date(expiryStr).toLocaleDateString('en-GB'),
        note:           message ? `Message from ${senderName}: ${message}` : `From ${senderName}`,
        site_url:       'https://faceswapgifts.co.uk',
      });
      debugLog('Gift card email sent!');
    }

    // Step 5 — Show success
    btn.textContent  = '🎁 Buy Gift Card';
    btn.disabled     = false;
    showToast(`Gift card sent to ${recipientEmail}! 🎉`, 'success');

    // Reset form
    document.getElementById('gcRecipientName').value  = '';
    document.getElementById('gcRecipientEmail').value = '';
    document.getElementById('gcSenderName').value     = '';
    if (document.getElementById('gcPersonalMessage'))
      document.getElementById('gcPersonalMessage').value = '';
    gcCardElement.clear();
    selectGcAmount(25, document.querySelectorAll('.gc-preset-btn')[2]);

  } catch(err) {
    debugLog('Gift card purchase error: ' + err.message);
    showToast('Error: ' + err.message, 'error');
    btn.textContent = '🎁 Buy Gift Card';
    btn.disabled    = false;
  }
}

// ── DEBUG LOGGER ──
// Shows on screen so you can see exactly what's happening
function debugLog(msg) {
  console.log('[FSG]', msg);
  let box = document.getElementById('debugBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'debugBox';
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1C1C2E;color:#0E9F8A;' +
      'font-family:monospace;font-size:11px;padding:8px 12px;max-height:120px;overflow-y:auto;' +
      'z-index:9999;border-top:2px solid #F07A1A;';
    box.innerHTML = '<div style="color:#F07A1A;font-weight:bold;margin-bottom:4px;">Debug log — remove before going live <button onclick="document.getElementById(\'debugBox\').remove()" style="float:right;background:none;border:1px solid #F07A1A;color:#F07A1A;cursor:pointer;padding:0 6px;">✕</button></div>';
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  line.textContent = new Date().toLocaleTimeString() + ' — ' + msg;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function showSwapResult(imageUrl) {
  document.getElementById('swapProgress').classList.add('hidden');
  document.getElementById('swapResult').classList.remove('hidden');
  document.getElementById('resultImage').src = imageUrl;
  document.getElementById('resultCharName').textContent = state.selectedChar?.typeLabel || 'character';
}

function retakePhoto() {
  state.uploadedPhoto = null;
  state.swappedImageUrl = null;
  document.getElementById('uploadArea').classList.remove('hidden');
  document.getElementById('swapResult').classList.add('hidden');
  document.getElementById('swapProgress').classList.add('hidden');
  document.getElementById('photoInput').value = '';
}

// ══════════════════════════════════════════
// PRODUCT SELECTION
// ══════════════════════════════════════════
const PRODUCT_OPTIONS = {
  phonecase: { label: 'Phone model', options: ['iPhone 15 Pro Max','iPhone 15 Pro','iPhone 15','iPhone 14 Pro Max','iPhone 14','Samsung Galaxy S24 Ultra','Samsung Galaxy S24+','Samsung Galaxy S24','Samsung Galaxy S23'] },
  tshirt:    { label: 'Size', options: ['XS','S','M','L','XL','2XL','3XL'] },
  canvas:    { label: 'Size', options: ['A4 (21×30cm)','A3 (30×42cm)','A2 (42×59cm)','50×50cm Square','60×80cm Large'] },
  poster:    { label: 'Size', options: ['A3 (30×42cm) — £12.99','A2 (42×59cm) — £18.99'] },
};

function selectProduct(el, name, price, type) {
  document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedProduct = { name, price, type };
  state.selectedProductPrice = price;

  const optionsDiv    = document.getElementById('productOptions');
  const optionsSelect = document.getElementById('productOptionsSelect');
  const optionsLabel  = document.getElementById('productOptionsLabel');

  if (PRODUCT_OPTIONS[type]) {
    optionsLabel.textContent = PRODUCT_OPTIONS[type].label;
    optionsSelect.innerHTML  = PRODUCT_OPTIONS[type].options.map(o => `<option>${o}</option>`).join('');
    optionsDiv.style.display = 'block';
  } else {
    optionsDiv.style.display = 'none';
  }

  updateCheckoutSummary();

  // Generate AI product mockup
  if (state.swappedImageUrl) generateProductMockup(type, name);

  setTimeout(() => goToStep(4), 300);
}

// ══════════════════════════════════════════
// AI PRODUCT MOCKUP GENERATION
// Uses Segmind img2img to place the face-swapped
// image realistically onto the chosen product
// ══════════════════════════════════════════

const PRODUCT_PROMPTS = {
  mug:       'product photography of a white ceramic coffee mug with a portrait image printed on it, sitting on a wooden table, soft natural lighting, professional product shot, white background, high quality',
  pillow:    'product photography of a square decorative cushion pillow with a portrait image printed on it, on a sofa, soft natural lighting, professional product shot, high quality',
  blanket:   'product photography of a soft fleece blanket with a portrait image printed on it, folded neatly, warm lighting, professional product shot, high quality',
  phonecase: 'product photography of a smartphone with a custom printed phone case showing a portrait image, on a white surface, professional product shot, high quality',
  canvas:    'product photography of a stretched canvas print showing a portrait image, hanging on a white wall, gallery lighting, professional product shot, high quality',
  tshirt:    'product photography of a white t-shirt with a portrait image printed on the front, on a mannequin, soft studio lighting, professional product shot, high quality',
  tote:      'product photography of a white cotton tote bag with a portrait image printed on it, on a white surface, professional product shot, high quality',
  poster:    'product photography of a high gloss poster print showing a portrait image, pinned to a white wall, studio lighting, professional product shot, high quality',
};

async function generateProductMockup(productType, productName) {
  const mockupWrap = document.getElementById('mockupWrap');
  const mockupImg  = document.getElementById('mockupFaceImage');
  const mockupLabel = document.getElementById('mockupLabel');

  // Show loading state
  mockupLabel.textContent = `Generating ${productName} preview...`;
  mockupImg.style.opacity = '0.3';

  try {
    const prompt = PRODUCT_PROMPTS[productType] ||
      `product photography of a ${productName} with a custom portrait image printed on it, professional product shot, white background, high quality`;

    // Use Segmind img2img — feed in the face-swapped image, generate product mockup
    const sourceBase64 = state.swappedImageUrl.split(',')[1];

    const payload = {
      prompt:           prompt,
      negative_prompt:  'blurry, low quality, distorted face, ugly, bad proportions, watermark, text',
      init_image:       sourceBase64,
      strength:         0.65,  // how much to transform — 0=keep original, 1=ignore original
      guidance_scale:   7.5,
      num_inference_steps: 25,
      samples:          1,
      base64_encoded:   true,
      output_format:    'jpg',
      img_width:        1024,
      img_height:       1024,
    };

    const response = await fetch('https://api.segmind.com/v1/sdxl1.0-img2img', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.segmindApiKey,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Mockup error ${response.status}`);
    const data = await response.json();

    const mockupUrl = `data:image/jpeg;base64,${data.image}`;
    state.mockupImageUrl = mockupUrl;
    mockupImg.src = mockupUrl;
    mockupImg.style.opacity = '1';
    mockupLabel.textContent = productName;

  } catch (err) {
    console.error('Mockup generation error:', err);
    // Fall back to showing the face-swapped image directly
    mockupImg.src = state.swappedImageUrl;
    mockupImg.style.opacity = '1';
    mockupLabel.textContent = productName;
  }
}

function updateCheckoutSummary() {
  if (!state.selectedChar || !state.selectedProduct) return;
  const delivery  = state.selectedProductPrice >= CONFIG.freeDeliveryThreshold ? 0 : CONFIG.deliveryPrice;
  const subtotal  = state.selectedProductPrice + delivery;
  const gcAmount  = state.giftCard ? Math.min(state.giftCard.remaining, subtotal) : 0;
  const total     = Math.max(0, subtotal - gcAmount).toFixed(2);
  state.orderTotal = parseFloat(total);

  document.getElementById('summaryChar').textContent    = `${state.selectedChar.typeLabel} — ${capitalise(state.selectedChar.gender)}`;
  document.getElementById('summaryProduct').textContent = state.selectedProduct.name;
  document.getElementById('summaryPrice').textContent   = `£${total}`;
  document.getElementById('osProd').textContent         = `£${state.selectedProductPrice.toFixed(2)}`;
  document.getElementById('osTotal').textContent        = `£${total}`;
  document.getElementById('mockupLabel').textContent    = state.selectedProduct.name;

  if (state.swappedImageUrl) document.getElementById('mockupFaceImage').src = state.swappedImageUrl;
}

// ══════════════════════════════════════════
// PAYMENT
// ══════════════════════════════════════════
async function initiatePayment() {
  const name     = document.getElementById('custName').value.trim();
  const email    = document.getElementById('custEmail').value.trim();
  const addr1    = document.getElementById('custAddr1').value.trim();
  const postcode = document.getElementById('custPostcode').value.trim();

  if (!name || !email || !addr1 || !postcode) { showToast('Please fill in your name, email and delivery address.', 'error'); return; }
  if (!email.includes('@')) { showToast('Please enter a valid email address.', 'error'); return; }

  const btn = document.getElementById('payBtn');
  btn.textContent = 'Processing your order...';
  btn.disabled = true;

  try {
    // Step 1 — Upload face-swapped image to Cloudinary for permanent public URL
    let imageUrl = '';
    if (state.swappedImageUrl) {
      try {
        imageUrl = await uploadSwappedImageToCloudinary(state.swappedImageUrl);
        state.swappedImagePublicUrl = imageUrl;
      } catch(uploadErr) {
        debugLog('Image upload failed: ' + uploadErr.message + ' — continuing without print');
      }
    }

    // Step 2 — Create Stripe Payment Intent via Worker
    debugLog('Creating Stripe payment intent...');
    btn.textContent = 'Preparing payment...';
    const total = (state.selectedProductPrice || 0) + CONFIG.deliveryPrice;
    const orderRef = generateOrderRef();

    // Redeem gift card first if applied
    let gcAmountUsed = 0;
    if (state.giftCard) {
      try {
        const gcRes = await fetch(CONFIG.workerUrl + '/redeem-gift-card', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code:        state.giftCard.code,
            orderRef,
            amountToUse: Math.min(state.giftCard.remaining, total),
          }),
        });
        const gcData = await gcRes.json();
        if (gcData.success) {
          gcAmountUsed = gcData.amountUsed;
          debugLog('Gift card redeemed: £' + gcAmountUsed.toFixed(2));
        }
      } catch(gcErr) {
        debugLog('Gift card redemption error: ' + gcErr.message);
      }
    }

    const amountToCharge = Math.max(0, total - gcAmountUsed);
    const stripeRes = await fetch(CONFIG.workerUrl + '/stripe-payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountToCharge, currency: 'gbp', orderRef }),
    });
    const stripeData = await stripeRes.json();
    debugLog('Stripe: ' + JSON.stringify(stripeData).substring(0, 150));
    if (!stripeData.success) throw new Error('Payment setup failed: ' + (stripeData.error || 'unknown'));
    state.paymentIntentId = stripeData.paymentIntentId;
    state.clientSecret    = stripeData.clientSecret;

    // Step 2b — Confirm card payment with Stripe Elements
    if (stripeData.clientSecret && cardElement && stripe) {
      btn.textContent = 'Confirming payment...';
      debugLog('Confirming card payment...');
      const { paymentIntent, error } = await stripe.confirmCardPayment(stripeData.clientSecret, {
        payment_method: { card: cardElement }
      });
      if (error) throw new Error(error.message);
      if (paymentIntent.status !== 'succeeded') throw new Error('Payment not completed — please try again');
      debugLog('Payment confirmed! ID: ' + paymentIntent.id);
    }

    // Step 3 — Place Gelato print order via Worker
    const customerDetails = {
      name:     name,
      email:    email,
      addr1:    addr1,
      addr2:    document.getElementById('custAddr2') ? document.getElementById('custAddr2').value.trim() : '',
      city:     document.getElementById('custCity')  ? document.getElementById('custCity').value.trim()  : '',
      postcode: postcode,
      phone:    document.getElementById('custPhone') ? document.getElementById('custPhone').value.trim() : '',
    };

    if (imageUrl && state.selectedProduct) {
      try {
        btn.textContent = 'Sending to print...';
        const productUid = CONFIG.gelatoProducts[state.selectedProduct.type];
        if (productUid && !productUid.startsWith('YOUR_')) {
          await placeGelatoOrder(orderRef, imageUrl, customerDetails, state.selectedProduct);
          debugLog('Print order placed!');
        } else {
          debugLog('No UID for ' + state.selectedProduct.type + ' — skipping print');
        }
      } catch(gelatoErr) {
        debugLog('Gelato error: ' + gelatoErr.message);
      }
    }

    // Step 4 — Show success
    document.getElementById('orderRef').textContent = orderRef;
    openModal('successModal');
    btn.textContent = '🔒 Pay Securely with Stripe';
    btn.disabled = false;

  } catch(err) {
    debugLog('Order error: ' + err.message);
    showToast('Something went wrong placing your order. Please try again.', 'error');
    btn.textContent = '🔒 Pay Securely with Stripe';
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════
// AIRTABLE
// ══════════════════════════════════════════
async function saveOrderToAirtable(name, email, addr1, postcode, imageUrl = '') {
  const orderRef = 'FSG-' + Date.now().toString(36).toUpperCase();
  const delivery = state.selectedProductPrice >= CONFIG.freeDeliveryThreshold ? 0 : CONFIG.deliveryPrice;
  const total    = (state.selectedProductPrice + delivery).toFixed(2);

  try {
    await fetch(`https://api.airtable.com/v0/${CONFIG.airtableBaseId}/${CONFIG.airtableTableName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${CONFIG.airtableApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        'Order Ref': orderRef, 'Status': 'New',
        'Customer Name': name, 'Customer Email': email,
        'Delivery Address': `${addr1}, ${document.getElementById('custAddr2').value}, ${postcode}`,
        'Character': `${state.selectedChar?.typeLabel} — ${capitalise(state.selectedChar?.gender)}`,
        'Product': state.selectedProduct?.name,
        'Order Total': parseFloat(total),
        'Gift Message': document.getElementById('giftMessage').value,
        'Swapped Image URL': imageUrl || state.swappedImageUrl || '',
        'Ordered At': new Date().toISOString(),
      }})
    });
  } catch(err) { console.error('Airtable error:', err); }
  return orderRef;
}

// ══════════════════════════════════════════
// ORDER REFERENCE GENERATOR
// ══════════════════════════════════════════
function generateOrderRef() {
  return 'FSG-' + Date.now().toString(36).toUpperCase().slice(-6) +
         Math.random().toString(36).toUpperCase().slice(2, 5);
}

// ══════════════════════════════════════════
// GELATO PRINT FULFILMENT
// ══════════════════════════════════════════

async function uploadSwappedImageToCloudinary(base64DataUrl) {
  // Upload face-swapped image to Cloudinary so we have a public URL
  // Gelato needs a URL, not base64
  debugLog('Uploading swapped image to Cloudinary...');

  const formData = new FormData();
  // Convert base64 to blob
  const response = await fetch(base64DataUrl);
  const blob = await response.blob();
  formData.append('file', blob, 'faceswap.jpg');
  formData.append('upload_preset', CONFIG.cloudinaryUploadPreset);
  formData.append('folder', 'faceswapgifts/orders');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.cloudinaryCloud}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Failed to upload image to Cloudinary');
  const data = await res.json();
  debugLog('Image uploaded: ' + data.secure_url);
  return data.secure_url;
}

async function placeGelatoOrder(orderRef, imageUrl, customerDetails, product) {
  debugLog('Placing Gelato order...');

  const productUid = CONFIG.gelatoProducts[product.type];
  if (!productUid || productUid.startsWith('YOUR_')) {
    debugLog('No Gelato UID for product: ' + product.type + ' — skipping print order');
    return null;
  }

  // Split customer name into first/last
  const nameParts = customerDetails.name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || firstName;

  const orderPayload = {
    orderType:          'order',
    orderReferenceId:   orderRef,
    customerReferenceId: customerDetails.email,
    currency:           'GBP',
    items: [{
      itemReferenceId: orderRef + '-1',
      productUid:      productUid,
      files: [{
        type: 'default',
        url:  imageUrl,
      }],
      quantity: 1,
    }],
    shipmentMethodUid: 'normal',
    shippingAddress: {
      firstName:    firstName,
      lastName:     lastName,
      addressLine1: customerDetails.addr1,
      addressLine2: customerDetails.addr2 || '',
      city:         customerDetails.city  || '',
      postCode:     customerDetails.postcode,
      country:      'GB',
      email:        customerDetails.email,
      phone:        customerDetails.phone || '',
    },
  };

  debugLog('Sending to Gelato: ' + JSON.stringify(orderPayload).substring(0, 200));

  // Route through Cloudflare Worker — avoids CORS, keeps API key secret
  const res = await fetch(CONFIG.workerUrl + '/gelato-order', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderRef, imageUrl, customerDetails, productUid }),
  });

  const responseText = await res.text();
  debugLog('Gelato Worker response: ' + res.status + ' — ' + responseText.substring(0, 200));

  if (!res.ok) throw new Error('Gelato order failed: ' + responseText);

  const data = JSON.parse(responseText);
  debugLog('Gelato order placed! ID: ' + (data.gelatoOrderId || 'unknown'));
  return data;
}

// ══════════════════════════════════════════
// USER ACCOUNTS
// ══════════════════════════════════════════
function checkLoggedIn() {
  const stored = localStorage.getItem('fsg_user');
  if (stored) { state.currentUser = JSON.parse(stored); updateNavForLoggedInUser(); }
}
function updateNavForLoggedInUser() {
  const btn = document.querySelector('.btn-account');
  if (btn && state.currentUser) {
    btn.textContent = `Hi, ${state.currentUser.name.split(' ')[0]}!`;
    btn.onclick = () => showToast(`Signed in as ${state.currentUser.email}`, 'info');
  }
}
function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Please enter your email and password.', 'error'); return; }
  const user = { email, name: email.split('@')[0] };
  localStorage.setItem('fsg_user', JSON.stringify(user));
  state.currentUser = user;
  updateNavForLoggedInUser();
  closeModal('loginModal');
  showToast('Welcome back!', 'success');
}
function handleRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const marketing = document.getElementById('regMarketing').checked;
  if (!name || !email || !password) { showToast('Please fill in all fields.', 'error'); return; }
  if (password.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
  const user = { name, email, marketing };
  localStorage.setItem('fsg_user', JSON.stringify(user));
  state.currentUser = user;
  updateNavForLoggedInUser();
  closeModal('registerModal');
  showToast(`Welcome to FaceSwapGifts, ${name.split(' ')[0]}!`, 'success');
}

// ══════════════════════════════════════════
// NAVBAR
// ══════════════════════════════════════════
function toggleMenu() {
  const links = document.getElementById('navLinks');
  const isVisible = links.style.display === 'flex';
  links.style.cssText = isVisible ? '' : 'display:flex;flex-direction:column;position:absolute;top:64px;left:0;right:0;background:white;padding:20px;border-bottom:1px solid #eee;z-index:99;';
}
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.1)' : 'none';
});
function scrollToBuilder() {
  document.getElementById('builder').scrollIntoView({ behavior: 'smooth' });
  if (n === 4) initStripe(); // initialise Stripe Elements when checkout shown
}

// ══════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open');    document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }
function closeModalOutside(event, id) { if (event.target === event.currentTarget) closeModal(id); }
function switchModal(closeId, openId) { closeModal(closeId); openModal(openId); }

// ══════════════════════════════════════════
// FAQ
// ══════════════════════════════════════════
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains('open');
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-q').forEach(q => q.classList.remove('open'));
  if (!isOpen) { answer.classList.add('open'); btn.classList.add('open'); }
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
function showToast(message, type = 'info') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  const colors = { success:'#0E9F8A', error:'#E24B4A', info:'#7C3AED' };
  toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${colors[type]};color:white;padding:14px 24px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:700;font-size:15px;z-index:999;box-shadow:0 4px 20px rgba(0,0,0,0.2);max-width:90vw;text-align:center;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ══════════════════════════════════════════
// RESET
// ══════════════════════════════════════════
function resetBuilder() {
  state.selectedChar = null; state.uploadedPhoto = null;
  state.swappedImageUrl = null; state.selectedProduct = null;
  state.selectedType = null; state.typeCharacters = [];
  goToStep(1);
  retakePhoto();
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
}
