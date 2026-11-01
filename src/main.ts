import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig, type ModuleSecrets } from './config.js'
import { playlistValues, statusValues, UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { ZionWorxClient, type ZwConnectionState, type ZwPlaylist, type ZwStatus } from './zionworx.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: ModuleSecrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

const cTickMs = 250 // the clocks change once a second; a quarter keeps them within a quarter of ZionWorx's

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	secrets!: ModuleSecrets
	client: ZionWorxClient | null = null
	status: ZwStatus | null = null
	playlist: ZwPlaylist | null = null
	private statusAt = 0
	private definedItems = 0
	private sent: Partial<VariablesSchema> = {}
	private tickTimer: NodeJS.Timeout | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions

		this.startClient()
		this.tickTimer = setInterval(() => this.sendVariables(), cTickMs)
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		if (this.tickTimer) clearInterval(this.tickTimer)
		this.tickTimer = null
		this.client?.stop()
		this.client = null
	}

	async configUpdated(config: ModuleConfig, secrets: ModuleSecrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.startClient()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this, this.definedItems)
	}

	private onStatus(status: ZwStatus | null): void {
		this.status = status
		this.statusAt = Date.now()
		this.checkFeedbacks(
			'mode',
			'camera',
			'liveItem',
			'itemUnavailable',
			'liveSlide',
			'mediaPlaying',
			'muted',
			'alert',
			'unavailable',
		)
		this.sendVariables()
	}

	private onPlaylist(playlist: ZwPlaylist): void {
		this.playlist = playlist
		this.checkFeedbacks('itemUnavailable')
		if (playlist.count !== this.definedItems) {
			this.definedItems = playlist.count
			this.updateVariableDefinitions()
		}
		this.sendVariables()
	}

	/** Sends the variables whose values changed, with the times moved on to now. */
	private sendVariables(): void {
		const values: Partial<VariablesSchema> = {
			...playlistValues(this.playlist),
			...statusValues(this.status, Date.now() - this.statusAt),
		}
		const changed: Partial<VariablesSchema> = {}
		let any = false
		for (const [id, value] of Object.entries(values) as [
			keyof VariablesSchema,
			VariablesSchema[keyof VariablesSchema],
		][]) {
			if (this.sent[id] !== value) {
				changed[id] = value as never
				this.sent[id] = value as never
				any = true
			}
		}
		if (any) this.setVariableValues(changed)
	}

	private startClient(): void {
		this.client?.stop()
		this.client = null
		this.onStatus(null)
		this.playlist = null

		const host = (this.config.host ?? '').trim()
		const token = (this.secrets?.token ?? '').trim()
		if (host === '' || !this.config.port) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the ZionWorx PC address and port')
			return
		}
		if (token === '') {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the API client token (Web Remote → Add API Client…)')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		this.client = new ZionWorxClient(host, this.config.port, token, `companion-${this.id}`, {
			state: (state) => this.onState(state),
			status: (status) => this.onStatus(status),
			playlist: (playlist) => this.onPlaylist(playlist),
			log: (level, message) => this.log(level, message),
		})
		this.client.start()
	}

	private onState(state: ZwConnectionState): void {
		// Not connected: feedbacks go dark / grey; the variables keep their last values.
		if (state.kind !== 'ok' && this.status) this.onStatus(null)
		switch (state.kind) {
			case 'connecting':
				this.updateStatus(InstanceStatus.Connecting)
				break
			case 'ok':
				this.updateStatus(InstanceStatus.Ok)
				this.log('info', `Connected to ZionWorx ${state.build} on ${state.server}`)
				break
			case 'badToken':
				this.updateStatus(InstanceStatus.AuthenticationFailure, 'ZionWorx does not know this token')
				break
			case 'removed':
				this.updateStatus(InstanceStatus.AuthenticationFailure, 'This API client was removed in ZionWorx')
				break
			case 'lockedOut':
				this.updateStatus(InstanceStatus.UnknownWarning, 'Too many bad tokens from this address; wait a minute')
				break
			case 'unreachable':
				this.updateStatus(InstanceStatus.ConnectionFailure, state.reason)
				break
		}
	}
}
