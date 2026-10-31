// Client for ZionWorx's control API (common\WebRemote\HTTP_API.md in the ZionWorx source).
//
// State and commands go over the public HTTP API v1 (GET status / playlist, POST commands). The WebSocket (/ws) is
// used only as a change signal: ZionWorx pushes a message whenever the playlist, the live item or the stage changes,
// and each one triggers a fresh GET. So the module depends on the WebSocket's hello / welcome / ping / close codes,
// not on the phone page's message formats. A slow poll covers anything the socket misses.

export type ZwMode = 'logo' | 'blank' | 'hideText' | 'showAll'

export interface ZwStatus {
	api: number
	playlist: { title: string; count: number }
	live: {
		item: number
		title: string
		type: string
		slide: number
		slides: number
		label: string
		mode: ZwMode
		camera: boolean
	}
	next: { item: number; title: string; type: string } | null
	avail: {
		showAll: boolean
		hideText: boolean
		camera: boolean
		slides: boolean
		playPause: boolean
		seek: boolean
		restart: boolean
	}
	media: {
		playing: boolean
		position: number
		duration: number
		remaining: number
		positionText: string
		remainingText: string
	}
	elapsed: { ms: number; running: boolean; text: string }
	countdown: { ms: number; text: string } | null
	alerts: { main: string; stage: string }
}

export interface ZwPlaylist {
	title: string
	count: number
	items: { n: number; title: string; type: string; live: boolean }[]
}

export type ZwConnectionState =
	| { kind: 'connecting' }
	| { kind: 'ok'; server: string; build: string }
	| { kind: 'badToken' }
	| { kind: 'removed' }
	| { kind: 'lockedOut' }
	| { kind: 'unreachable'; reason: string }

export interface ZwClientEvents {
	state(state: ZwConnectionState): void
	status(status: ZwStatus): void
	playlist(playlist: ZwPlaylist): void
	log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void
}

export interface ZwCommandResult {
	ok: boolean
	status: number
	err?: string
}

const cProtocol = 1
const cSilenceMs = 10000 // nothing heard for this long: the socket is dead
const cSafetyPollMs = 10000
const cRetryMinMs = 1000
const cRetryMaxMs = 30000
const cRefreshDelayMs = 30 // gathers a burst of pushes into one GET

export class ZionWorxClient {
	private ws: WebSocket | null = null
	private stopped = true
	private retryMs = cRetryMinMs
	private retryTimer: NodeJS.Timeout | null = null
	private silenceTimer: NodeJS.Timeout | null = null
	private pollTimer: NodeJS.Timeout | null = null
	private refreshTimer: NodeJS.Timeout | null = null
	private refreshPlaylist = false
	private fetching = false
	private fetchAgain = false
	private state: ZwConnectionState = { kind: 'connecting' }

	constructor(
		private readonly host: string,
		private readonly port: number,
		private readonly token: string,
		private readonly clientId: string,
		private readonly events: ZwClientEvents,
	) {}

	get baseUrl(): string {
		return `http://${this.host}:${this.port}/api/v1/`
	}

	start(): void {
		this.stopped = false
		this.connect()
		this.pollTimer = setInterval(() => {
			if (this.state.kind === 'ok') this.scheduleRefresh(true)
		}, cSafetyPollMs)
	}

	stop(): void {
		this.stopped = true
		for (const t of [this.retryTimer, this.silenceTimer, this.refreshTimer]) if (t) clearTimeout(t)
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.retryTimer = this.silenceTimer = this.refreshTimer = this.pollTimer = null
		if (this.ws) {
			this.ws.onopen = this.ws.onmessage = this.ws.onclose = this.ws.onerror = null
			this.ws.close(1000)
			this.ws = null
		}
	}

	/** POST a command, e.g. 'slide/next' or 'item/3'. */
	async command(path: string): Promise<ZwCommandResult> {
		const res = await this.request('POST', path)
		if (!res) return { ok: false, status: 0, err: 'unreachable' }
		const body = (await res.json().catch(() => ({}))) as { ok?: boolean; err?: string }
		if (res.ok) this.scheduleRefresh(false)
		return { ok: res.ok && body.ok === true, status: res.status, err: body.err }
	}

	private setState(state: ZwConnectionState): void {
		this.state = state
		this.events.state(state)
	}

	// --- WebSocket: the change signal -------------------------------------------------------------------------------

	private connect(): void {
		if (this.stopped) return
		let ws: WebSocket
		try {
			ws = new WebSocket(`ws://${this.host}:${this.port}/ws`)
		} catch (e) {
			this.setState({ kind: 'unreachable', reason: String(e) })
			this.retryLater()
			return
		}
		this.ws = ws
		ws.onopen = () => {
			ws.send(
				JSON.stringify({
					t: 'hello',
					proto: cProtocol,
					token: this.token,
					view: 'control',
					device: { id: this.clientId, name: 'Companion', ua: 'Bitfocus Companion module' },
				}),
			)
			this.heard()
		}
		ws.onmessage = (e) => {
			this.heard()
			let msg: { t?: string; n?: number; server?: { name?: string; build?: string } }
			try {
				msg = JSON.parse(String(e.data))
			} catch {
				return
			}
			switch (msg.t) {
				case 'welcome':
					this.retryMs = cRetryMinMs
					this.setState({ kind: 'ok', server: msg.server?.name ?? '', build: msg.server?.build ?? '' })
					this.scheduleRefresh(true)
					break
				case 'ping':
					ws.send(JSON.stringify({ t: 'pong', n: msg.n }))
					break
				case 'pong':
					break
				case 'snapshot':
				case 'playlist':
					this.scheduleRefresh(true)
					break
				default:
					// live, slides, screen, stage, …: something on screen changed.
					this.scheduleRefresh(false)
			}
		}
		ws.onerror = () => {
			// onclose follows with the details.
		}
		ws.onclose = (e) => {
			if (this.ws !== ws) return
			this.ws = null
			if (this.silenceTimer) clearTimeout(this.silenceTimer)
			if (this.stopped) return
			switch (e.code) {
				case 4001:
					this.setState({ kind: 'badToken' })
					return // fatal until the config changes, as on the phone
				case 4002:
					this.setState({ kind: 'removed' })
					return
				case 4004:
					this.events.log('error', 'ZionWorx speaks a different WebSocket protocol version; update the module')
					this.setState({ kind: 'unreachable', reason: 'protocol mismatch' })
					break
				default:
					this.setState({
						kind: 'unreachable',
						reason: e.code === 1001 ? 'ZionWorx closed or Web Remote switched off' : `closed (${e.code})`,
					})
			}
			this.retryLater()
		}
	}

	private heard(): void {
		if (this.silenceTimer) clearTimeout(this.silenceTimer)
		this.silenceTimer = setTimeout(() => {
			this.events.log('debug', 'nothing heard from ZionWorx for 10 s; reconnecting')
			this.ws?.close(4000)
		}, cSilenceMs)
	}

	private retryLater(): void {
		if (this.stopped || this.retryTimer) return
		const ms = this.retryMs
		this.retryMs = Math.min(this.retryMs * 2, cRetryMaxMs)
		this.retryTimer = setTimeout(() => {
			this.retryTimer = null
			this.connect()
		}, ms)
	}

	// --- HTTP: state --------------------------------------------------------------------------------------------------

	private scheduleRefresh(withPlaylist: boolean): void {
		this.refreshPlaylist ||= withPlaylist
		if (this.refreshTimer) return
		this.refreshTimer = setTimeout(() => {
			this.refreshTimer = null
			void this.refresh()
		}, cRefreshDelayMs)
	}

	private async refresh(): Promise<void> {
		if (this.fetching) {
			this.fetchAgain = true
			return
		}
		this.fetching = true
		try {
			do {
				this.fetchAgain = false
				const withPlaylist = this.refreshPlaylist
				this.refreshPlaylist = false
				const status = await this.getJson<ZwStatus>('status')
				if (status) this.events.status(status)
				if (withPlaylist) {
					const playlist = await this.getJson<ZwPlaylist>('playlist')
					if (playlist) this.events.playlist(playlist)
				}
			} while (this.fetchAgain && !this.stopped)
		} finally {
			this.fetching = false
		}
	}

	private async getJson<T>(path: string): Promise<T | null> {
		const res = await this.request('GET', path)
		if (!res?.ok) return null
		return (await res.json().catch(() => null)) as T | null
	}

	private async request(method: 'GET' | 'POST', path: string): Promise<Response | null> {
		if (this.stopped) return null
		let res: Response
		try {
			res = await fetch(this.baseUrl + path, {
				method,
				headers: { Authorization: `Bearer ${this.token}` },
				signal: AbortSignal.timeout(5000),
			})
		} catch (e) {
			this.events.log('debug', `${method} ${path} failed: ${String(e)}`)
			return null
		}
		switch (res.status) {
			case 401:
				this.setState({ kind: 'badToken' })
				break
			case 403:
				this.setState({ kind: 'removed' })
				break
			case 429:
				this.setState({ kind: 'lockedOut' })
				break
		}
		return res
	}
}
