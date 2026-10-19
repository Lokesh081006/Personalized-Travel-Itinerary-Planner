import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, CalendarDays, Check, ChevronDown, CircleDollarSign, Clock3,
  Compass, Edit3, Heart, Hotel, LayoutDashboard, LoaderCircle, MapPin,
  Menu, MoreHorizontal, Navigation, Plus, RefreshCw, Search, Settings,
  Sparkles, Trash2, Users, Utensils, WandSparkles, X,
} from 'lucide-react'
import { api } from './api'
import type { GenerateTripInput, ItineraryDay, Trip } from './types'

type View = 'dashboard' | 'builder' | 'trip'

const categories: Record<string, { icon: typeof Compass; tone: string }> = {
  sightseeing: { icon: MapPin, tone: 'coral' },
  food: { icon: Utensils, tone: 'gold' },
  culture: { icon: Compass, tone: 'blue' },
  adventure: { icon: Navigation, tone: 'green' },
  relaxation: { icon: Heart, tone: 'rose' },
  transport: { icon: Navigation, tone: 'slate' },
}

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
  return new Intl.DateTimeFormat('en-US', options || { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
}

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [trips, setTrips] = useState<Trip[]>([demoTrip])
  const [selected, setSelected] = useState<Trip>(demoTrip)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.listTrips().then((saved) => saved.length && setTrips(saved)).catch(() => undefined)
  }, [])

  const navigate = (next: View) => { setView(next); setSidebar(false); window.scrollTo(0, 0) }
  const openTrip = (trip: Trip) => { setSelected(trip); navigate('trip') }
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  const generate = async (input: GenerateTripInput) => {
    setLoading(true); setError('')
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
      <Sidebar view={view} navigate={navigate} open={sidebar} close={() => setSidebar(false)} />
      <main className="main-content">
        <MobileTopbar onMenu={() => setSidebar(true)} onCreate={() => navigate('builder')} />
        {view === 'dashboard' && <Dashboard trips={trips} openTrip={openTrip} create={() => navigate('builder')} />}
        {view === 'builder' && <TripBuilder onGenerate={generate} loading={loading} error={error} back={() => navigate('dashboard')} />}
        {view === 'trip' && <TripView trip={selected} save={saveTrip} notify={notify} back={() => navigate('dashboard')} />}
      </main>
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  )
}

function Sidebar({ view, navigate, open, close }: { view: View; navigate: (v: View) => void; open: boolean; close: () => void }) {
  return <>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={close} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Compass size={21} /></span><span>roamly</span><button className="sidebar-close" onClick={close}><X /></button></div>
      <nav className="nav-list">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => navigate('dashboard')}><LayoutDashboard />Overview</button>
        <button className={view === 'builder' ? 'active' : ''} onClick={() => navigate('builder')}><WandSparkles />Plan a trip</button>
        <button><MapPin />My trips<span className="nav-count">3</span></button>
        <button><Heart />Saved places</button>
      </nav>
      <div className="sidebar-spacer" />
      <div className="insight-card">
        <span className="insight-icon"><Sparkles size={16} /></span>
        <strong>Travel smarter</strong><p>Roamly learns your style every time you plan.</p>
      </div>
      <nav className="nav-list nav-bottom"><button><Settings />Settings</button></nav>
      <div className="profile"><div className="avatar">AK</div><div><strong>Alex Kumar</strong><span>Explorer plan</span></div><MoreHorizontal size={18} /></div>
    </aside>
  </>
}

function MobileTopbar({ onMenu, onCreate }: { onMenu: () => void; onCreate: () => void }) {
  return <header className="mobile-top"><button onClick={onMenu}><Menu /></button><div className="brand"><span className="brand-mark"><Compass size={19} /></span>roamly</div><button onClick={onCreate}><Plus /></button></header>
}

function Dashboard({ trips, openTrip, create }: { trips: Trip[]; openTrip: (t: Trip) => void; create: () => void }) {
  const next = trips[0] || demoTrip
  return <div className="page dashboard-page">
    <header className="page-header"><div><span className="eyebrow">MONDAY, OCTOBER 19</span><h1>Where to next, Alex?</h1><p>Pick up where you left off, or turn a new idea into a trip.</p></div><button className="primary-btn" onClick={create}><Plus size={18} />Plan a new trip</button></header>
    <section className="hero-trip" onClick={() => openTrip(next)}>
      <div className="hero-art"><div className="sun"/><div className="mountain mountain-back"/><div className="mountain mountain-front"/><div className="torii"><i/><i/><b/><em/></div><span className="cloud c1"/><span className="cloud c2"/></div>
      <div className="hero-copy"><span className="status-pill"><i/>UPCOMING</span><h2>{next.destination}, {next.country}</h2><p>{formatDate(next.start_date, { month: 'long', day: 'numeric' })} – {formatDate(next.end_date, { month: 'long', day: 'numeric', year: 'numeric' })} · {next.travelers} travelers</p><div className="hero-meta"><span><CalendarDays/> {next.itinerary.length || 5} days</span><span><CircleDollarSign/> {next.currency} {next.total_estimated_cost.toLocaleString()}</span><span><Sparkles/> AI planned</span></div><button className="text-btn">View itinerary <span>→</span></button></div>
    </section>
    <section className="metrics-grid">
      <Metric label="Trips planned" value="12" note="3 this year" icon={Compass} tone="green" />
      <Metric label="Places saved" value="38" note="Across 9 cities" icon={Heart} tone="coral" />
      <Metric label="Hours saved" value="24+" note="With AI planning" icon={Clock3} tone="blue" />
    </section>
    <section className="section-block"><div className="section-heading"><div><h2>Your trips</h2><p>Plans, memories, and places still to come.</p></div><button className="subtle-btn">View all <span>→</span></button></div>
      <div className="trip-grid">
        {trips.slice(0, 3).map((trip, index) => <TripCard key={trip.id} trip={trip} index={index} open={() => openTrip(trip)} />)}
        {trips.length < 3 && <button className="new-trip-card" onClick={create}><span><Plus /></span><strong>Dream up a new trip</strong><small>Tell us where you want to go</small></button>}
      </div>
    </section>
    <section className="inspiration"><div><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Your kind of places</h2><p>Curated around your love for food, culture, and slow travel.</p></div><div className="chips"><span>Coastal towns</span><span>Food capitals</span><span>Hidden temples</span><span>Scenic rail</span></div></section>
  </div>
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Compass; tone: string }) {
  return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon /></span><div><small>{label}</small><strong>{value}</strong><span>{note}</span></div></div>
}

function TripCard({ trip, index, open }: { trip: Trip; index: number; open: () => void }) {
  return <button className="trip-card" onClick={open}><div className={`destination-art art-${index % 3}`}><span className="destination-badge">{trip.status || 'PLANNED'}</span><div className="art-orb"/><div className="art-hills"><i/><b/></div></div><div className="trip-card-copy"><span>{formatDate(trip.start_date, { month: 'short', year: 'numeric' }).toUpperCase()}</span><h3>{trip.destination}</h3><p>{trip.country} · {trip.itinerary.length} days · {trip.travelers} travelers</p><div><span>{trip.interests.slice(0, 2).join(' · ')}</span><span>→</span></div></div></button>
}

function TripBuilder({ onGenerate, loading, error, back }: { onGenerate: (f: GenerateTripInput) => void; loading: boolean; error: string; back: () => void }) {
  const [form, setForm] = useState<GenerateTripInput>(emptyForm)
  const interests = ['Food', 'Culture', 'Nature', 'Adventure', 'Art', 'Shopping', 'Nightlife', 'Wellness']
  const update = <K extends keyof GenerateTripInput>(key: K, value: GenerateTripInput[K]) => setForm((old) => ({ ...old, [key]: value }))
  const toggle = (interest: string) => update('interests', form.interests.includes(interest) ? form.interests.filter((i) => i !== interest) : [...form.interests, interest])
  const canGenerate = form.destination && form.start_date && form.end_date && form.budget > 0
  return <div className="page builder-page">
    <button className="back-link" onClick={back}><ArrowLeft />Back to overview</button>
    <div className="builder-intro"><span className="eyebrow"><Sparkles size={13}/> AI TRIP BUILDER</span><h1>Let’s shape your next escape.</h1><p>Give us the essentials. We’ll connect the dots into a trip that feels unmistakably yours.</p></div>
    <div className="builder-layout">
      <form className="builder-form" onSubmit={(e) => { e.preventDefault(); if (canGenerate) onGenerate(form) }}>
        <FormSection number="01" title="The essentials" subtitle="Where and when are we going?">
          <label className="field field-full"><span>Destination</span><div className="input-wrap"><MapPin/><input placeholder="e.g. Kyoto, Japan" value={form.destination} onChange={(e) => update('destination', e.target.value)} required /></div></label>
          <label className="field"><span>Start date</span><div className="input-wrap"><CalendarDays/><input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} required /></div></label>
          <label className="field"><span>End date</span><div className="input-wrap"><CalendarDays/><input type="date" min={form.start_date} value={form.end_date} onChange={(e) => update('end_date', e.target.value)} required /></div></label>
          <label className="field"><span>Travelers</span><div className="input-wrap"><Users/><input type="number" min="1" max="20" value={form.travelers} onChange={(e) => update('travelers', Number(e.target.value))} /></div></label>
          <label className="field"><span>Total budget</span><div className="input-wrap"><CircleDollarSign/><input type="number" min="100" step="100" value={form.budget} onChange={(e) => update('budget', Number(e.target.value))} /><select value={form.currency} onChange={(e) => update('currency', e.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>JPY</option></select></div></label>
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
      <aside className="builder-preview"><span className="eyebrow">YOUR TRIP AT A GLANCE</span><div className="preview-map"><div className="map-route"/><MapPin/><span>{form.destination || 'Your destination'}</span></div><h3>{form.destination || 'A new adventure'}</h3><p>{form.start_date && form.end_date ? `${formatDate(form.start_date)} – ${formatDate(form.end_date)}` : 'Choose your travel dates'}</p><div className="preview-facts"><span><Users/> {form.travelers} {form.travelers === 1 ? 'traveler' : 'travelers'}</span><span><CircleDollarSign/> {form.currency} {form.budget.toLocaleString()}</span><span><Compass/> {form.pace} pace</span></div><div className="preview-interests">{form.interests.map((i) => <span key={i}>{i}</span>)}</div><div className="ai-note"><Sparkles/><p><strong>Built around you</strong>Roamly balances travel time, cost, and your interests—then leaves space for discovery.</p></div></aside>
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
  const totalActivities = useMemo(() => trip.itinerary.reduce((sum, item) => sum + item.activities.length, 0), [trip])
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
  return <div className="trip-view">
    <header className="trip-banner"><div className="trip-banner-art"><span className="banner-sun"/><span className="banner-mountain one"/><span className="banner-mountain two"/></div><div className="trip-banner-content"><button className="back-link light" onClick={back}><ArrowLeft/>All trips</button><span className="status-pill"><i/>UPCOMING</span><h1>{trip.destination}</h1><p>{trip.country} · {formatDate(trip.start_date, { month: 'long', day: 'numeric' })} – {formatDate(trip.end_date, { month: 'long', day: 'numeric', year: 'numeric' })}</p><div className="trip-banner-facts"><span><CalendarDays/> {trip.itinerary.length} days</span><span><Users/> {trip.travelers} travelers</span><span><CircleDollarSign/> {trip.currency} {trip.total_estimated_cost.toLocaleString()}</span></div></div><button className="banner-edit" onClick={() => notify('Trip details are ready to edit')}><Edit3/>Edit trip</button></header>
    <div className="trip-content">
      <div className="trip-overview"><div><span className="eyebrow"><Sparkles size={13}/> YOUR AI-CRAFTED JOURNEY</span><h2>A thoughtful few days in {trip.destination}.</h2><p>{trip.summary}</p></div><div className="overview-stats"><span><strong>{totalActivities}</strong>curated stops</span><span><strong>{trip.interests.length}</strong>interests woven in</span><span><strong>{trip.currency} {trip.total_estimated_cost.toLocaleString()}</strong>estimated total</span></div></div>
      <div className="day-tabs" role="tablist">{trip.itinerary.map((item) => <button role="tab" aria-selected={activeDay === item.day} className={activeDay === item.day ? 'active' : ''} onClick={() => setActiveDay(item.day)} key={item.day}><small>DAY {item.day}</small><strong>{formatDate(item.date, { month: 'short', day: 'numeric' })}</strong></button>)}</div>
      {day && <section className="day-plan"><header className="day-plan-head"><div><span>DAY {day.day} · {formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span><h2>{day.title}</h2><p>{day.summary}</p></div><button className="subtle-btn" onClick={regenerate} disabled={regenerating === day.day}><RefreshCw className={regenerating ? 'spin' : ''}/>Regenerate day</button></header>
        <div className="timeline">{day.activities.map((activity, index) => {
          const item = categories[activity.category] || categories.sightseeing; const Icon = item.icon
          return <article className="activity" key={`${activity.time}-${index}`}><div className="activity-time">{activity.time}</div><div className={`timeline-icon ${item.tone}`}><Icon/></div><div className="activity-card"><div className="activity-card-main"><span className="activity-category">{activity.category}</span><h3>{activity.title}</h3><p>{activity.description}</p><div className="activity-meta"><span><MapPin/> {activity.location}</span><span><Clock3/> {Math.floor(activity.duration_minutes / 60)}h {activity.duration_minutes % 60 || ''}m</span><span><CircleDollarSign/> ~{trip.currency} {activity.estimated_cost}</span></div></div><div className="activity-actions"><button aria-label="Edit activity" onClick={() => notify('Activity selected for editing')}><Edit3/></button><button aria-label="Remove activity" onClick={() => removeActivity(index)}><Trash2/></button></div></div></article>
        })}</div>
        <button className="add-activity" onClick={() => notify('Add activity mode opened')}><Plus/>Add an activity</button>
        <footer className="day-total"><span>Estimated day total</span><strong>{trip.currency} {day.daily_cost.toLocaleString()}</strong></footer>
      </section>}
      <section className="trip-tip"><span><Sparkles/></span><div><strong>A small note from Roamly</strong><p>Your schedule leaves a little breathing room each afternoon. Keep it—the best travel moments are often the ones you didn’t plan.</p></div></section>
    </div>
  </div>
}

export default App
