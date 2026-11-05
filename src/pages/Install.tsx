import { Download, MonitorSmartphone, Share, SquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../components/ui'
import { useCatalog } from '../state/catalog'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as BeforeInstallPromptEvent) }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled) }
  }, [])
  return { event, installed, clear: () => setEvent(null) }
}

export default function Install() {
  const { catalog } = useCatalog()
  const { event, installed, clear } = useInstallPrompt()
  useDocumentTitle('Get the app')
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)
  const step = 'flex gap-3 text-sm leading-relaxed'
  const num = 'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white'

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Install</p>
      <h1 className="mt-2 text-4xl font-semibold">Add {catalog.settings.name} to your home screen</h1>
      <p className="mt-3 text-ink-soft">Open the menu in one tap, browse offline and order faster. It’s free, takes no storage to speak of, and there’s no app store needed.</p>

      {installed ? (
        <p className="mt-6 rounded-2xl bg-[#e4eedc] p-4 font-semibold text-basil">The app is installed on this device. 🎉</p>
      ) : event ? (
        <button type="button" className="btn-primary mt-6 px-7 py-4 text-lg" onClick={async () => { await event.prompt(); await event.userChoice; clear() }}>
          <Download size={20} /> Install the app
        </button>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className={`card p-6 ${isIOS ? 'ring-2 ring-brand' : ''}`}>
          <h2 className="text-xl font-semibold">iPhone &amp; iPad</h2>
          <ol className="mt-4 space-y-3">
            <li className={step}><span className={num}>1</span>Open this page in <strong>Safari</strong>.</li>
            <li className={step}><span className={num}>2</span><span>Tap the <strong>Share</strong> button <Share size={15} className="inline" /> at the bottom (or top) of the screen.</span></li>
            <li className={step}><span className={num}>3</span><span>Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus size={15} className="inline" />.</span></li>
            <li className={step}><span className={num}>4</span>Tap <strong>Add</strong>. The app icon appears on your home screen.</li>
          </ol>
        </section>
        <section className={`card p-6 ${/Android/.test(ua) ? 'ring-2 ring-brand' : ''}`}>
          <h2 className="text-xl font-semibold">Android</h2>
          <ol className="mt-4 space-y-3">
            <li className={step}><span className={num}>1</span>Open this page in <strong>Chrome</strong>.</li>
            <li className={step}><span className={num}>2</span>Tap <strong>Install app</strong> when prompted, or open the <strong>⋮ menu</strong>.</li>
            <li className={step}><span className={num}>3</span>Choose <strong>Install app</strong> / <strong>Add to Home screen</strong> and confirm.</li>
          </ol>
        </section>
        <section className="card p-6 md:col-span-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><MonitorSmartphone size={20} /> Windows &amp; Mac</h2>
          <p className="mt-3 text-sm leading-relaxed">
            In <strong>Chrome</strong> or <strong>Edge</strong>, click the install icon at the right of the address bar (or menu → <em>Install {catalog.settings.name}</em>).
            On a Mac with <strong>Safari 17+</strong>, choose <em>File → Add to Dock</em>.
          </p>
        </section>
      </div>
      <p className="mt-6 text-xs text-ink-soft">Installation requires the site to be served over HTTPS (GitHub Pages does this automatically).</p>
    </div>
  )
}

export function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-4xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-2 text-ink-soft">It may have moved. Our pizzas haven’t.</p>
      <Link to="/menu" className="btn-primary mt-8">Go to the menu</Link>
    </div>
  )
}
