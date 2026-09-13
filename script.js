/**
 * Etsy SEO Tools - Shared JavaScript & Tag Generator Engine
 * Zero external dependencies - 100% Client-side execution
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
   Etsy Tag Generator Engine
   ========================================================================== */
function initTagGenerator() {
  const listingInput = document.getElementById('listingInput');
  const generateBtn = document.getElementById('generateTagsBtn');
  const clearBtn = document.getElementById('clearInputBtn');
  const sampleBtn = document.getElementById('sampleListingBtn');
  const resultsContainer = document.getElementById('resultsContainer');
  const tagsWrapper = document.getElementById('tagChipsWrapper');
  const copyAllBtn = document.getElementById('copyAllTagsBtn');
  const tagCountBadge = document.getElementById('tagCountBadge');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const customTagInput = document.getElementById('customTagInput');
  const addCustomTagBtn = document.getElementById('addCustomTagBtn');

  if (!listingInput || !generateBtn) return;

  // Active tags array in memory
  let currentTags = [];

  // Update live character and word counters for the input
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

  // Generate action
  generateBtn.addEventListener('click', generateTags);

  function generateTags() {
    const text = listingInput.value.trim();
    if (!text) {
      showToast('Please paste your listing title or description first.');
      listingInput.focus();
      return;
    }

    currentTags = extractEtsyTags(text);
    if (resultsContainer) resultsContainer.classList.add('visible');
    renderTags();
    
    // Smooth scroll to results if on smaller screen
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Generated ${currentTags.length} Etsy tags!`);
  }

  // Render tag chips
  function renderTags() {
    if (!tagsWrapper) return;
    tagsWrapper.innerHTML = '';

    if (currentTags.length === 0) {
      tagsWrapper.innerHTML = `<p style="color: var(--text-light); font-style: italic; width: 100%;">No tags currently. Generate from listing or add one below.</p>`;
    } else {
      currentTags.forEach((tag, index) => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        chip.innerHTML = `
          <span>${escapeHtml(tag)}</span>
          <span class="tag-chip-chars">${tag.length}/20</span>
          <button type="button" class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(tag)}" data-index="${index}">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        `;
        tagsWrapper.appendChild(chip);
      });
    }

    // Update counter
    if (tagCountBadge) {
      tagCountBadge.textContent = `${currentTags.length} / 13 Tags`;
      if (currentTags.length === 13) {
        tagCountBadge.style.backgroundColor = 'var(--status-active-bg)';
        tagCountBadge.style.color = 'var(--status-active-text)';
        tagCountBadge.style.borderColor = 'rgba(43, 105, 50, 0.3)';
      } else {
        tagCountBadge.style.backgroundColor = 'var(--color-terracotta-light)';
        tagCountBadge.style.color = 'var(--color-terracotta)';
        tagCountBadge.style.borderColor = 'var(--color-terracotta-border)';
      }
    }

    // Attach chip remove listeners
    tagsWrapper.querySelectorAll('.tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        currentTags.splice(idx, 1);
        renderTags();
      });
    });
  }

  // Copy all tags to clipboard
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (currentTags.length === 0) {
        showToast('No tags to copy. Generate tags first.');
        return;
      }
      const tagsString = currentTags.join(', ');
      navigator.clipboard.writeText(tagsString).then(() => {
        showToast(`Copied ${currentTags.length} tags (comma-separated) to clipboard!`);
        const originalText = copyAllBtn.textContent;
        copyAllBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyAllBtn.textContent = originalText;
        }, 2000);
      }).catch(() => {
        showToast('Failed to copy. Please copy manually.');
      });
    });
  }

  // Add custom tag handler
  if (addCustomTagBtn && customTagInput) {
    const handleAddCustom = () => {
      let customTag = customTagInput.value.trim().toLowerCase();
      // Remove punctuation except spaces
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

      if (currentTags.includes(customTag)) {
        showToast('This tag is already in your list.');
        return;
      }

      currentTags.push(customTag);
      customTagInput.value = '';
      renderTags();
      showToast(`Added "${customTag}"`);
    };

    addCustomTagBtn.addEventListener('click', handleAddCustom);
    customTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCustom();
      }
    });
  }
}

/* ==========================================================================
   Keyword & N-Gram Extraction Algorithm for Etsy
   ========================================================================== */
function extractEtsyTags(rawText) {
  // Comprehensive list of English stop words and low-intent words
  const STOP_WORDS = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
    'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both',
    'but', 'by', 'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does',
    'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll',
    'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
    'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s',
    'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
    'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should',
    'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll',
    'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t',
    'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s',
    'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
    // Etsy generic filler terms that make poor standalone tags
    'item', 'items', 'listing', 'product', 'shop', 'order', 'orders', 'size', 'sizes', 'approx',
    'approximately', 'including', 'includes', 'please', 'note', 'check', 'contact', 'us', 'new',
    'free', 'shipping', 'available', 'visit', 'made', 'handmade'
  ]);

  // High-value Etsy niche qualifiers to boost intent
  const INTENT_BOOSTERS = new Set([
    'gift', 'decor', 'art', 'print', 'mug', 'cup', 'shirt', 'ring', 'necklace', 'pottery',
    'ceramic', 'wood', 'leather', 'custom', 'personalized', 'vintage', 'rustic', 'boho',
    'minimalist', 'aesthetic', 'birthday', 'wedding', 'anniversary', 'cozy', 'handmade'
  ]);

  // Clean lines and separate title (usually first line or before a dash/period) from description
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const titleLine = lines.length > 0 ? lines[0] : '';
  
  // Tokenizer helper: returns array of clean lowercased tokens
  function tokenize(str) {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // replace special chars with space
      .split(/[\s,–—\/]+/)
      .map(w => w.trim().replace(/^[-_]+|[-_]+$/g, ''))
      .filter(w => w.length >= 2 && !/^\d+$/.test(w));
  }

  const allTokens = tokenize(rawText);
  const titleTokens = new Set(tokenize(titleLine));

  // Frequency map for candidate phrases
  const candidateScores = new Map();

  function recordPhrase(phrase, isTitleBonus, wordCount) {
    // Strict Etsy rule: Must be <= 20 characters and at least 3 characters
    if (phrase.length > 20 || phrase.length < 3) return;

    const words = phrase.split(' ');

    // Etsy Quality Filter: Multi-word tags should not start or end with a stop word
    if (words.length > 1) {
      if (STOP_WORDS.has(words[0]) || STOP_WORDS.has(words[words.length - 1])) {
        return;
      }
    } else {
      if (STOP_WORDS.has(words[0])) return;
    }

    // Base score by n-gram length (Etsy rewards multi-word long-tail keywords)
    let score = 1.0;
    if (wordCount === 2) score = 4.0; // Bigrams are sweet-spot for Etsy 20 char limit
    if (wordCount === 3) score = 5.0; // Trigrams offer strong search intent
    if (wordCount === 1) score = 1.2; // Unigrams are broad, lower priority

    // Boost if present in title
    if (isTitleBonus) score *= 2.5;

    // Boost if contains high intent keywords
    for (const w of words) {
      if (INTENT_BOOSTERS.has(w)) {
        score += 1.8;
      }
    }

    candidateScores.set(phrase, (candidateScores.get(phrase) || 0) + score);
  }

  // 1. Extract 2-word phrases (Bigrams)
  for (let i = 0; i < allTokens.length - 1; i++) {
    const w1 = allTokens[i];
    const w2 = allTokens[i + 1];
    if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2)) continue;
    const bigram = `${w1} ${w2}`;
    const inTitle = titleTokens.has(w1) || titleTokens.has(w2);
    recordPhrase(bigram, inTitle, 2);
  }

  // 2. Extract 3-word phrases (Trigrams)
  for (let i = 0; i < allTokens.length - 2; i++) {
    const w1 = allTokens[i];
    const w2 = allTokens[i + 1];
    const w3 = allTokens[i + 2];
    if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2) && STOP_WORDS.has(w3)) continue;
    const trigram = `${w1} ${w2} ${w3}`;
    const inTitle = titleTokens.has(w1) || titleTokens.has(w2) || titleTokens.has(w3);
    recordPhrase(trigram, inTitle, 3);
  }

  // 3. Extract high-frequency single keywords (Unigrams)
  for (const token of allTokens) {
    if (!STOP_WORDS.has(token) && token.length >= 3) {
      const inTitle = titleTokens.has(token);
      recordPhrase(token, inTitle, 1);
    }
  }

  // Sort candidates by score descending
  const sortedCandidates = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Select top 13 tags without excessive duplication (e.g. if we have "coffee mug", we don't need just "mug" if slots are limited)
  const selectedTags = [];
  
  for (const tag of sortedCandidates) {
    if (selectedTags.length >= 13) break;

    // Avoid adding an exact duplicate
    if (selectedTags.includes(tag)) continue;

    // If tag is a single word and we already have 2 multi-word tags containing it, de-prioritize
    const isSingle = !tag.includes(' ');
    if (isSingle) {
      const parentCount = selectedTags.filter(t => t.split(' ').includes(tag)).length;
      if (parentCount >= 2 && selectedTags.length < 10) {
        continue;
      }
    }

    selectedTags.push(tag);
  }

  // Fallback: If text was very brief and we have fewer than 13 tags, backfill with remaining valid candidates
  if (selectedTags.length < 13) {
    for (const tag of sortedCandidates) {
      if (selectedTags.length >= 13) break;
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }
  }

  return selectedTags.slice(0, 13);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
