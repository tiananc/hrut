import './style.css'
import { format, parseISO, set, startOfMonth, startOfWeek } from 'date-fns'

type Scope = 'summary'|'year'|'month'|'week'|'day'
type Analysis = { sentiment:'positive'|'neutral'|'negative'; intensity:number; emotions:string[]; themes:string[] }
type Note = { id:string; createdAt:string; text:string; analysis:Analysis }

function openEntryModal(n: Note) {
  const modal = document.getElementById('entryModal') as HTMLDialogElement;
  const title = document.getElementById('entryModalTitle')!;
  const text = document.getElementById('entryModalText')!;

  title.textContent = `${formatDisplayDate(n.createdAt)}`;
  text.textContent = n.text;

  modal.showModal();
}

function formatDisplayDate(isoDate: string): string {
  const d = parseISO(isoDate);
  return format(d, "d.M.yyyy"); // e.g. 9.3.2025
}

const state = {
  dateISO: format(new Date(), 'yyyy-MM-dd'), // Use current date
  scope: 'week' as Scope,
  notes: [] as Note[],
  page: 1,
  perPage: 3,
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')


async function refresh() {
  await loadEntries()
  renderBreadcrumbs()
  renderEntries()
  renderOverview()
}

async function loadEntries() {
  const scopeParam = state.scope === 'summary' ? 'year' : state.scope
  const res = await fetch(`/api/entries?scope=${scopeParam}&date=${state.dateISO}`)
  if (res.ok) {
    state.notes = await res.json()
  } else {
    console.error('Failed to load entries:', res.status)
    state.notes = []
  }
  state.page = 1
}

function renderBreadcrumbs() {
  const d = parseISO(state.dateISO)
  const crumbs = document.getElementById('crumbs') as HTMLUListElement
  const year = format(d, 'yyyy')
  const monthName = format(d, 'LLLL')
  const dayName = format(d, 'd.M.yyyy')
  
  // Calculate week number within the month (not ISO week)
  const monthStart = startOfMonth(d)
  const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const currentWeekStart = startOfWeek(d, { weekStartsOn: 1 })
  const weekOfMonth = Math.floor((currentWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 24 * 3600 * 1000)) + 1
  
  let breadcrumbHTML = '<li><a data-scope="summary">Summary</a></li>'
  breadcrumbHTML += `<li><a data-scope="year">${year}</a></li>`
  
  if (state.scope !== 'summary' && state.scope !== 'year') {
    breadcrumbHTML += `<li><a data-scope="month">${monthName}</a></li>`
  }
  
  if (state.scope === 'week') {
    breadcrumbHTML += `<li data-scope="week">Week ${weekOfMonth}</li>`
  } else if (state.scope === 'day') {
    breadcrumbHTML += `<li data-scope="day">${dayName}</li>`
  }
  
  crumbs.innerHTML = breadcrumbHTML
  
  // Add click handlers for breadcrumb navigation
  crumbs.querySelectorAll('[data-scope]').forEach(el => {
    el.addEventListener('click', () => {
      const newScope = (el as HTMLElement).getAttribute('data-scope') as Scope
      if (newScope && newScope !== state.scope) {
        state.scope = newScope
        refresh()
      }
    })
  })
}

function renderEntries() {
  const wrap = document.getElementById('entries')!
  wrap.innerHTML = ''

  if (state.notes.length === 0) {
    wrap.innerHTML = '<div class="text-center text-base-content/60 py-8">No entries found for this period</div>'
    renderPager()
    return
  }

  const start = (state.page - 1) * state.perPage
  const pageNotes = state.notes.slice(start, start + state.perPage)

  pageNotes.forEach(n => {
    const card = document.createElement('div')
    card.className = 'card bg-base-100 shadow cursor-pointer hover:shadow-lg transition-shadow'
    card.innerHTML = `
      <div class="card-body p-4">
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-semibold">${formatDisplayDate(n.createdAt)}</h3>
        </div>
        <p class="text-sm opacity-70 line-clamp-3">${n.text}</p>
        <div class="flex flex-wrap gap-1 mt-2">
        </div>
      </div>`
    card.addEventListener('click', () => {
      openEntryModal(n)
    })
    wrap.appendChild(card)
  })

  renderPager()
}

function renderPager() {
  const pager = document.getElementById('pager')!
  const totalPages = Math.max(1, Math.ceil(state.notes.length / state.perPage))
  
  if (totalPages <= 1) {
    pager.innerHTML = ''
    return
  }
  
  pager.innerHTML = ''
  
  const createButton = (label: string, disabled: boolean, to?: number) => {
    const b = document.createElement('button')
    b.className = 'join-item btn btn-sm' + (disabled ? ' btn-disabled' : '')
    b.textContent = label
    if (!disabled && to !== undefined) {
      b.onclick = () => { 
        state.page = to
        renderEntries() 
      }
    }
    return b
  }
  
  // Previous button
  pager.appendChild(createButton('«', state.page === 1, state.page - 1))
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const b = createButton(String(i), false, i)
    if (i === state.page) b.classList.add('btn-active')
    pager.appendChild(b)
  }
  
  // Next button
  pager.appendChild(createButton('»', state.page === totalPages, state.page + 1))
}

function renderOverview() {
  if (state.notes.length === 0) {
    const emotionsWrap = document.getElementById('emotionsWrap')
    const themesWrap = document.getElementById('themesWrap')
    
    if (emotionsWrap) emotionsWrap.innerHTML = '<span class="text-base-content/60">No emotions detected</span>'
    if (themesWrap) themesWrap.innerHTML = '<span class="text-base-content/60">No themes detected</span>'
    return
  }
  
  // Aggregate emotions and themes from all entries
  const allEmotions: string[] = []
  const allThemes: string[] = []
  const sentiments = { positive: 0, neutral: 0, negative: 0 }
  
  state.notes.forEach(note => {
    allEmotions.push(...note.analysis.emotions)
    allThemes.push(...note.analysis.themes)
    sentiments[note.analysis.sentiment]++
  })
  
  // Count frequency and get top items
  const emotionCounts: Record<string, number> = {}
  const themeCounts: Record<string, number> = {}
  
  allEmotions.forEach(emotion => {
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
  })
  
  allThemes.forEach(theme => {
    themeCounts[theme] = (themeCounts[theme] || 0) + 1
  })
  
  const topEmotions = Object.entries(emotionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([emotion]) => emotion)
  
  const topThemes = Object.entries(themeCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
  
  // Update emotions section
  const emotionsWrap = document.getElementById('emotionsWrap')!
  emotionsWrap.innerHTML = topEmotions.length > 0 
    ? topEmotions.map(emotion => `<span class="badge badge-soft">${emotion}</span>`).join('')
    : '<span class="text-base-content/60">No emotions detected</span>'
  
  // Update themes section
  const themesWrap = document.getElementById('themesWrap')!
  themesWrap.innerHTML = topThemes.length > 0
    ? topThemes.map(theme => `<span class="badge badge-soft">${theme}</span>`).join('')
    : '<span class="text-base-content/60">No themes detected</span>'
}

/* ---------- EVENT DELEGATION FOR DROPDOWN ---------- */
document.addEventListener('click', (ev) => {
  const el = ev.target as HTMLElement
  
  // Year selection
  const yBtn = el.closest('[data-year]') as HTMLElement | null
  if (yBtn) {
    const year = Number(yBtn.getAttribute('data-year'))
    const d = parseISO(state.dateISO)
    state.dateISO = iso(set(d, { year, month: 0, date: 1 })) // First day of year
    state.scope = 'year'
    refresh()
    return
  }
  
  // Month selection (0..11)
  const mBtn = el.closest('[data-month]') as HTMLElement | null
  if (mBtn) {
    const month = Number(mBtn.getAttribute('data-month'))
    const d = parseISO(state.dateISO)
    const first = startOfMonth(set(d, { month }))
    state.dateISO = iso(first)
    state.scope = 'month'
    refresh()
    return
  }
  
  // Week selection (1..5)
  const wBtn = el.closest('[data-week]') as HTMLElement | null
  if (wBtn) {
    const w = Number(wBtn.getAttribute('data-week'))
    const d = parseISO(state.dateISO)
    const monthStart = startOfMonth(d)
    const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const targetWeekStart = new Date(firstWeekStart.getTime() + (w - 1) * 7 * 24 * 3600 * 1000)
    state.dateISO = iso(targetWeekStart)
    state.scope = 'week'
    refresh()
    return
  }
  
  // Day selection (if you add day buttons)
  const dayBtn = el.closest('[data-day]') as HTMLElement | null
  if (dayBtn) {
    const dayISO = String(dayBtn.getAttribute('data-day'))
    state.dateISO = dayISO
    state.scope = 'day'
    refresh()
  }
})

// Enhanced prompts with sentiment-based and time-based logic
const PROMPTS = {
  daily: {
    positive: [
      "What made today feel especially bright?",
      "Which moment gave you the most energy today?",
      "What's one thing you're grateful for right now?",
      "How can you carry today's good vibes forward?"
    ],
    neutral: [
      "What's one small thing that went well today?",
      "Where did you feel most like yourself today?",
      "What helped you feel steady today?",
      "What's something you learned about yourself today?"
    ],
    negative: [
      "What's one gentle thing you can do for yourself right now?",
      "What helped you get through the tough moments today?",
      "What would make tomorrow feel a little easier?",
      "What's the smallest step forward you could take?"
    ]
  },
  weekend: [
    "Looking back at this week, what pattern do you notice in your emotions?",
    "What themes kept coming up in your week?",
    "Which day this week felt most aligned with who you are?",
    "What would you like to do differently next week?",
    "What story does your week tell about your growth?"
  ],
  monthly: [
    "What emotional journey did you take this month?",
    "Which themes dominated your month, and how do you feel about them?",
    "What patterns in your emotions surprise you looking back?",
    "How have you grown from the beginning of this month?",
    "What would you like to focus on next month based on your patterns?"
  ],
  yearly: [
    "What's the biggest emotional shift you notice over this year?",
    "Which themes have been most persistent in your life?",
    "How has your relationship with yourself evolved?",
    "What patterns do you see that you want to change or strengthen?",
    "What story does this year tell about who you're becoming?"
  ]
}

function getRecentSentiment(): 'positive' | 'neutral' | 'negative' {
  if (state.notes.length === 0) return 'neutral'
  
  // Look at last few entries to gauge recent sentiment
  const recent = state.notes.slice(0, 3)
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 }
  
  recent.forEach(note => {
    sentimentCounts[note.analysis.sentiment]++
  })
  
  // Return the dominant sentiment
  const max = Math.max(sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative)
  if (sentimentCounts.positive === max) return 'positive'
  if (sentimentCounts.negative === max) return 'negative'
  return 'neutral'
}

function isWeekend(): boolean {
  const day = new Date().getDay() // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 5 || day === 6 // Fri, Sat, Sun
}

function choosePrompt(): string {
  const now = new Date()
  const dayOfMonth = now.getDate()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  
  let promptPool: string[]
  let prefix = "Suggested Prompt: "
  
  // Yearly prompts (once per year, around New Year or birthday)
  if (dayOfYear <= 7 || dayOfYear >= 358) {
    promptPool = PROMPTS.yearly
    prefix = "Year-end reflection: "
  }
  // Monthly prompts (first or last 3 days of month)
  else if (dayOfMonth <= 3 || dayOfMonth >= 28) {
    promptPool = PROMPTS.monthly
    prefix = "Monthly reflection: "
  }
  // Weekend prompts (Fri, Sat, Sun) - focus on week summary
  else if (isWeekend()) {
    promptPool = PROMPTS.weekend
    prefix = "Week reflection: "
  }
  // Daily prompts based on recent sentiment
  else {
    const sentiment = getRecentSentiment()
    promptPool = PROMPTS.daily[sentiment]
    prefix = "Daily prompt: "
  }
  
  // Pick random prompt from the appropriate pool
  const randomPrompt = promptPool[Math.floor(Math.random() * promptPool.length)]
  return prefix + randomPrompt
}

async function analyzeText(text: string): Promise<Analysis> {
  try {
    console.log('Calling NLP analysis for text:', text.substring(0, 50) + '...')
    
    const response = await fetch('http://localhost:8000/nlp/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    
    console.log('NLP response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('NLP API error:', errorText)
      throw new Error(`Analysis failed: ${response.status} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log('NLP analysis result:', result)
    return result
  } catch (error) {
    console.error('Sentiment analysis failed:', error)
    // Return default analysis if API fails
    return {
      sentiment: 'neutral',
      intensity: 2,
      emotions: [],
      themes: []
    }
  }
}

function wireNewEntryModal() {
  const modal = document.getElementById('newEntryModal') as HTMLDialogElement
  const openButtons = [
    document.getElementById('btnNewEntry'),
    document.getElementById('btnNewEntryMobile')
  ].filter(Boolean) as HTMLElement[]

  const entryText = document.getElementById('entryText') as HTMLTextAreaElement
  const suggested = document.getElementById('suggestedPrompt')!
  const dateInput = document.getElementById('entryDate') as HTMLInputElement

  const reset = async () => {
    entryText.value = ''
    dateInput.value = format(new Date(), 'yyyy-MM-dd')
    suggested.textContent = 'Loading prompt...'
    const prompt = await choosePrompt()
    suggested.textContent = prompt
  }

  openButtons.forEach(btn => btn.addEventListener('click', () => { reset(); modal.showModal() }))

  // Save with sentiment analysis
  document.getElementById('btnSaveEntry')?.addEventListener('click', async (e) => {
    e.preventDefault()
    const textToSave = entryText.value.trim()
    if (!textToSave) { 
      alert('Please write something.') 
      return 
    }
    
    const createdAt = dateInput.value || format(new Date(), 'yyyy-MM-dd')
    const btn = e.currentTarget as HTMLButtonElement
    const originalText = btn.textContent
    btn.disabled = true
    
    try {
      btn.textContent = 'Analyzing...'
      console.log('Starting text analysis for:', textToSave.substring(0, 50) + '...')
      
      // Analyze the text for sentiment
      const analysis = await analyzeText(textToSave)
      console.log('Got analysis:', analysis)
      
      btn.textContent = 'Saving...'
      
      const payload = { 
        text: textToSave, 
        createdAt,
        analysis
      }
      
      console.log('Saving entry with payload:', payload)
      
      const res = await fetch('http://localhost:8000/api/entries/text', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      })
      
      console.log('Save response status:', res.status)
      
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Save API error:', errorText)
        throw new Error(errorText || res.statusText)
      }
      
      const savedEntry = await res.json()
      console.log('Entry saved successfully:', savedEntry)
      
      await refresh()
      modal.close()
      
    } catch (err) {
      console.error('Save failed:', err)
      alert(`Could not save entry: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      btn.disabled = false
      btn.textContent = originalText || 'Save'
    }
  })
}

wireNewEntryModal()
refresh()