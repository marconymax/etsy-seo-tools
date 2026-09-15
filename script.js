/**
 * Etsy SEO Tools - Shared JavaScript & Tag Generator Engine
 * Zero external dependencies except optional Datamuse API (no key required)
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
  const listingInput   = document.getElementById('listingInput');
  const generateBtn    = document.getElementById('generateTagsBtn');
  const clearBtn       = document.getElementById('clearInputBtn');
  const sampleBtn      = document.getElementById('sampleListingBtn');
  const resultsContainer = document.getElementById('resultsContainer');
  const tagsWrapper    = document.getElementById('tagChipsWrapper');
  const copyAllBtn     = document.getElementById('copyAllTagsBtn');
  const tagCountBadge  = document.getElementById('tagCountBadge');
  const charCount      = document.getElementById('charCount');
  const wordCount      = document.getElementById('wordCount');
  const customTagInput = document.getElementById('customTagInput');
  const addCustomTagBtn = document.getElementById('addCustomTagBtn');

  if (!listingInput || !generateBtn) return;

  // Each entry: { text: string, expanded: boolean }
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

  // Generate action (async — calls Datamuse)
  generateBtn.addEventListener('click', generateTags);

  async function generateTags() {
    const text = listingInput.value.trim();
    if (!text) {
      showToast('Please paste your listing title or description first.');
      listingInput.focus();
      return;
    }

    // Show loading state on button
    const btnOriginalHTML = generateBtn.innerHTML;
    generateBtn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> Analysing…`;
    generateBtn.classList.add('is-loading');

    // Step 1: Run the synchronous n-gram extraction
    const ngrams = extractEtsyTags(text);

    // Step 2: Try to enrich with Datamuse related words
    let expandedTags = ngrams;
    try {
      expandedTags = await enrichWithDatamuse(text, ngrams);
    } catch (e) {
      // Silently fall back to n-gram only
    }

    // Deduplicate near-synonymous tags (e.g. "coffee mug" vs "mug coffee")
    expandedTags = deduplicateTags(expandedTags);

    // Convert to tag objects { text, expanded }
    const ngSet = new Set(ngrams);
    currentTags = expandedTags.slice(0, 13).map(t => ({
      text: t,
      expanded: !ngSet.has(t)
    }));

    // Restore button
    generateBtn.innerHTML = btnOriginalHTML;
    generateBtn.classList.remove('is-loading');

    if (resultsContainer) resultsContainer.classList.add('visible');
    renderTags();
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Generated ${currentTags.length} Etsy tags!`);
  }

  /* -------------------------------------------------------------------------
     Datamuse API enrichment
     --------------------------------------------------------------------- */
  async function enrichWithDatamuse(rawText, ngrams) {
    // Pick the 3–5 highest-scoring non-stop single-word terms from n-gram text
    const topWords = extractTopKeywords(rawText, 5);

    if (topWords.length === 0) return ngrams;

    // Fetch related words for each top keyword in parallel (with 3s timeout)
    const fetchRelated = async (word) => {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3000);
      try {
        const resp = await fetch(
          `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=12`,
          { signal: controller.signal }
        );
        clearTimeout(tid);
        if (!resp.ok) return [];
        const data = await resp.json();
        // Return words with score > threshold, excluding the source word
        return data
          .filter(d => d.score > 900 && d.word !== word && d.word.length >= 3)
          .map(d => d.word);
      } catch {
        clearTimeout(tid);
        return [];
      }
    };

    const results = await Promise.allSettled(topWords.map(fetchRelated));
    const relatedWords = new Set();
    results.forEach(r => {
      if (r.status === 'fulfilled') r.value.forEach(w => relatedWords.add(w));
    });

    if (relatedWords.size === 0) return ngrams;

    // Build bonus phrases: combine related words with the top original keywords
    const bonusPhrases = [];
    const STOP_WORDS_SET = getStopWordsSet();

    for (const rel of relatedWords) {
      if (rel.length > 20 || STOP_WORDS_SET.has(rel)) continue;

      // Standalone related word as a tag (if short enough & not a stop word)
      if (rel.length <= 20) bonusPhrases.push(rel);

      // Combine related word with each top original keyword
      for (const kw of topWords) {
        const combo1 = `${rel} ${kw}`;
        const combo2 = `${kw} ${rel}`;
        if (combo1.length <= 20) bonusPhrases.push(combo1);
        if (combo2.length <= 20 && combo2 !== combo1) bonusPhrases.push(combo2);
      }
    }

    // Merge: original n-grams first (they're grounded in user's text),
    // then fill remaining slots with Datamuse-expanded phrases
    const merged = [...ngrams];
    const existingNorm = new Set(ngrams.map(normalizeForDedupe));

    for (const bp of bonusPhrases) {
      if (merged.length >= 20) break; // build a larger pool, slice to 13 later
      const norm = normalizeForDedupe(bp);
      if (!existingNorm.has(norm) && bp.length <= 20 && bp.length >= 3) {
        merged.push(bp);
        existingNorm.add(norm);
      }
    }

    return merged;
  }

  /* -------------------------------------------------------------------------
     Near-duplicate deduplication
     --------------------------------------------------------------------- */
  function deduplicateTags(tags) {
    const seen = new Set();
    return tags.filter(tag => {
      const norm = normalizeForDedupe(tag);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }

  /* -------------------------------------------------------------------------
     Render tag chips with compliance flags & budget widget
     --------------------------------------------------------------------- */
  function renderTags() {
    if (!tagsWrapper) return;
    tagsWrapper.innerHTML = '';

    if (currentTags.length === 0) {
      tagsWrapper.innerHTML = `<p style="color: var(--text-light); font-style: italic; width: 100%;">No tags yet. Generate from a listing or add one below.</p>`;
    } else {
      currentTags.forEach(({ text, expanded }, index) => {
        const warnings = validateTag(text);
        const hasWarning = warnings.some(w => w.type === 'warning');
        const isSingle   = !text.includes(' ');

        const chip = document.createElement('div');
        chip.className = 'tag-chip';
        if (hasWarning) chip.classList.add('has-warning');
        if (expanded) chip.classList.add('is-expanded');

        // Build badge HTML
        let badgesHTML = '';

        if (hasWarning) {
          const warnMsg = warnings.filter(w => w.type === 'warning').map(w => w.msg).join(' | ');
          badgesHTML += `
            <span class="tag-chip-badge badge-warning tooltip-trigger" tabindex="0" role="img" aria-label="Warning: ${escapeHtml(warnMsg)}">
              ⚠
              <span class="tooltip-text">${escapeHtml(warnMsg)}</span>
            </span>`;
        }

        if (isSingle && !hasWarning) {
          const info = warnings.find(w => w.type === 'info');
          const tip = info ? info.msg : 'Multi-word phrases typically rank higher on Etsy.';
          badgesHTML += `
            <span class="tag-chip-badge badge-single tooltip-trigger" tabindex="0" role="img" aria-label="${escapeHtml(tip)}">
              1W
              <span class="tooltip-text">${escapeHtml(tip)}</span>
            </span>`;
        }

        if (expanded && !hasWarning && !isSingle) {
          badgesHTML += `
            <span class="tag-chip-badge badge-expanded tooltip-trigger" tabindex="0" role="img" aria-label="Suggested by Datamuse linguistic analysis — not from your input text">
              +
              <span class="tooltip-text">Expanded: suggested via linguistic analysis, not directly from your listing copy.</span>
            </span>`;
        }

        chip.innerHTML = `
          <span>${escapeHtml(text)}</span>
          <span class="tag-chip-meta">
            <span class="tag-chip-chars">${text.length}/20</span>
            ${badgesHTML}
          </span>
          <button type="button" class="tag-chip-remove" aria-label="Remove tag ${escapeHtml(text)}" data-index="${index}">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        `;
        tagsWrapper.appendChild(chip);
      });
    }

    // Attach remove listeners
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

  /* -------------------------------------------------------------------------
     Budget Widget (slot count + character budget)
     --------------------------------------------------------------------- */
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
          <span>You have <strong>${slotsLeft} tag slot${slotsLeft > 1 ? 's' : ''} left</strong> — try adding more detail to your listing description for additional suggestions, or add a custom tag below.</span>
        </div>`;
    }

    widget.innerHTML = `
      <div class="budget-widget-title">
        <span>Tag Budget</span>
        <span style="font-weight:400; font-size:0.8rem; color: var(--text-light);">13 slots × 20 chars = 260 char budget</span>
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
            <span class="budget-label">Chars Used</span>
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
      if (currentTags.find(t => t.text === customTag)) {
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
   Etsy Compliance Validator
   ========================================================================== */
const TRADEMARK_TERMS = [
  'disney', 'marvel', 'star wars', 'harry potter', 'pokemon', 'pikachu',
  'nike', 'adidas', 'gucci', 'chanel', 'louis vuitton', 'rolex', 'tiffany',
  'lego', 'barbie', 'hello kitty', 'sanrio', 'nintendo', 'xbox', 'playstation',
  'apple', 'iphone', 'starbucks', 'stanley cup', 'taylor swift', 'swiftie',
  'nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'band-aid', 'velcro', 'onesie',
  'cricut', 'minnie', 'mickey', 'winnie the pooh', 'spongebob', 'rick and morty',
  'stranger things', 'hogwarts', 'hufflepuff', 'gryffindor',
];

function validateTag(tag) {
  const results = [];
  const lower = tag.toLowerCase();

  // IP/trademark warning
  for (const tm of TRADEMARK_TERMS) {
    const pattern = new RegExp('\\b' + tm.replace(/ /g, '\\s+') + '\\b');
    if (pattern.test(lower)) {
      results.push({ type: 'warning', msg: `May violate Etsy's IP policy — contains "${tm}"` });
      break;
    }
  }

  // ALL CAPS warning
  if (/^[A-Z\s]{2,}$/.test(tag) && tag.trim().length > 2) {
    results.push({ type: 'warning', msg: 'ALL CAPS: Use lowercase for Etsy consistency (tags are case-insensitive for search).' });
  }

  // Single-word nudge (info, not warning)
  if (!tag.includes(' ') && results.length === 0) {
    results.push({ type: 'info', msg: 'Single-word tag: multi-word phrases usually rank higher on Etsy.' });
  }

  return results;
}

/* ==========================================================================
   Normalise phrase for near-duplicate detection
   "mug coffee" → same key as "coffee mug"
   ========================================================================== */
function normalizeForDedupe(phrase) {
  return phrase.trim().toLowerCase().split(/\s+/).sort().join(' ');
}

/* ==========================================================================
   Keyword & N-Gram Extraction Algorithm for Etsy
   ========================================================================== */
function getStopWordsSet() {
  return new Set([
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
    'free', 'shipping', 'available', 'visit', 'made', 'handmade', 'looking', 'perfect',
  ]);
}

function extractTopKeywords(rawText, maxWords) {
  const STOP_WORDS = getStopWordsSet();
  const INTENT_BOOSTERS = new Set([
    'gift', 'decor', 'art', 'print', 'mug', 'cup', 'shirt', 'ring', 'necklace', 'pottery',
    'ceramic', 'wood', 'leather', 'custom', 'personalized', 'vintage', 'rustic', 'boho',
    'minimalist', 'aesthetic', 'birthday', 'wedding', 'anniversary', 'cozy',
  ]);

  const tokens = tokenize(rawText);
  const freq = new Map();
  tokens.forEach(t => {
    if (!STOP_WORDS.has(t) && t.length >= 4) {
      freq.set(t, (freq.get(t) || 0) + (INTENT_BOOSTERS.has(t) ? 3 : 1));
    }
  });

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxWords)
    .map(e => e[0]);
}

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s,–—\/]+/)
    .map(w => w.trim().replace(/^[-_]+|[-_]+$/g, ''))
    .filter(w => w.length >= 2 && !/^\d+$/.test(w));
}

function extractEtsyTags(rawText) {
  const STOP_WORDS = getStopWordsSet();

  const INTENT_BOOSTERS = new Set([
    'gift', 'decor', 'art', 'print', 'mug', 'cup', 'shirt', 'ring', 'necklace', 'pottery',
    'ceramic', 'wood', 'leather', 'custom', 'personalized', 'vintage', 'rustic', 'boho',
    'minimalist', 'aesthetic', 'birthday', 'wedding', 'anniversary', 'cozy', 'handmade',
  ]);

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const titleLine = lines.length > 0 ? lines[0] : '';

  const allTokens  = tokenize(rawText);
  const titleTokens = new Set(tokenize(titleLine));

  const candidateScores = new Map();

  function recordPhrase(phrase, isTitleBonus, wordCount) {
    if (phrase.length > 20 || phrase.length < 3) return;

    const words = phrase.split(' ');

    if (words.length > 1) {
      if (STOP_WORDS.has(words[0]) || STOP_WORDS.has(words[words.length - 1])) return;
    } else {
      if (STOP_WORDS.has(words[0])) return;
    }

    let score = 1.0;
    if (wordCount === 2) score = 4.0;
    if (wordCount === 3) score = 5.0;
    if (wordCount === 1) score = 1.2;

    if (isTitleBonus) score *= 2.5;

    for (const w of words) {
      if (INTENT_BOOSTERS.has(w)) score += 1.8;
    }

    candidateScores.set(phrase, (candidateScores.get(phrase) || 0) + score);
  }

  // Bigrams
  for (let i = 0; i < allTokens.length - 1; i++) {
    const w1 = allTokens[i], w2 = allTokens[i + 1];
    if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2)) continue;
    recordPhrase(`${w1} ${w2}`, titleTokens.has(w1) || titleTokens.has(w2), 2);
  }

  // Trigrams
  for (let i = 0; i < allTokens.length - 2; i++) {
    const w1 = allTokens[i], w2 = allTokens[i + 1], w3 = allTokens[i + 2];
    if (STOP_WORDS.has(w1) && STOP_WORDS.has(w2) && STOP_WORDS.has(w3)) continue;
    recordPhrase(`${w1} ${w2} ${w3}`, titleTokens.has(w1) || titleTokens.has(w2) || titleTokens.has(w3), 3);
  }

  // Unigrams
  for (const token of allTokens) {
    if (!STOP_WORDS.has(token) && token.length >= 3) {
      recordPhrase(token, titleTokens.has(token), 1);
    }
  }

  const sortedCandidates = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(e => e[0]);

  const selectedTags = [];
  for (const tag of sortedCandidates) {
    if (selectedTags.length >= 13) break;
    if (selectedTags.includes(tag)) continue;
    const isSingle = !tag.includes(' ');
    if (isSingle) {
      const parentCount = selectedTags.filter(t => t.split(' ').includes(tag)).length;
      if (parentCount >= 2 && selectedTags.length < 10) continue;
    }
    selectedTags.push(tag);
  }

  // Backfill
  if (selectedTags.length < 13) {
    for (const tag of sortedCandidates) {
      if (selectedTags.length >= 13) break;
      if (!selectedTags.includes(tag)) selectedTags.push(tag);
    }
  }

  return selectedTags.slice(0, 13);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
