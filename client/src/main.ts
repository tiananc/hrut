import './style.css'
import { format, parseISO, set, startOfMonth, startOfWeek, getISOWeek, startOfYear, endOfYear, endOfMonth, endOfWeek, startOfDay, endOfDay } from 'date-fns'

type Scope = 'summary'|'year'|'month'|'week'|'day'
type Analysis = { sentiment:'positive'|'neutral'|'negative'; intensity:number; emotions:string[]; themes:string[] }
type Note = { id:string; createdAt:string; text:string; analysis:Analysis }

const state = {
  dateISO: format(new Date(), 'yyyy-MM-dd'), // Use current date
  scope: 'week' as Scope,
  notes: [] as Note[],
  page: 1,
  perPage: 3,
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

// Function to get date range based on scope
function getDateRange(dateISO: string, scope: Scope) {
  const d = parseISO(dateISO)
  
  switch (scope) {
    case 'summary':
      return { start: startOfYear(d), end: endOfYear(d) }
    case 'year':
      return { start: startOfYear(d), end: endOfYear(d) }
    case 'month':
      return { start: startOfMonth(d), end: endOfMonth(d) }
    case 'week':
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) }
    case 'day':
      return { start: startOfDay(d), end: endOfDay(d) }
    default:
      return { start: startOfWeek(d, { weekStartsOn: 1 }), end: endOfWeek(d, { weekStartsOn: 1 }) }
  }
}

async function refresh() {
  await loadEntries()
  renderBreadcrumbs()
  renderEntries()
  renderOverview()
}

async function loadEntries() {
  try {
    const res = await fetch(`/api/entries?scope=${state.scope}&date=${state.dateISO}`)
    if (res.ok) {
      state.notes = await res.json()
    } else {
      console.error('Failed to load entries:', res.status)
      state.notes = []
    }
    state.page = 1
  } catch (error) {
    console.error('Error loading entries:', error)
    state.notes = []
  }
}

function renderBreadcrumbs() {
  const d = parseISO(state.dateISO)
  const crumbs = document.getElementById('crumbs') as HTMLUListElement
  const year = format(d, 'yyyy')
  const monthName = format(d, 'LLLL')
  const dayName = format(d, 'MMM do')
  
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
        <h3 class="font-semibold">${format(parseISO(n.createdAt), 'MMM do, yyyy')}</h3>
        <p class="text-sm opacity-70 line-clamp-3">${n.text}</p>
        <div class="flex flex-wrap gap-1 mt-2">
          ${n.analysis.emotions.slice(0, 3).map(emotion => 
            `<span class="badge badge-sm">${emotion}</span>`
          ).join('')}
        </div>
      </div>`
    
    // Add click handler to view full entry
    card.addEventListener('click', () => {
      state.dateISO = n.createdAt
      state.scope = 'day'
      refresh()
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
  if (state.notes.length === 0) return
  
  // Aggregate emotions and themes from all entries
  const allEmotions: string[] = []
  const allThemes: string[] = []
  
  state.notes.forEach(note => {
    allEmotions.push(...note.analysis.emotions)
    allThemes.push(...note.analysis.themes)
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
  const emotionsSection = document.querySelector('.card-body h3:first-child')?.parentElement
  if (emotionsSection) {
    const emotionsDiv = emotionsSection.querySelector('.space-x-2, .flex')
    if (emotionsDiv) {
      emotionsDiv.innerHTML = topEmotions.length > 0 
        ? topEmotions.map(emotion => `<span class="badge">${emotion}</span>`).join('')
        : '<span class="text-base-content/60">No emotions detected</span>'
    }
  }
  
  // Update themes section
  const themesSection = document.querySelectorAll('.card-body h3')[1]?.parentElement
  if (themesSection) {
    const themesDiv = themesSection.querySelector('.flex')
    if (themesDiv) {
      themesDiv.innerHTML = topThemes.length > 0
        ? topThemes.map(theme => `<span class="badge badge-outline">${theme}</span>`).join('')
        : '<span class="text-base-content/60">No themes detected</span>'
    }
  }
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

// Handle New Entry button clicks
document.addEventListener('click', (ev) => {
  const el = ev.target as HTMLElement
  if (el.matches('[aria-label="New entry"], .btn:has-text("New Entry")')) {
    // Navigate to today and day scope for new entry
    state.dateISO = format(new Date(), 'yyyy-MM-dd')
    state.scope = 'day'
    refresh()
    
    // Here you could open a modal or navigate to an entry creation page
    console.log('Navigate to new entry creation')
  }
})

/* ---------- INIT ---------- */
refresh()