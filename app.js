/**
 * Album of the Day - Main Application Logic
 * Fetches album data from external URL (3-column CSV/TSV)
 * Column 1: Album Name | Column 2: Artist Name | Column 3: Album Image URL
 */

(function () {
  'use strict';

  // Fallback sample data in case external fetch fails or CORS intervenes
  const FALLBACK_ALBUMS = [
    {
      albumName: 'Cyber Horizons',
      artistName: 'Neon Nights',
      imageUrl: 'assets/synthwave.jpg'
    },
    {
      albumName: 'Cosmic Harmonies',
      artistName: 'The Stellar Quintet',
      imageUrl: 'assets/cosmic_jazz.jpg'
    },
    {
      albumName: 'Mist & Echo',
      artistName: 'Forest Voices',
      imageUrl: 'assets/indie_folk.jpg'
    },
    {
      albumName: 'Random Access Memories',
      artistName: 'Daft Punk',
      imageUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=800&q=80'
    },
    {
      albumName: 'Midnight City',
      artistName: 'M83',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80'
    },
    {
      albumName: 'Abbey Road',
      artistName: 'The Beatles',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
    },
    {
      albumName: 'The Dark Side of the Moon',
      artistName: 'Pink Floyd',
      imageUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80'
    }
  ];

  const WEEKDAYS = [
    { name: 'Monday', index: 1 },
    { name: 'Tuesday', index: 2 },
    { name: 'Wednesday', index: 3 },
    { name: 'Thursday', index: 4 },
    { name: 'Friday', index: 5 }
  ];

  /**
   * Main Initialization
   */
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  async function initApp() {
    const config = window.ALBUM_CONFIG = {
      DATA_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRcVNRWuJisxul-E45mMkhvKge1glac4Lhzyjskj4zDM-g87R00x88ru_ksXNQEgU9ZJFXGRT9PGMN8/pub?gid=0&single=true&output=csv'
      APP_TITLE: 'ALBUM OF THE DAY'
    }; 
    //const config = window.ALBUM_CONFIG = {};
    //const dataUrl = config.DATA_URL || 'sample_albums.csv';
    //IS THIS THE LOCATION THAT I NEED TO UPDATE MY ALBUM URL ADDRESS?
    //You can obviously see what I've changed in the rows above...

    if (config.APP_TITLE) {
      const titleElem = document.getElementById('appTitle');
      if (titleElem) titleElem.textContent = config.APP_TITLE;
    }

    try {
      const albums = await fetchAndParseAlbumList(dataUrl);
      if (albums && albums.length > 0) {
        renderShowcase(albums);
      } else {
        renderShowcase(FALLBACK_ALBUMS);
      }
    } catch (err) {
      console.warn('Unable to fetch external URL, rendering fallback data:', err);
      renderShowcase(FALLBACK_ALBUMS);
    }
  }

  /**
   * Fetch and parse CSV/TSV from target URL
   */
  async function fetchAndParseAlbumList(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const text = await response.text();
    return parseCSV(text);
  }

  /**
   * Flexible CSV / TSV Parser
   * Expects: Column 1 = Album Name, Column 2 = Artist Name, Column 3 = Image URL
   */
  function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const parsedAlbums = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Determine delimiter (tab vs comma)
      const delimiter = line.includes('\t') ? '\t' : ',';
      const columns = splitCSVLine(line, delimiter);

      if (columns.length >= 3) {
        const col1 = columns[0].trim();
        const col2 = columns[1].trim();
        const col3 = columns[2].trim();

        // Skip header row if present
        if (i === 0 && (col1.toLowerCase().includes('album') || col2.toLowerCase().includes('artist'))) {
          continue;
        }

        if (col1 && col2 && col3) {
          parsedAlbums.push({
            albumName: col1,
            artistName: col2,
            imageUrl: col3
          });
        }
      }
    }

    return parsedAlbums;
  }

  /**
   * Parse a single CSV line taking quotes into account
   */
  function splitCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Deterministic Seeded Pseudo-Random Number Generator (PRNG)
   */
  function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Get current week identifier string (YYYY-Www)
   */
  function getWeekSeed(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  /**
   * Calculate deterministic assignments for Monday-Friday and the upcoming preview
   */
  function getWeeklyAlbumAssignments(albumsList) {
    const now = new Date();
    const weekSeedStr = getWeekSeed(now);
    
    // Hash week seed string into a numeric seed
    let baseSeed = 0;
    for (let i = 0; i < weekSeedStr.length; i++) {
      baseSeed = (baseSeed << 5) - baseSeed + weekSeedStr.charCodeAt(i);
      baseSeed |= 0;
    }

    // Shuffle album indices deterministically for this week
    const shuffledIndices = albumsList.map((_, idx) => idx);
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const r = Math.floor(seededRandom(baseSeed + i) * (i + 1));
      const temp = shuffledIndices[i];
      shuffledIndices[i] = shuffledIndices[r];
      shuffledIndices[r] = temp;
    }

    // Map Monday to Friday
    const assignments = {};
    WEEKDAYS.forEach((day, idx) => {
      const albumIdx = shuffledIndices[idx % shuffledIndices.length];
      assignments[day.name] = albumsList[albumIdx];
    });

    // Calculate upcoming day preview
    const currentDayIndex = now.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
    let upcomingDayName = 'Upcoming Day';
    let upcomingAlbum = null;

    if (currentDayIndex >= 1 && currentDayIndex <= 4) {
      // Mon (1) -> Tue (2), Tue (2) -> Wed (3), Wed (3) -> Thu (4), Thu (4) -> Fri (5)
      const nextDayObj = WEEKDAYS[currentDayIndex];
      upcomingDayName = `${nextDayObj.name} Preview`;
      upcomingAlbum = assignments[nextDayObj.name];
    } else if (currentDayIndex === 5) {
      // Fri (5) -> Saturday Sneak Peek
      upcomingDayName = 'Saturday Sneak Peek';
      const satSeed = baseSeed + 99;
      const satIdx = shuffledIndices[5 % shuffledIndices.length] || 0;
      upcomingAlbum = albumsList[satIdx];
    } else {
      // Sat (6) or Sun (0) -> Next Monday Preview
      upcomingDayName = 'Monday Sneak Peek';
      upcomingAlbum = assignments['Monday'];
    }

    return {
      weekdayAlbums: assignments,
      upcoming: {
        dayLabel: upcomingDayName,
        album: upcomingAlbum
      }
    };
  }

  /**
   * Render Today's Album of the Day and upcoming day text preview
   */
  function renderShowcase(albums) {
    const container = document.getElementById('singleAlbumContainer');
    if (!container) return;

    const { weekdayAlbums, upcoming } = getWeeklyAlbumAssignments(albums);
    const now = new Date();
    const todayIndex = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

    // Match today's day object (fallback to Monday on weekends)
    let currentDayObj = WEEKDAYS.find(d => d.index === todayIndex);
    if (!currentDayObj) {
      currentDayObj = WEEKDAYS[0]; // Default to Monday
    }

    const todayAlbum = weekdayAlbums[currentDayObj.name];

    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'day-card featured-card is-today';

    card.innerHTML = `
      <div class="card-header">
        <span class="day-name">${currentDayObj.name} • ALBUM OF THE DAY</span>
        <span class="today-badge">TODAY</span>
      </div>

      <div class="cover-wrapper">
        <img 
          class="cover-image" 
          src="${escapeHtml(todayAlbum.imageUrl)}" 
          alt="${escapeHtml(todayAlbum.albumName)} Cover Art"
          loading="eager"
          onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80';"
        />
      </div>

      <div class="album-details">
        <h2 class="album-title" title="${escapeHtml(todayAlbum.albumName)}">${escapeHtml(todayAlbum.albumName)}</h2>
        <p class="artist-name" title="${escapeHtml(todayAlbum.artistName)}">${escapeHtml(todayAlbum.artistName)}</p>
      </div>
    `;

    container.appendChild(card);

    // Render Upcoming Day Text Preview
    if (upcoming && upcoming.album) {
      const dayLabelElem = document.getElementById('upcomingDayName');
      const albumTitleElem = document.getElementById('upcomingAlbumTitle');
      const artistNameElem = document.getElementById('upcomingArtistName');

      if (dayLabelElem) dayLabelElem.textContent = `${upcoming.dayLabel}:`;
      if (albumTitleElem) albumTitleElem.textContent = upcoming.album.albumName;
      if (artistNameElem) artistNameElem.textContent = upcoming.album.artistName;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
