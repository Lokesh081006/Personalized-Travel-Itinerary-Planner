import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3,
  BrainCircuit, CheckCircle2, Compass, Edit3, Heart, Hotel, LayoutDashboard, LoaderCircle, MapPin,
  Menu, MoreHorizontal, Navigation, Plus, RefreshCw, Search, Settings,
  Sparkles, Trash2, Users, Utensils, WandSparkles, X, Route, Plane,
  Bell, Database, ShieldCheck, SlidersHorizontal, UserRound, Wifi,
} from 'lucide-react'
import { api } from './api'
import type { HealthStatus } from './api'
import type { GenerateTripInput, ItineraryDay, Trip } from './types'

type View = 'dashboard' | 'builder' | 'trips' | 'settings' | 'trip'
type UserPreferences = { displayName: string; homeAirport: string; currency: string; pace: string; notifications: boolean }

const DEFAULT_PREFERENCES: UserPreferences = {
  displayName: 'Lokesh', homeAirport: '', currency: 'INR', pace: 'Balanced', notifications: true,
}

function loadPreferences(): UserPreferences {
  try {
    const saved = window.localStorage.getItem('roamly_preferences')
    return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES
  } catch { return DEFAULT_PREFERENCES }
}

const categories: Record<string, { icon: typeof Compass; tone: string }> = {
  sightseeing: { icon: MapPin, tone: 'coral' },
  food: { icon: Utensils, tone: 'gold' },
  culture: { icon: Compass, tone: 'blue' },
  adventure: { icon: Navigation, tone: 'green' },
  relaxation: { icon: Heart, tone: 'rose' },
  transport: { icon: Navigation, tone: 'slate' },
  accommodation: { icon: Hotel, tone: 'blue' },
}

const cleanText = (value: string) => value
  .replace(/\*\*(.*?)\*\*/g, '$1')
  .replace(/__(.*?)__/g, '$1')
  .replace(/`(.*?)`/g, '$1')
  .replace(/^[-•]\s*/, '')
  .trim()

const categoryLabel = (value: string) => value
  .split(/[|,/]/)[0]
  .replace(/[_-]/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())

const currencySymbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥' }

const demoTrip: Trip = {
  id: 'demo-kyoto', destination: 'Kyoto', country: 'Japan', start_date: '2026-11-12', end_date: '2026-11-16',
  travelers: 2, budget: 2400, currency: 'USD', interests: ['Culture', 'Food', 'Nature'], pace: 'Balanced',
  accommodation: 'Boutique hotel', notes: '', status: 'upcoming',
  summary: 'A slow, sensory journey through Kyoto’s quiet temples, lantern-lit lanes, and seasonal kitchens.',
  total_estimated_cost: 2180, created_at: new Date().toISOString(),
  itinerary: [
    { day: 1, date: '2026-11-12', title: 'Arrival & Old Kyoto', summary: 'Ease into the city through its most atmospheric eastern neighborhoods.', daily_cost: 330, activities: [
      { time: '10:30', title: 'Arrive & settle into Gion', description: 'Drop your bags, refresh, and get oriented in the historic geisha district.', location: 'Gion, Higashiyama', category: 'transport', duration_minutes: 90, estimated_cost: 45 },
      { time: '12:30', title: 'Seasonal obanzai lunch', description: 'A relaxed introduction to Kyoto home-style cooking with small seasonal plates.', location: 'Gion Kappa', category: 'food', duration_minutes: 75, estimated_cost: 42 },
      { time: '14:15', title: 'Kiyomizu-dera & Sannenzaka', description: 'Temple terraces, hillside views, and preserved lanes at an unhurried pace.', location: 'Kiyomizu-dera', category: 'culture', duration_minutes: 150, estimated_cost: 18 },
      { time: '18:30', title: 'Lantern walk & kaiseki dinner', description: 'Walk Hanamikoji at dusk before a beautifully composed multi-course dinner.', location: 'Gion Shirakawa', category: 'food', duration_minutes: 150, estimated_cost: 140 },
    ]},
    { day: 2, date: '2026-11-13', title: 'Shrines & Forest Paths', summary: 'An early start at Fushimi Inari followed by sake and a quiet canal walk.', daily_cost: 410, activities: [
      { time: '07:00', title: 'Fushimi Inari at sunrise', description: 'Walk the vermilion torii paths before the crowds arrive.', location: 'Fushimi Inari Taisha', category: 'sightseeing', duration_minutes: 180, estimated_cost: 12 },
      { time: '11:00', title: 'Sake tasting in Fushimi', description: 'Visit a historic brewery and learn about Kyoto’s spring water.', location: 'Gekkeikan Okura', category: 'food', duration_minutes: 100, estimated_cost: 38 },
      { time: '15:00', title: 'Philosopher’s Path', description: 'A contemplative canal-side walk with small galleries and tea stops.', location: 'Sakyo Ward', category: 'relaxation', duration_minutes: 150, estimated_cost: 22 },
    ]},
    { day: 3, date: '2026-11-14', title: 'Arashiyama & the Hills', summary: 'Bamboo, garden craft, and a scenic riverbank afternoon.', daily_cost: 380, activities: [
      { time: '07:30', title: 'Arashiyama bamboo grove', description: 'Catch the morning light before exploring Tenryu-ji’s garden.', location: 'Arashiyama', category: 'nature', duration_minutes: 150, estimated_cost: 24 },
      { time: '12:00', title: 'Riverside tofu lunch', description: 'A delicate set lunch showcasing Kyoto’s celebrated yudofu.', location: 'Katsura River', category: 'food', duration_minutes: 90, estimated_cost: 55 },
    ]},
  ],
}

const emptyForm: GenerateTripInput = {
  destination: '', start_date: '', end_date: '', travelers: 2, budget: 2000, currency: 'USD',
  interests: ['Culture', 'Food'], pace: 'Balanced', accommodation: 'Boutique hotel', notes: '',
}

function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  if (!date) return 'Choose date'
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', options || { month: 'short', day: 'numeric' }).format(parsed)
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [trips, setTrips] = useState<Trip[]>([demoTrip])
  const [selected, setSelected] = useState<Trip>(demoTrip)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [toast, setToast] = useState('')
  const [generationDestination, setGenerationDestination] = useState('')
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences)

  useEffect(() => {
    api.listTrips().then((saved) => saved.length && setTrips(saved)).catch(() => undefined)
  }, [])

  const navigate = (next: View) => { setView(next); setSidebar(false); window.scrollTo(0, 0) }
  const openTrip = (trip: Trip) => { setSelected(trip); navigate('trip') }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const savePreferences = (next: UserPreferences) => {
    window.localStorage.setItem('roamly_preferences', JSON.stringify(next))
    setPreferences(next)
    notify('Preferences saved')
  }

  const generate = async (input: GenerateTripInput) => {
    setGenerationDestination(input.destination); setLoading(true); setError('')
    try {
      const trip = await api.generateTrip(input)
      setTrips((current) => [trip, ...current.filter((item) => item.id !== trip.id)])
      setSelected(trip); navigate('trip'); notify('Your itinerary is ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate your trip.')
    } finally { setLoading(false) }
  }

  const saveTrip = async (trip: Trip) => {
    setSelected(trip); setTrips((items) => items.map((item) => item.id === trip.id ? trip : item))
    try { await api.updateTrip(trip); notify('Changes saved') } catch { notify('Saved in this session') }
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} navigate={navigate} tripCount={trips.length} preferences={preferences} open={sidebar} close={() => setSidebar(false)} />
      <main className="main-content">
        <MobileTopbar onMenu={() => setSidebar(true)} onCreate={() => navigate('builder')} />
        {view === 'dashboard' && <Dashboard trips={trips} preferences={preferences} openTrip={openTrip} create={() => navigate('builder')} viewAll={() => navigate('trips')} />}
        {view === 'builder' && <TripBuilder preferences={preferences} onGenerate={generate} loading={loading} error={error} back={() => navigate('dashboard')} />}
        {view === 'trips' && <TripsPage trips={trips} openTrip={openTrip} create={() => navigate('builder')} />}
        {view === 'settings' && <SettingsPage preferences={preferences} onSave={savePreferences} />}
        {view === 'trip' && <TripView trip={selected} save={saveTrip} notify={notify} back={() => navigate('dashboard')} />}
      </main>
      {loading && <GenerationOverlay destination={generationDestination} />}
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  )
}

function Sidebar({ view, navigate, tripCount, preferences, open, close }: { view: View; navigate: (v: View) => void; tripCount: number; preferences: UserPreferences; open: boolean; close: () => void }) {
  const initials = preferences.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'TR'
  return <>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={close} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Compass size={21} /></span><span>roamly</span><button className="sidebar-close" onClick={close}><X /></button></div>
      <nav className="nav-list">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}><LayoutDashboard />Overview</button>
        <button className={view === 'builder' ? 'active' : ''} onClick={() => navigate('builder')}><WandSparkles />Plan a trip</button>
        <button className={view === 'trips' || view === 'trip' ? 'active' : ''} onClick={() => navigate('trips')}><MapPin />My trips<span className="nav-count">{tripCount}</span></button>
        <button><Heart />Saved places</button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="insight-card">
        <span className="insight-icon"><Sparkles size={16} /></span>
        <strong>Travel smarter</strong><p>Roamly learns your style every time you plan.</p>
      </div>
      <nav className="nav-list nav-bottom"><button className={view === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Settings />Settings</button></nav>
      <div className="profile"><div className="avatar">{initials}</div><div><strong>{preferences.displayName || 'Traveler'}</strong><span>Explorer plan</span></div><MoreHorizontal size={18} /></div>
    </aside>
  </>
}

function MobileTopbar({ onMenu, onCreate }: { onMenu: () => void; onCreate: () => void }) {
  return <header className="mobile-top"><button onClick={onMenu}><Menu /></button><div className="brand"><span className="brand-mark"><Compass size={19} /></span>roamly</div><button onClick={onCreate}><Plus /></button></header>
}

function GenerationOverlay({ destination }: { destination: string }) {
  const stages = [
    { title: 'Understanding your travel style', detail: 'Reading your pace, interests, budget, and stay preferences.', icon: BrainCircuit },
    { title: `Exploring ${destination || 'your destination'}`, detail: 'Finding neighborhoods, local highlights, and memorable places.', icon: Compass },
    { title: 'Designing each day', detail: 'Balancing activities, meals, rest, and realistic travel time.', icon: CalendarDays },
    { title: 'Optimizing the route', detail: 'Grouping nearby stops to keep your days smooth and unhurried.', icon: Route },
    { title: 'Adding the finishing touches', detail: 'Checking costs and shaping your itinerary into a clear plan.', icon: Sparkles },
  ]
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 5200)
    return () => window.clearInterval(timer)
  }, [stages.length])

  const ActiveIcon = stages[stage].icon
  return <div className="generation-overlay" role="status" aria-live="polite">
    <div className="generation-aurora one"/><div className="generation-aurora two"/>
    <div className="generation-modal">
      <div className="generation-orbit"><span/><span/><span/><div><ActiveIcon/></div></div>
      <span className="generation-kicker"><Sparkles/> ROAMLY AI IS PLANNING</span>
      <h2>{stages[stage].title}<span className="thinking-dots"><i/><i/><i/></span></h2>
      <p>{stages[stage].detail}</p>
      <div className="generation-progress"><span style={{ width: `${18 + stage * 20}%` }}/></div>
      <div className="generation-steps">
        {stages.map((item, index) => <div key={item.title} className={index < stage ? 'done' : index === stage ? 'active' : ''}>
          <span>{index < stage ? <Check/> : index + 1}</span><small>{item.title.split(' ').slice(0, 2).join(' ')}</small>
        </div>)}
      </div>
      <div className="generation-tip"><Plane/><span><strong>Good trips take a moment.</strong> Your local AI is building a detailed plan—please keep this window open.</span></div>
    </div>
  </div>
}

function Dashboard({ trips, preferences, openTrip, create, viewAll }: { trips: Trip[]; preferences: UserPreferences; openTrip: (t: Trip) => void; create: () => void; viewAll: () => void }) {
  const next = trips[0] || demoTrip
  const firstName = preferences.displayName.trim().split(/\s+/)[0] || 'traveler'
  return <div className="page dashboard-page">
    <header className="page-header"><div><span className="eyebrow">MONDAY, OCTOBER 19</span><h1>Where to next, {firstName}?</h1><p>Pick up where you left off, or turn a new idea into a trip.</p></div><button className="primary-btn" onClick={create}><Plus size={18} />Plan a new trip</button></header>
    <section className="hero-trip" onClick={() => openTrip(next)}>
      <div className="hero-art"><div className="sun"/><div className="mountain mountain-back"/><div className="mountain mountain-front"/><div className="torii"><i/><i/><b/><em/></div><span className="cloud c1"/><span className="cloud c2"/></div>
      <div className="hero-copy"><span className="status-pill"><i/>UPCOMING</span><h2>{next.destination}, {next.country}</h2><p>{formatDate(next.start_date, { month: 'long', day: 'numeric' })} – {formatDate(next.end_date, { month: 'long', day: 'numeric', year: 'numeric' })} · {next.travelers} travelers</p><div className="hero-meta"><span><CalendarDays/> {next.itinerary.length || 5} days</span><span><CircleDollarSign/> {next.currency} {next.total_estimated_cost.toLocaleString()}</span><span><Sparkles/> AI planned</span></div><button className="text-btn">View itinerary <span>→</span></button></div>
    </section>
    <section className="metrics-grid">
      <Metric label="Trips planned" value="12" note="3 this year" icon={Compass} tone="green" />
      <Metric label="Places saved" value="38" note="Across 9 cities" icon={Heart} tone="coral" />
      <Metric label="Hours saved" value="24+" note="With AI planning" icon={Clock3} tone="blue" />
    </section>
    <section className="section-block"><div className="section-heading"><div><h2>Your trips</h2><p>Plans, memories, and places still to come.</p></div><button className="subtle-btn" onClick={viewAll}>View all <span>→</span></button></div>
      <div className="trip-grid">
        {trips.slice(0, 3).map((trip, index) => <TripCard key={trip.id} trip={trip} index={index} open={() => openTrip(trip)} />)}
        {trips.length < 3 && <button className="new-trip-card" onClick={create}><span><Plus /></span><strong>Dream up a new trip</strong><small>Tell us where you want to go</small></button>}
      </div>
    </section>
    <section className="inspiration"><div><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Your kind of places</h2><p>Curated around your love for food, culture, and slow travel.</p></div><div className="chips"><span>Coastal towns</span><span>Food capitals</span><span>Hidden temples</span><span>Scenic rail</span></div></section>
  </div>
}

function TripsPage({ trips, openTrip, create }: { trips: Trip[]; openTrip: (trip: Trip) => void; create: () => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const visible = trips.filter((trip) => {
    const matchesQuery = `${trip.destination} ${trip.country}`.toLowerCase().includes(query.toLowerCase())
    const isPast = new Date(`${trip.end_date}T23:59:59`) < new Date()
    return matchesQuery && (filter === 'all' || (filter === 'past' ? isPast : !isPast))
  })
  return <div className="page library-page">
    <header className="page-header library-header"><div><span className="eyebrow">YOUR TRAVEL LIBRARY</span><h1>Every journey, in one place.</h1><p>Revisit a plan, continue refining it, or begin somewhere new.</p></div><button className="primary-btn" onClick={create}><Plus/>Plan a new trip</button></header>
    <div className="library-toolbar"><label className="search-box"><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search destinations"/></label><div className="filter-pills">{(['all','upcoming','past'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div><span className="result-count">{visible.length} {visible.length === 1 ? 'trip' : 'trips'}</span></div>
    {visible.length ? <div className="trip-grid library-grid">{visible.map((trip, index) => <TripCard key={trip.id} trip={trip} index={index} open={() => openTrip(trip)} />)}</div> : <div className="empty-state"><span><Compass/></span><h2>No trips found</h2><p>Try another search, or start planning your next adventure.</p><button className="primary-btn" onClick={create}><Plus/>Plan a trip</button></div>}
  </div>
}

function SettingsPage({ preferences, onSave }: { preferences: UserPreferences; onSave: (preferences: UserPreferences) => void }) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [healthError, setHealthError] = useState(false)
  const [displayName, setDisplayName] = useState(preferences.displayName)
  const [homeAirport, setHomeAirport] = useState(preferences.homeAirport)
  const [pace, setPace] = useState(preferences.pace)
  const [currency, setCurrency] = useState(preferences.currency)
  const [notifications, setNotifications] = useState(preferences.notifications)

  useEffect(() => {
    api.health().then((data) => { setHealth(data); setHealthError(false) }).catch(() => setHealthError(true))
  }, [])

  return <div className="page settings-page">
    <header className="page-header"><div><span className="eyebrow">PERSONALIZE ROAMLY</span><h1>Settings</h1><p>Manage your travel defaults and check connected services.</p></div></header>
    <div className="settings-layout"><div className="settings-main">
      <section className="settings-card"><header><span><UserRound/></span><div><h2>Profile</h2><p>The details used to personalize your planning space.</p></div></header><div className="settings-fields"><label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name"/></label><label><span>Home airport</span><input value={homeAirport} onChange={(event) => setHomeAirport(event.target.value)} placeholder="e.g. DEL — New Delhi"/></label></div></section>
      <section className="settings-card"><header><span><SlidersHorizontal/></span><div><h2>Travel defaults</h2><p>Pre-fill new trips with the choices you use most.</p></div></header><div className="settings-fields"><label><span>Preferred currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>JPY</option></select></label><label><span>Default pace</span><select value={pace} onChange={(event) => setPace(event.target.value)}><option>Relaxed</option><option>Balanced</option><option>Packed</option></select></label></div></section>
      <section className="settings-card"><header><span><Bell/></span><div><h2>Notifications</h2><p>Choose when Roamly should keep you updated.</p></div></header><label className="toggle-row"><span><strong>Trip reminders</strong><small>Get a reminder before an upcoming journey.</small></span><input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)}/><i/></label></section>
      <button className="primary-btn save-settings" disabled={!displayName.trim()} onClick={() => onSave({ displayName: displayName.trim(), homeAirport: homeAirport.trim(), currency, pace, notifications })}><Check/>Save preferences</button>
    </div><aside className="connection-panel"><span className="eyebrow">SYSTEM STATUS</span><h2>Your connections</h2><p>Roamly checks these services through the secure backend.</p><div className="connection-list"><ConnectionStatus icon={Wifi} label="AI model" value={health?.model || 'Checking…'} good={Boolean(health?.ai_configured) && !healthError}/><ConnectionStatus icon={Database} label="Trip storage" value={health ? (health.storage === 'supabase' ? 'Supabase' : 'Temporary memory') : 'Checking…'} good={health?.storage === 'supabase' && !healthError}/><ConnectionStatus icon={ShieldCheck} label="FastAPI" value={healthError ? 'Unavailable' : health ? 'Connected' : 'Checking…'} good={Boolean(health) && !healthError}/></div>{healthError && <div className="connection-warning">Start the backend on port 8000 to view live status.</div>}</aside></div>
  </div>
}

function ConnectionStatus({ icon: Icon, label, value, good }: { icon: typeof Compass; label: string; value: string; good: boolean }) {
  return <div className="connection-item"><span className={good ? 'connected' : ''}><Icon/></span><div><small>{label}</small><strong>{value}</strong></div><i className={good ? 'good' : ''}/></div>
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Compass; tone: string }) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon /></span><div><small>{label}</small><strong>{value}</strong><span>{note}</span></div></div>
}

function TripCard({ trip, index, open }: { trip: Trip; index: number; open: () => void }) {
  return <button className="trip-card" onClick={open}><div className={`destination-art art-${index % 3}`}><span className="destination-badge">{trip.status || 'PLANNED'}</span><div className="art-orb"/><div className="art-hills"><i/><b/></div></div><div className="trip-card-copy"><span>{formatDate(trip.start_date, { month: 'short', year: 'numeric' }).toUpperCase()}</span><h3>{trip.destination}</h3><p>{trip.country} · {trip.itinerary.length} days · {trip.travelers} travelers</p><div><span>{trip.interests.slice(0, 2).join(' · ')}</span><span>→</span></div></div></button>
}

function TripBuilder({ preferences, onGenerate, loading, error, back }: { preferences: UserPreferences; onGenerate: (f: GenerateTripInput) => void; loading: boolean; error: string; back: () => void }) {
  const [form, setForm] = useState<GenerateTripInput>({ ...emptyForm, currency: preferences.currency, pace: preferences.pace })
  const [travelerInput, setTravelerInput] = useState(String(emptyForm.travelers))
  const [budgetInput, setBudgetInput] = useState(String(emptyForm.budget))
  const interests = ['Food', 'Culture', 'Nature', 'Adventure', 'Art', 'Shopping', 'Nightlife', 'Wellness']
  const update = <K extends keyof GenerateTripInput>(key: K, value: GenerateTripInput[K]) => setForm((old) => ({ ...old, [key]: value }))
  const toggle = (interest: string) => update('interests', form.interests.includes(interest) ? form.interests.filter((i) => i !== interest) : [...form.interests, interest])
  const canGenerate = form.destination && form.start_date && form.end_date && form.travelers > 0 && form.budget > 0
  return <div className="page builder-page">
    <button className="back-link" onClick={back}><ArrowLeft />Back to overview</button>
    <div className="builder-intro"><span className="eyebrow"><Sparkles size={13}/> AI TRIP BUILDER</span><h1>Let’s shape your next escape.</h1><p>Give us the essentials. We’ll connect the dots into a trip that feels unmistakably yours.</p></div>
    <div className="builder-layout">
      <form className="builder-form" onSubmit={(e) => { e.preventDefault(); if (canGenerate) onGenerate(form) }}>
        <FormSection number="01" title="The essentials" subtitle="Where and when are we going?">
          <label className="field field-full"><span>Destination</span><div className="input-wrap"><MapPin/><input placeholder="e.g. Kyoto, Japan" value={form.destination} onChange={(e) => update('destination', e.target.value)} required /></div></label>
          <label className="field"><span>Start date</span><div className="input-wrap"><CalendarDays/><input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} required /></div></label>
          <label className="field"><span>End date</span><div className="input-wrap"><CalendarDays/><input type="date" min={form.start_date} value={form.end_date} onChange={(e) => update('end_date', e.target.value)} required /></div></label>
          <label className="field"><span>Travelers</span><div className="input-wrap"><Users/><input type="number" min="1" max="20" inputMode="numeric" placeholder="Number of people" value={travelerInput} onChange={(e) => { const value = e.target.value; setTravelerInput(value); update('travelers', value === '' ? 0 : Number(value)) }} /></div></label>
          <label className="field"><span>Total budget</span><div className="input-wrap budget-input"><span className="currency-symbol" aria-hidden="true">{currencySymbols[form.currency] || form.currency}</span><input type="number" min="100" step="100" inputMode="numeric" placeholder="Enter amount" value={budgetInput} onChange={(e) => { const value = e.target.value; setBudgetInput(value); update('budget', value === '' ? 0 : Number(value)) }} /><select aria-label="Currency" value={form.currency} onChange={(e) => update('currency', e.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>JPY</option></select></div></label>
        </FormSection>
        <FormSection number="02" title="Your travel rhythm" subtitle="Make the plan feel like you.">
          <div className="field field-full"><span>What are you into?</span><div className="interest-grid">{interests.map((interest) => <button type="button" key={interest} className={form.interests.includes(interest) ? 'selected' : ''} onClick={() => toggle(interest)}>{form.interests.includes(interest) && <Check/>}{interest}</button>)}</div></div>
          <div className="field field-full"><span>Preferred pace</span><div className="choice-row">{['Relaxed', 'Balanced', 'Packed'].map((pace) => <button type="button" key={pace} className={form.pace === pace ? 'selected' : ''} onClick={() => update('pace', pace)}><strong>{pace}</strong><small>{pace === 'Relaxed' ? 'Room to wander' : pace === 'Balanced' ? 'A thoughtful mix' : 'See all you can'}</small></button>)}</div></div>
          <label className="field field-full"><span>Stay style</span><div className="input-wrap"><Hotel/><select value={form.accommodation} onChange={(e) => update('accommodation', e.target.value)}><option>Boutique hotel</option><option>Budget hotel</option><option>Premium resort</option><option>Hostel</option><option>Vacation rental</option></select><ChevronDown/></div></label>
          <label className="field field-full"><span>Anything else?</span><textarea placeholder="Dietary needs, accessibility, must-see places, special occasions..." value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label>
        </FormSection>
        {error && <div className="error-message">{error}</div>}
        <button className="generate-btn" type="submit" disabled={!canGenerate || loading}>{loading ? <><LoaderCircle className="spin"/>Designing your trip…</> : <><Sparkles/>Generate my itinerary<span>→</span></>}</button>
        <p className="fine-print">You can edit every detail after your itinerary is generated.</p>
      </form>
      <aside className="builder-preview"><span className="eyebrow">YOUR TRIP AT A GLANCE</span><div className="preview-map"><div className="map-route"/><MapPin/><span>{form.destination || 'Your destination'}</span></div><h3>{form.destination || 'A new adventure'}</h3><p>{form.start_date && form.end_date ? `${formatDate(form.start_date)} – ${formatDate(form.end_date)}` : 'Choose your travel dates'}</p><div className="preview-facts"><span><Users/> {form.travelers || '—'} {form.travelers === 1 ? 'traveler' : 'travelers'}</span><span><strong className="preview-currency">{currencySymbols[form.currency] || form.currency}</strong> {form.budget ? form.budget.toLocaleString() : '—'}</span><span><Compass/> {form.pace} pace</span></div><div className="preview-interests">{form.interests.map((i) => <span key={i}>{i}</span>)}</div><div className="ai-note"><Sparkles/><p><strong>Built around you</strong>Roamly balances travel time, cost, and your interests—then leaves space for discovery.</p></div></aside>
    </div>
  </div>
}

function FormSection({ number, title, subtitle, children }: { number: string; title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="form-section"><div className="form-section-head"><span>{number}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div><div className="form-fields">{children}</div></section>
}

function TripView({ trip, save, notify, back }: { trip: Trip; save: (t: Trip) => void; notify: (m: string) => void; back: () => void }) {
  const [activeDay, setActiveDay] = useState(1)
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const day = trip.itinerary.find((item) => item.day === activeDay) || trip.itinerary[0]
  const dayIndex = trip.itinerary.findIndex((item) => item.day === day?.day)
  const totalActivities = useMemo(() => trip.itinerary.reduce((sum, item) => sum + item.activities.length, 0), [trip])
  const dayMinutes = day?.activities.reduce((sum, item) => sum + item.duration_minutes, 0) || 0
  const regenerate = async () => {
    if (!day) return
    setRegenerating(day.day)
    try { const updated = await api.regenerateDay(trip.id, day.day); save(updated) } catch { notify('Connect your AI server to regenerate this day') }
    finally { setRegenerating(null) }
  }
  const removeActivity = (index: number) => {
    const itinerary = trip.itinerary.map((item) => item.day === day.day ? { ...item, activities: item.activities.filter((_, i) => i !== index) } : item)
    save({ ...trip, itinerary })
  }
  const moveDay = (offset: number) => {
    const target = trip.itinerary[dayIndex + offset]
    if (target) { setActiveDay(target.day); window.scrollTo({ top: 300, behavior: 'smooth' }) }
  }
  return <div className="trip-view">
    <header className="trip-banner"><div className="trip-banner-art"><span className="banner-grid"/><span className="banner-sun"/><span className="banner-mountain one"/><span className="banner-mountain two"/><span className="banner-route"><i/><i/><i/></span></div><div className="trip-banner-content"><button className="back-link light" onClick={back}><ArrowLeft/>All trips</button><span className="status-pill"><i/>READY TO EXPLORE</span><h1>{trip.destination}</h1><p>{trip.country} <b>·</b> {formatDate(trip.start_date, { month: 'long', day: 'numeric' })} – {formatDate(trip.end_date, { month: 'long', day: 'numeric', year: 'numeric' })}</p><div className="trip-banner-facts"><span><CalendarDays/> {trip.itinerary.length} days</span><span><Users/> {trip.travelers} travelers</span><span><CircleDollarSign/> {trip.currency} {trip.total_estimated_cost.toLocaleString()}</span><span><Sparkles/> AI crafted</span></div></div><button className="banner-edit" onClick={() => notify('Trip details are ready to edit')}><Edit3/>Edit trip</button></header>
    <div className="trip-content">
      <div className="trip-overview"><div><span className="eyebrow"><Sparkles size={13}/> YOUR AI-CRAFTED JOURNEY</span><h2>{trip.itinerary.length > 1 ? `${trip.itinerary.length} thoughtful days` : 'One thoughtful day'} in {trip.destination}.</h2><p>{cleanText(trip.summary)}</p><div className="overview-tags">{trip.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div><div className="overview-stats"><span><strong>{totalActivities}</strong>curated stops</span><span><strong>{trip.interests.length}</strong>interests woven in</span><span><strong>{trip.currency} {trip.total_estimated_cost.toLocaleString()}</strong>estimated total</span></div></div>
      <section className="itinerary-section"><div className="itinerary-title"><div><span className="eyebrow">YOUR DAY-BY-DAY PLAN</span><h2>The journey, beautifully mapped.</h2></div><div className="day-jump"><label htmlFor="day-select">Jump to</label><select id="day-select" value={activeDay} onChange={(event) => setActiveDay(Number(event.target.value))}>{trip.itinerary.map((item) => <option value={item.day} key={item.day}>Day {item.day} · {formatDate(item.date)}</option>)}</select></div></div>
        <div className="day-tabs-shell"><button className="day-arrow" disabled={dayIndex <= 0} onClick={() => moveDay(-1)} aria-label="Previous day">‹</button><div className="day-tabs" role="tablist">{trip.itinerary.map((item) => <button role="tab" aria-selected={activeDay === item.day} className={activeDay === item.day ? 'active' : ''} onClick={() => setActiveDay(item.day)} key={item.day}><small>DAY {item.day}</small><strong>{formatDate(item.date, { month: 'short', day: 'numeric' })}</strong><span>{item.activities.length} stops</span></button>)}</div><button className="day-arrow" disabled={dayIndex >= trip.itinerary.length - 1} onClick={() => moveDay(1)} aria-label="Next day">›</button></div>
      </section>
      {day && <div className="itinerary-layout"><section className="day-plan"><header className="day-plan-head"><div className="day-number">{String(day.day).padStart(2, '0')}</div><div className="day-title"><span>{formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h2>{cleanText(day.title)}</h2><p>{cleanText(day.summary)}</p></div><button className="subtle-btn regenerate-btn" onClick={regenerate} disabled={regenerating === day.day}><RefreshCw className={regenerating ? 'spin' : ''}/>{regenerating ? 'Reimagining…' : 'Regenerate day'}</button></header>
        <div className="timeline">{day.activities.map((activity, index) => {
          const categoryKey = activity.category.split(/[|,/]/)[0].trim().toLowerCase(); const item = categories[categoryKey] || categories.sightseeing; const Icon = item.icon
          const hours = Math.floor(activity.duration_minutes / 60); const minutes = activity.duration_minutes % 60
          return <article className="activity" key={`${activity.time}-${index}`}><div className="activity-time">{activity.time}</div><div className={`timeline-icon ${item.tone}`}><Icon/></div><div className="activity-card"><div className="activity-card-main"><span className="activity-category">{categoryLabel(activity.category)}</span><h3>{cleanText(activity.title)}</h3><p>{cleanText(activity.description)}</p><div className="activity-meta"><span><MapPin/> {cleanText(activity.location)}</span><span><Clock3/> {hours ? `${hours}h` : ''} {minutes ? `${minutes}m` : ''}</span><span><CircleDollarSign/> {activity.estimated_cost ? `~${trip.currency} ${activity.estimated_cost.toLocaleString()}` : 'Included'}</span></div></div><div className="activity-actions"><button aria-label="Edit activity" onClick={() => notify('Activity selected for editing')}><Edit3/></button><button aria-label="Remove activity" onClick={() => removeActivity(index)}><Trash2/></button></div></div></article>
        })}</div>
        <button className="add-activity" onClick={() => notify('Add activity mode opened')}><Plus/>Add an activity</button>
        <div className="next-day-row"><button disabled={dayIndex <= 0} onClick={() => moveDay(-1)}><ArrowLeft/>Previous</button><span>Day {day.day} of {trip.itinerary.length}</span><button disabled={dayIndex >= trip.itinerary.length - 1} onClick={() => moveDay(1)}>Next day<span>→</span></button></div>
      </section><aside className="day-aside"><div className="day-aside-card"><span className="eyebrow">DAY AT A GLANCE</span><div className="aside-stat"><Clock3/><span><strong>{Math.floor(dayMinutes / 60)}h {dayMinutes % 60}m</strong>planned experiences</span></div><div className="aside-stat"><MapPin/><span><strong>{day.activities.length} stops</strong>thoughtfully sequenced</span></div><div className="aside-stat"><CircleDollarSign/><span><strong>{trip.currency} {day.daily_cost.toLocaleString()}</strong>estimated for the day</span></div><div className="day-budget"><span>Trip budget used</span><strong>{Math.min(100, Math.round((trip.total_estimated_cost / trip.budget) * 100))}%</strong><div><i style={{ width: `${Math.min(100, (trip.total_estimated_cost / trip.budget) * 100)}%` }}/></div></div></div><div className="trip-tip"><span><Sparkles/></span><div><strong>A note from Roamly</strong><p>Leave a little breathing room—the best travel moments are often the ones you didn’t plan.</p></div></div></aside></div>}
    </div>
  </div>
}

export default App
