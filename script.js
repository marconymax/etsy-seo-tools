/**
 * Etsy SEO Tools - Shared JavaScript & Tag Generator Engine
 * Zero external dependencies - 100% Client-side execution with Datamuse semantic expansion
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initTagGenerator();
  initCopyEmail();
});

/* ==========================================================================
   Navigation & Global UI
   ========================================================================== */
function initNavigation() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navPanel = document.getElementById('mobileNavPanel');
  const header = document.querySelector('.site-header');

  if (toggleBtn && navPanel) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = navPanel.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Add subtle shadow when page is scrolled
  window.addEventListener('scroll', () => {
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  });
}

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
function showToast(message, duration = 3000) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast-notice';
    toast.innerHTML = `
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
      <span id="toastMessage"></span>
    `;
    document.body.appendChild(toast);
  }

  const toastMessage = document.getElementById('toastMessage');
  if (toastMessage) {
    toastMessage.textContent = message;
  }

  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/* ==========================================================================
   Contact Page Copy Email Utility
   ========================================================================== */
function initCopyEmail() {
  const copyEmailBtn = document.getElementById('copyEmailBtn');
  const emailTextElem = document.getElementById('displayEmailAddress');

  if (copyEmailBtn && emailTextElem) {
    copyEmailBtn.addEventListener('click', () => {
      const email = emailTextElem.textContent.trim();
      navigator.clipboard.writeText(email).then(() => {
        showToast('Email address copied to clipboard!');
        const originalText = copyEmailBtn.textContent;
        copyEmailBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyEmailBtn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        showToast('Failed to copy. Please select and copy manually.');
      });
    });
  }
}

/* ==========================================================================
   Etsy Tag Generator Engine (Upgraded Selection & Ranking)
   ========================================================================== */
function initTagGenerator() {
  const listingInput     = document.getElementById('listingInput');
  const generateBtn      = document.getElementById('generateTagsBtn');
  const clearBtn         = document.getElementById('clearInputBtn');
  const sampleBtn        = document.getElementById('sampleListingBtn');
  const resultsContainer = document.getElementById('resultsContainer');
  const tagsWrapper      = document.getElementById('tagChipsWrapper');
  const copyAllBtn       = document.getElementById('copyAllTagsBtn');
  const tagCountBadge    = document.getElementById('tagCountBadge');
  const charCount        = document.getElementById('charCount');
  const wordCount        = document.getElementById('wordCount');
  const customTagInput   = document.getElementById('customTagInput');
  const addCustomTagBtn  = document.getElementById('addCustomTagBtn');

  if (!listingInput || !generateBtn) return;

  // Active tags in memory: array of { text, expanded }
  let currentTags = [];

  // Update live character/word counters
  listingInput.addEventListener('input', () => {
    const text = listingInput.value.trim();
    if (charCount) charCount.textContent = `${listingInput.value.length} characters`;
    if (wordCount) {
      const words = text ? text.split(/\s+/).length : 0;
      wordCount.textContent = `${words} words`;
    }
  });

  // Sample listing loader
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      listingInput.value = `Handmade Ceramic Coffee Mug - Rustic Speckled Stoneware Cup for Tea & Espresso - Artisan Pottery Gift

Looking for the perfect artisan mug for your morning ritual? This hand-thrown ceramic mug is crafted from durable speckled stoneware clay and finished with a food-safe rustic white glaze. Each pottery piece is individually shaped on the potter's wheel, resulting in a unique, organic feel with comfortable thumb rest handles.

Features:
- Holds approximately 12-14 oz of coffee, matcha, or tea
- Microwave and dishwasher safe
- Hand-thrown in small batches by ceramic artists
- Great cozy gift for coffee lovers, housewarming, birthdays, and anniversary celebrations`;
      listingInput.dispatchEvent(new Event('input'));
      generateTags();
    });
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      listingInput.value = '';
      listingInput.dispatchEvent(new Event('input'));
      if (resultsContainer) resultsContainer.classList.remove('visible');
      currentTags = [];
      renderTags();
    });
  }

  // Generate action (async with Datamuse enrichment)
  generateBtn.addEventListener('click', generateTags);

  async function generateTags() {
    const text = listingInput.value.trim();
    if (!text) {
      showToast('Please paste your listing title or description first.');
      listingInput.focus();
      return;
    }

    // Loading indicator on button
    const btnOriginalHTML = generateBtn.innerHTML;
    generateBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> Analysing...`;
    generateBtn.classList.add('is-loading');

    try {
      // Step 1: Extract high-quality multi-word candidate tags from text
      const textCandidates = extractNaturalTextCandidates(text);

      // Step 2: Fetch related words from Datamuse API (with 3-second timeout)
      let apiCandidates = [];
      try {
        apiCandidates = await fetchDatamuseCombinations(text);
      } catch (e) {
        // Silently fall back to text candidates
      }

      // Step 3: Get Category Diversity candidates (gift/occasion, recipient, use-case)
      const diversityCandidates = extractDiversityCandidates(text);

      // Step 4: Pool all candidates & rank by score
      const allCandidates = poolAndRankCandidates([
        ...textCandidates,
        ...apiCandidates,
        ...diversityCandidates
      ]);

      // Step 5: Select top 13 tags using concept clustering & category balance
      currentTags = selectTopDiverseTags(allCandidates, text);

    } catch (err) {
      console.error('Tag generation error:', err);
      showToast('Error generating tags. Please try again.');
    } finally {
      generateBtn.innerHTML = btnOriginalHTML;
      generateBtn.classList.remove('is-loading');
    }

    if (resultsContainer) resultsContainer.classList.add('visible');
    renderTags();
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Generated ${currentTags.length} diverse Etsy tags!`);
  }

  /* -------------------------------------------------------------------------
     Render tag chips (Simplified UI per Problem 5)
     - Expanded tags: subtle soft-green background tint
     - Trademark warnings: red left border + inline text label '⚠ trademark risk'
     - No mysterious symbol icons, no confusing chip legend
     --------------------------------------------------------------------- */
  function renderTags() {
    if (!tagsWrapper) return;
    tagsWrapper.innerHTML = '';

    if (currentTags.length === 0) {
      tagsWrapper.innerHTML = `<p style="color: var(--text-light); font-style: italic; width: 100%;">No tags yet. Generate from a listing or add one below.</p>`;
    } else {
      currentTags.forEach(({ text, expanded }, index) => {
        const warning = checkTrademarkRisk(text);

        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        if (expanded) chip.classList.add('is-expanded');
        if (warning) chip.classList.add('has-warning');

        let warningLabelHTML = '';
        if (warning) {
          warningLabelHTML = `<span class="tag-chip-warn-label">⚠ trademark risk</span>`;
        }

        chip.innerHTML = `
          <span>${escapeHtml(text)}</span>
          ${warningLabelHTML}
          <span class="tag-chip-chars">${text.length}/20</span>
          <button type="button" class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(text)}" data-index="${index}">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        `;
        tagsWrapper.appendChild(chip);
      });
    }

    // Attach chip remove listeners
    tagsWrapper.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        currentTags.splice(idx, 1);
        renderTags();
      });
    });

    updateTagCountBadge();
    renderBudgetWidget();
  }

  function updateTagCountBadge() {
    if (!tagCountBadge) return;
    const count = currentTags.length;
    tagCountBadge.textContent = `${count} / 13 Tags`;
    if (count === 13) {
      tagCountBadge.style.backgroundColor = 'var(--status-active-bg)';
      tagCountBadge.style.color           = 'var(--status-active-text)';
      tagCountBadge.style.borderColor     = 'rgba(43, 105, 50, 0.3)';
    } else {
      tagCountBadge.style.backgroundColor = 'var(--color-terracotta-light)';
      tagCountBadge.style.color           = 'var(--color-terracotta)';
      tagCountBadge.style.borderColor     = 'var(--color-terracotta-border)';
    }
  }

  function renderBudgetWidget() {
    let widget = document.getElementById('tagBudgetWidget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'tagBudgetWidget';
      widget.className = 'budget-widget';
      const addBar = document.querySelector('.add-custom-tag-bar');
      if (addBar) addBar.parentNode.insertBefore(widget, addBar);
    }

    const tagCount   = currentTags.length;
    const totalChars = currentTags.reduce((sum, t) => sum + t.text.length, 0);
    const slotPct    = Math.round((tagCount / 13) * 100);
    const charPct    = Math.round((totalChars / 260) * 100);
    const slotsLeft  = 13 - tagCount;

    let promptHTML = '';
    if (slotsLeft > 0) {
      promptHTML = `
        <div class="budget-prompt-box">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
          <span>You have <strong>${slotsLeft} tag slot${slotsLeft > 1 ? 's' : ''} left</strong> — try adding more detail to your listing description for additional suggestions, or add custom tags below.</span>
        </div>`;
    }

    widget.innerHTML = `
      <div class="budget-widget-title">
        <span>Tag Budget</span>
        <span style="font-weight:400; font-size:0.8rem; color: var(--text-light);">13 slots × 20 chars = 260 character budget</span>
      </div>
      <div class="budget-grid">
        <div class="budget-item">
          <div class="budget-item-header">
            <span class="budget-label">Tags Used</span>
            <span class="budget-value">${tagCount} / 13</span>
          </div>
          <div class="budget-track" role="progressbar" aria-valuenow="${tagCount}" aria-valuemin="0" aria-valuemax="13" aria-label="${tagCount} of 13 tags used">
            <div class="budget-fill ${slotPct >= 100 ? 'is-optimal' : ''}" style="width:${Math.min(slotPct, 100)}%"></div>
          </div>
        </div>
        <div class="budget-item">
          <div class="budget-item-header">
            <span class="budget-label">Characters Used</span>
            <span class="budget-value">${totalChars} / 260</span>
          </div>
          <div class="budget-track" role="progressbar" aria-valuenow="${totalChars}" aria-valuemin="0" aria-valuemax="260" aria-label="${totalChars} of 260 characters used">
            <div class="budget-fill ${charPct >= 75 ? 'is-optimal' : ''}" style="width:${Math.min(charPct, 100)}%"></div>
          </div>
        </div>
      </div>
      ${promptHTML}
    `;
  }

  // Copy all tags to clipboard
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (currentTags.length === 0) {
        showToast('No tags to copy. Generate tags first.');
        return;
      }
      const tagsString = currentTags.map(t => t.text).join(', ');
      navigator.clipboard.writeText(tagsString).then(() => {
        showToast(`Copied ${currentTags.length} tags (comma-separated) to clipboard!`);
        const originalText = copyAllBtn.textContent;
        copyAllBtn.textContent = 'Copied!';
        setTimeout(() => { copyAllBtn.textContent = originalText; }, 2000);
      }).catch(() => {
        showToast('Failed to copy. Please copy manually.');
      });
    });
  }

  // Add custom tag handler
  if (addCustomTagBtn && customTagInput) {
    const handleAddCustom = () => {
      let customTag = customTagInput.value.trim().toLowerCase();
      customTag = customTag.replace(/[^\w\s-]/gi, '').replace(/\s+/g, ' ');

      if (!customTag) return;

      if (customTag.length > 20) {
        showToast('Etsy tags cannot exceed 20 characters.');
        return;
      }
      if (currentTags.length >= 13) {
        showToast('Etsy allows a maximum of 13 tags per listing.');
        return;
      }
      if (currentTags.some(t => t.text === customTag)) {
        showToast('This tag is already in your list.');
        return;
      }

      currentTags.push({ text: customTag, expanded: false });
      customTagInput.value = '';
      renderTags();
      showToast(`Added "${customTag}"`);
    };

    addCustomTagBtn.addEventListener('click', handleAddCustom);
    customTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); }
    });
  }
}

/* ==========================================================================
   Etsy Compliance Trademark List
   ========================================================================== */
const TRADEMARK_TERMS = [
  'disney', 'marvel', 'star wars', 'harry potter', 'pokemon', 'pikachu',
  'nike', 'adidas', 'gucci', 'chanel', 'louis vuitton', 'rolex', 'tiffany',
  'lego', 'barbie', 'hello kitty', 'sanrio', 'nintendo', 'xbox', 'playstation',
  'apple', 'iphone', 'starbucks', 'stanley cup', 'taylor swift', 'swiftie',
  'nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'band-aid', 'velcro', 'onesie',
  'cricut', 'minnie', 'mickey', 'winnie the pooh', 'spongebob', 'rick and morty',
  'stranger things', 'hogwarts', 'hufflepuff', 'gryffindor', 'slytherin', 'ravenclaw'
];

function checkTrademarkRisk(tag) {
  const lower = tag.toLowerCase();
  for (const tm of TRADEMARK_TERMS) {
    const pattern = new RegExp('\\b' + tm.replace(/ /g, '\\s+') + '\\b');
    if (pattern.test(lower)) {
      return tm;
    }
  }
  return null;
}

/* ==========================================================================
   Core Dictionaries for Natural Phrase Validation & Diversity
   ========================================================================== */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  "aren't", 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
  'but', 'by', 'can', "can't", 'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does',
  "doesn't", 'doing', "don't", 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll",
  "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's",
  'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's",
  'its', 'itself', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor',
  'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should',
  "shouldn't", 'so', 'some', 'such', 'than', 'that', "that's", 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll",
  "they're", "they've", 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
  'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't",
  'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's",
  'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll",
  "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  'item', 'items', 'listing', 'product', 'shop', 'order', 'orders', 'size', 'sizes', 'approx',
  'approximately', 'including', 'includes', 'please', 'note', 'check', 'contact', 'us', 'new',
  'free', 'shipping', 'available', 'visit', 'made', 'handmade', 'looking', 'perfect', 'holds',
  'resulting', 'features', 'feel', 'feels', 'great'
]);

// Product and object nouns that buyers search for
const PRODUCT_NOUNS = new Set([
  'mug', 'mugs', 'cup', 'cups', 'pottery', 'dish', 'dishes', 'bowl', 'bowls', 'plate', 'plates',
  'vase', 'vases', 'planter', 'planters', 'pot', 'pots', 'crock', 'saucer', 'tumbler', 'tumblers',
  'glass', 'glasses', 'jar', 'jars', 'bottle', 'bottles', 'pitcher', 'carafe',
  'ring', 'rings', 'necklace', 'necklaces', 'earring', 'earrings', 'bracelet', 'bracelets',
  'pendant', 'pendants', 'jewelry', 'brooch', 'cuff', 'anklet', 'charm', 'charms',
  'shirt', 'tshirt', 'tee', 'hoodie', 'sweater', 'sweatshirt', 'dress', 'top', 'tote', 'bag',
  'purse', 'wallet', 'backpack', 'pouch', 'clutch',
  'print', 'prints', 'art', 'poster', 'posters', 'painting', 'canvas', 'sign', 'signs', 'decor',
  'candle', 'candles', 'wax', 'soap', 'soaps', 'balm', 'lotion', 'salve',
  'pillow', 'cushion', 'blanket', 'quilt', 'throw', 'rug', 'mat', 'curtain', 'towel',
  'card', 'cards', 'invitation', 'planner', 'journal', 'notebook', 'sticker', 'stickers',
  'gift', 'gifts', 'favor', 'favors', 'box', 'boxes', 'set', 'sets', 'kit', 'kits',
  'holder', 'coaster', 'coasters', 'stand', 'tray', 'basket', 'shelf', 'hanger',
  'ornament', 'ornaments', 'figurine', 'statue', 'sculpture', 'keychain', 'badge',
  'espresso', 'coffee', 'tea', 'matcha', 'drinkware', 'ceramics', 'glaze', 'clay',
  'ritual', 'handle', 'decor'
]);

// Descriptive materials and style adjectives
const MODIFIERS = new Set([
  'ceramic', 'stoneware', 'earthenware', 'porcelain', 'clay', 'terracotta',
  'wood', 'wooden', 'leather', 'linen', 'cotton', 'wool', 'silk', 'velvet', 'metal', 'brass',
  'copper', 'gold', 'silver', 'bronze', 'resin', 'enamel', 'acrylic', 'rattan',
  'rustic', 'speckled', 'handmade', 'handthrown', 'wheelthrown', 'artisan', 'craft',
  'vintage', 'retro', 'antique', 'boho', 'bohemian', 'minimalist', 'modern', 'farmhouse',
  'aesthetic', 'cozy', 'dainty', 'chunky', 'delicate', 'textured', 'glazed', 'matte',
  'glossy', 'raw', 'natural', 'organic', 'white', 'black', 'brown', 'green', 'blue',
  'pink', 'neutral', 'earthy', 'pastel', 'warm', 'custom', 'personalized', 'handcrafted',
  'durable', 'unique'
]);

// Words that should never be in a search tag (passive verbs, measurements, filler)
const NON_SEARCH_WORDS = new Set([
  'is', 'are', 'was', 'were', 'crafted', 'shaped', 'finished', 'feels', 'feel', 'holds',
  'approximately', 'approx', 'batches', 'batch', 'safe', 'resulting', 'piece', 'pieces',
  'looking', 'great', 'perfect', 'unique', 'handles', 'handle', 'wheel', 'features',
  'items', 'item', 'listing', 'available', 'order', 'orders', 'contact', 'oz', 'ounce',
  'ounces', 'inch', 'inches', 'cm', 'mm', 'ml', 'lbs', 'lb', 'gram', 'grams'
]);

// Category Diversity Library (Problem 4)
const DIVERSITY_LIBRARIES = [
  {
    category: 'drinkware',
    triggers: ['mug', 'mugs', 'cup', 'cups', 'coffee', 'tea', 'espresso', 'tumbler', 'drinkware', 'latte', 'chai', 'matcha'],
    giftOccasions: ['housewarming gift', 'birthday gift', 'holiday gift', 'cozy gift', 'anniversary gift'],
    recipients: ['coffee lover gift', 'tea lover gift', 'gift for coworker', 'gift for mom', 'gift for bestie'],
    useCases: ['coffee bar decor', 'kitchen decor', 'office desk mug', 'morning coffee ritual', 'cozy kitchen decor']
  },
  {
    category: 'jewelry',
    triggers: ['ring', 'necklace', 'earring', 'earrings', 'bracelet', 'pendant', 'jewelry', 'gemstone', 'choker'],
    giftOccasions: ['anniversary gift', 'birthday gift', 'bridesmaid gift', 'valentines gift', 'graduation gift'],
    recipients: ['gift for best friend', 'gift for girlfriend', 'gift for wife', 'gift for sister', 'gift for mom'],
    useCases: ['everyday jewelry', 'dainty jewelry', 'bridal jewelry', 'stacking jewelry', 'statement jewelry']
  },
  {
    category: 'homedecor',
    triggers: ['decor', 'print', 'prints', 'art', 'poster', 'wall', 'painting', 'pillow', 'blanket', 'vase', 'candle', 'sign', 'shelf'],
    giftOccasions: ['housewarming gift', 'new home gift', 'hostess gift', 'wedding gift', 'closing gift'],
    recipients: ['gift for couple', 'gift for homeowner', 'gift for mom', 'gift for friend', 'gift for family'],
    useCases: ['living room decor', 'entryway decor', 'gallery wall art', 'cozy home accent', 'office wall decor', 'shelf decor accent']
  },
  {
    category: 'apparel',
    triggers: ['shirt', 'tshirt', 'tee', 'hoodie', 'sweater', 'sweatshirt', 'jacket', 'tote', 'bag', 'dress'],
    giftOccasions: ['birthday gift', 'christmas gift', 'bachelorette party', 'holiday gift'],
    recipients: ['gift for bestie', 'gift for her', 'gift for him', 'gift for friend', 'gift for sister'],
    useCases: ['casual streetwear', 'everyday outfit', 'graphic tee aesthetic', 'comfy loungewear', 'oversized aesthetic']
  },
  {
    category: 'stationery',
    triggers: ['card', 'cards', 'invitation', 'planner', 'journal', 'notebook', 'sticker', 'stickers', 'stationery'],
    giftOccasions: ['birthday greeting', 'wedding stationery', 'thank you card', 'holiday greeting'],
    recipients: ['gift for reader', 'gift for writer', 'gift for coworker', 'gift for student'],
    useCases: ['desk accessory', 'bullet journal decor', 'snail mail love', 'planner supplies', 'office stationery']
  }
];

/* ==========================================================================
   Grammatical Naturalness Checker (Problem 3)
   ========================================================================== */
function isNaturalPhrase(phrase) {
  if (!phrase || phrase.length > 20 || phrase.length < 4) return False_safe();
  const words = phrase.toLowerCase().trim().split(/\s+/);
  if (words.length < 2) return False_safe();

  // Multi-word phrase must not start or end with a stop word
  if (STOP_WORDS.has(words[0]) || STOP_WORDS.has(words[words.length - 1])) {
    return false;
  }

  // Reject phrases with descriptive verbs, measurements, or non-search fillers
  for (const w of words) {
    if (NON_SEARCH_WORDS.has(w)) return false;
  }

  // Must contain at least one noun or search object
  const hasNoun = words.some(w => PRODUCT_NOUNS.has(w));
  if (!hasNoun) return false;

  // Discard modifier + modifier combinations (e.g., 'earthenware ceramic', 'rustic stoneware')
  if (words.length === 2 && MODIFIERS.has(words[0]) && MODIFIERS.has(words[1])) {
    return false;
  }

  // The last word should not be an awkward adjective
  const awkwardEnds = ['rustic', 'speckled', 'ceramic', 'stoneware', 'durable', 'unique', 'small', 'organic', 'handmade', 'earthenware'];
  if (awkwardEnds.includes(words[words.length - 1])) {
    return false;
  }

  return true;
}

function False_safe() { return false; }

/* ==========================================================================
   Core Concept Cluster Redundancy Checker (Problem 2)
   Detects if two tags share 2+ core content words (e.g. ceramic + coffee)
   ========================================================================== */
function getContentWords(phrase) {
  const connectors = new Set(['for', 'and', 'with', 'the', 'in', 'of', 'to', 'a', 'by', 'on']);
  return new Set(
    phrase.toLowerCase().split(/\s+/)
      .filter(w => !STOP_WORDS.has(w) && !connectors.has(w) && w.length >= 3)
  );
}

function sharesCoreConcept(phrase, existingList) {
  const cw = getContentWords(phrase);
  if (cw.size < 2) return false;

  for (const item of existingList) {
    const existingCw = getContentWords(item.text);
    let overlapCount = 0;
    for (const w of cw) {
      if (existingCw.has(w)) overlapCount++;
    }
    // If 2 or more core content words overlap, it's the same core concept!
    if (overlapCount >= 2) return true;
  }
  return false;
}

/* ==========================================================================
   Candidate Extractors
   ========================================================================== */
function splitIntoClauses(text) {
  // Split on punctuation so n-grams never cross sentences or clauses
  const rawClauses = text.split(/[\r\n.!?–—&|,;:()[\]•*#<>]+/);
  const clauses = [];
  for (const c of rawClauses) {
    const clean = c.trim().toLowerCase();
    if (clean.length >= 3) {
      const tokens = clean.split(/\s+/)
        .map(t => t.replace(/^[^\w]+|[^\w]+$/g, ''))
        .filter(t => t.length >= 2 && !/^\d+$/.test(t));
      if (tokens.length >= 2) clauses.push(tokens);
    }
  }
  return clauses;
}

function extractNaturalTextCandidates(rawText) {
  const clauses = splitIntoClauses(rawText);
  const titleTokens = new Set(clauses.length > 0 ? clauses[0] : []);
  const candidates = [];

  for (const clause of clauses) {
    // 2-word phrases (Bigrams)
    for (let i = 0; i < clause.length - 1; i++) {
      const phrase = `${clause[i]} ${clause[i+1]}`;
      if (isNaturalPhrase(phrase)) {
        let score = 4.0;
        if (titleTokens.has(clause[i]) || titleTokens.has(clause[i+1])) score *= 2.2;
        candidates.push({ text: phrase, score, category: 'descriptor', expanded: false });
      }
    }

    // 3-word phrases (Trigrams)
    for (let i = 0; i < clause.length - 2; i++) {
      const phrase = `${clause[i]} ${clause[i+1]} ${clause[i+2]}`;
      if (isNaturalPhrase(phrase)) {
        let score = 5.5;
        if (clause.slice(i, i+3).some(w => titleTokens.has(w))) score *= 2.2;
        candidates.push({ text: phrase, score, category: 'descriptor', expanded: false });
      }
    }
  }

  return candidates;
}

/* --------------------------------------------------------------------------
   Datamuse API Expansion with Grammatical Naturalness Check (Problem 1 & 3)
   -------------------------------------------------------------------------- */
async function fetchDatamuseCombinations(rawText) {
  const tokens = rawText.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length >= 4 && !STOP_WORDS.has(t));
  const freq = new Map();
  tokens.forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  const topWords = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]);

  if (topWords.length === 0) return [];

  // Extract core product noun phrases from listing to attach related words to
  const nounPhrases = new Set();
  const clauses = splitIntoClauses(rawText);
  for (const cl of clauses) {
    for (let i = 0; i < cl.length; i++) {
      if (PRODUCT_NOUNS.has(cl[i])) {
        nounPhrases.add(cl[i]);
        if (i > 0 && !STOP_WORDS.has(cl[i-1])) nounPhrases.add(`${cl[i-1]} ${cl[i]}`);
        if (i < cl.length - 1 && PRODUCT_NOUNS.has(cl[i+1])) nounPhrases.add(`${cl[i]} ${cl[i+1]}`);
      }
    }
  }

  const fetchRelated = async (word) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 3000);
    try {
      const resp = await fetch(
        `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=8`,
        { signal: controller.signal }
      );
      clearTimeout(tid);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data
        .filter(d => d.score > 1200 && d.word !== word && /^[a-z]+$/.test(d.word) && !STOP_WORDS.has(d.word))
        .map(d => d.word);
    } catch {
      clearTimeout(tid);
      return [];
    }
  };

  const settled = await Promise.allSettled(topWords.map(fetchRelated));
  const relatedWords = new Set();
  settled.forEach(s => {
    if (s.status === 'fulfilled') s.value.forEach(w => relatedWords.add(w));
  });

  const candidates = [];
  for (const rel of relatedWords) {
    for (const np of nounPhrases) {
      const combo = `${rel} ${np}`;
      if (isNaturalPhrase(combo)) {
        candidates.push({ text: combo, score: 6.2, category: 'descriptor', expanded: true });
      }
    }
  }

  return candidates;
}

/* --------------------------------------------------------------------------
   Category Diversity Library (Problem 4)
   Adds gift/occasion, recipient, and use-case tags
   -------------------------------------------------------------------------- */
function extractDiversityCandidates(rawText) {
  const lower = rawText.toLowerCase();
  const candidates = [];

  for (const lib of DIVERSITY_LIBRARIES) {
    const matchesCategory = lib.triggers.some(trig => lower.includes(trig));
    if (matchesCategory) {
      // Occasion angles
      for (const occ of lib.giftOccasions) {
        if (isNaturalPhrase(occ)) {
          candidates.push({ text: occ, score: 6.0, category: 'occasion', expanded: true });
        }
      }
      // Recipient angles
      for (const rec of lib.recipients) {
        if (isNaturalPhrase(rec)) {
          candidates.push({ text: rec, score: 5.6, category: 'recipient', expanded: true });
        }
      }
      // Use-case angles
      for (const uc of lib.useCases) {
        if (isNaturalPhrase(uc)) {
          candidates.push({ text: uc, score: 5.2, category: 'useCase', expanded: true });
        }
      }
      break; // Match most specific category
    }
  }

  return candidates;
}

/* --------------------------------------------------------------------------
   Pool, Rank & Select Diverse Tags (Problem 1, 2, 4)
   -------------------------------------------------------------------------- */
function poolAndRankCandidates(allCandidates) {
  // Deduplicate exact normalized strings, keeping highest score
  const uniqueMap = new Map();
  for (const c of allCandidates) {
    const norm = c.text.toLowerCase().trim();
    if (!uniqueMap.has(norm) || c.score > uniqueMap.get(norm).score) {
      uniqueMap.set(norm, c);
    }
  }
  return Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);
}

function selectTopDiverseTags(rankedCandidates, rawText) {
  const selected = [];
  const categoryCounts = { descriptor: 0, occasion: 0, recipient: 0, useCase: 0 };
  const MAX_PER_CAT    = { descriptor: 6, occasion: 3, recipient: 2, useCase: 3 };

  // Pass 1: Multi-word phrases with diversity limits & concept cluster deduplication
  for (const c of rankedCandidates) {
    if (selected.length >= 13) break;
    const cat = c.category || 'descriptor';
    if ((categoryCounts[cat] || 0) >= (MAX_PER_CAT[cat] || 3)) continue;

    if (!sharesCoreConcept(c.text, selected)) {
      selected.push({ text: c.text, expanded: c.expanded });
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  // Pass 2: Fill remaining slots with other natural multi-word candidates
  if (selected.length < 13) {
    for (const c of rankedCandidates) {
      if (selected.length >= 13) break;
      if (selected.some(s => s.text === c.text)) continue;
      if (!sharesCoreConcept(c.text, selected)) {
        selected.push({ text: c.text, expanded: c.expanded });
      }
    }
  }

  // Pass 3: Relaxed multi-word check if still under 13
  if (selected.length < 13) {
    for (const c of rankedCandidates) {
      if (selected.length >= 13) break;
      if (!selected.some(s => s.text === c.text)) {
        selected.push({ text: c.text, expanded: c.expanded });
      }
    }
  }

  // Pass 4 (STRICT LAST RESORT - Problem 1):
  // Single-word tags ONLY if all multi-word options are genuinely exhausted
  if (selected.length < 13) {
    const tokens = rawText.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/)
      .filter(t => t.length >= 4 && !STOP_WORDS.has(t) && !NON_SEARCH_WORDS.has(t) && PRODUCT_NOUNS.has(t));
    const tokenFreq = new Map();
    tokens.forEach(t => tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1));
    const sortedSingles = Array.from(tokenFreq.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);

    for (const single of sortedSingles) {
      if (selected.length >= 13) break;
      if (!selected.some(s => s.text === single || s.text.split(' ').includes(single))) {
        selected.push({ text: single, expanded: false });
      }
    }
  }

  return selected.slice(0, 13);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
