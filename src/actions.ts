import type { CompanionInputFieldNumber } from '@companion-module/base'
import type ModuleInstance from './main.js'

// Every command in the HTTP API v1 (HTTP_API.md §2). Mode, camera and media commands set a state rather than toggle,
// so pressing a button twice never undoes it.

type Step = 'next' | 'prev' | 'number'

export type ActionsSchema = {
	slide: { options: { step: Step; n: number } }
	item: { options: { step: Step; n: number } }
	mode: { options: { mode: 'logo' | 'blank' | 'hidetext' | 'golive'; toggle: boolean } }
	camera: { options: { on: 'on' | 'off' | 'toggle' } }
	media: { options: { command: 'playpause' | 'restart' | 'rewind' | 'forward' } }
	volume: { options: { step: 'up' | 'down' | 'set'; n: number } }
	mute: { options: { mute: 'toggle' | 'mute' | 'unmute' } }
	autoAdvance: { options: { command: 'playpause' | 'play' | 'pause' } }
}

const cErrors: Record<string, string> = {
	badArgs: 'no such item or slide',
	unavailable: 'not possible now (no slides, slides still loading, nothing to play…)',
	stale: 'the live item changed while the command was on its way',
	unreachable: 'ZionWorx is not reachable',
	unknownEndpoint: 'this ZionWorx is too old for that command; update ZionWorx',
}

function numberField(what: string): CompanionInputFieldNumber<'n'> {
	return {
		id: 'n',
		type: 'number',
		label: `${what} number`,
		description: 'Numbered from 1. Switch to an expression to use a variable, e.g. $(custom:song)',
		default: 1,
		min: 1,
		max: 9999,
		asInteger: true,
		isVisibleExpression: `$(options:step) == 'number'`,
	}
}

function stepPath(area: 'slide' | 'item', step: Step, n: number): string | null {
	if (step !== 'number') return `${area}/${step}`
	const k = Math.round(Number(n))
	return Number.isFinite(k) && k >= 1 ? `${area}/${k}` : null
}

export function UpdateActions(self: ModuleInstance): void {
	const send = async (path: string | null, what: string): Promise<void> => {
		if (path === null) {
			self.log('warn', `${what}: the number must be 1 or more`)
			return
		}
		if (!self.client) {
			self.log('warn', `${what}: not connected to ZionWorx`)
			return
		}
		const res = await self.client.command(path)
		if (!res.ok) {
			const why = cErrors[res.err ?? ''] ?? res.err ?? `HTTP ${res.status}`
			self.log('warn', `${what} (${path}): ${why}`)
		}
	}

	self.setActionDefinitions({
		slide: {
			name: 'Slide: next / previous / go to',
			description: 'Moves through the slides of the live item',
			options: [
				{
					id: 'step',
					type: 'dropdown',
					label: 'Go to',
					choices: [
						{ id: 'next', label: 'Next slide' },
						{ id: 'prev', label: 'Previous slide' },
						{ id: 'number', label: 'Slide number…' },
					],
					default: 'next',
					disableAutoExpression: true,
				},
				numberField('Slide'),
			],
			callback: async ({ options }) => send(stepPath('slide', options.step, options.n), 'Slide'),
		},
		item: {
			name: 'Playlist item: next / previous / go to',
			description: 'Puts a playlist item live (Next with nothing live: the first item)',
			options: [
				{
					id: 'step',
					type: 'dropdown',
					label: 'Go to',
					choices: [
						{ id: 'next', label: 'Next item' },
						{ id: 'prev', label: 'Previous item' },
						{ id: 'number', label: 'Item number…' },
					],
					default: 'next',
					disableAutoExpression: true,
				},
				numberField('Item'),
			],
			callback: async ({ options }) => send(stepPath('item', options.step, options.n), 'Playlist item'),
		},
		mode: {
			name: 'Output mode',
			description:
				'Sets the output mode; choosing the mode already showing does nothing. Or, with Toggle with Go Live, a press while it shows goes back to Go Live',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'logo', label: 'Logo' },
						{ id: 'blank', label: 'Blank' },
						{ id: 'hidetext', label: 'Hide Text' },
						{ id: 'golive', label: 'Go Live' },
					],
					default: 'golive',
				},
				{
					id: 'toggle',
					type: 'checkbox',
					label: 'Toggle with Go Live',
					tooltip:
						'Pressed while this mode shows (set from anywhere: ZionWorx, a phone, another button), goes back to Go Live',
					default: false,
					isVisibleExpression: `$(options:mode) != 'golive'`,
				},
			],
			callback: async ({ options }) => {
				const showing = { logo: 'logo', blank: 'blank', hidetext: 'hideText', golive: 'goLive' }[options.mode]
				const back = options.toggle && options.mode !== 'golive' && self.status?.live.mode === showing
				return send(back ? 'mode/golive' : `mode/${options.mode}`, 'Output mode')
			},
		},
		camera: {
			name: 'Live Camera: on / off / toggle',
			description: 'The live camera behind the item (the app’s Live Camera button)',
			options: [
				{
					id: 'on',
					type: 'dropdown',
					label: 'Live Camera',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
					default: 'on',
				},
			],
			callback: async ({ options }) => {
				const on = options.on === 'toggle' ? !self.status?.live.camera : options.on === 'on'
				return send(on ? 'camera/on' : 'camera/off', 'Live Camera')
			},
		},
		media: {
			name: 'Media transport',
			description:
				'The live item’s media: a video or audio item’s own, else the audio attached to the item (a song’s backing track, an image show’s soundtrack)',
			options: [
				{
					id: 'command',
					type: 'dropdown',
					label: 'Command',
					choices: [
						{ id: 'playpause', label: 'Play / Pause' },
						{ id: 'restart', label: 'Restart' },
						{ id: 'rewind', label: 'Rewind' },
						{ id: 'forward', label: 'Forward' },
					],
					default: 'playpause',
				},
			],
			callback: async ({ options }) => send(`media/${options.command}`, 'Media'),
		},
		volume: {
			name: 'Volume',
			description:
				'The live item’s volume, as its volume bar (saved with the item): its attached audio’s where it has some, else a video or audio item’s own. Up / down move in steps of 5 %. Changing it unmutes',
			options: [
				{
					id: 'step',
					type: 'dropdown',
					label: 'Change',
					choices: [
						{ id: 'up', label: 'Up' },
						{ id: 'down', label: 'Down' },
						{ id: 'set', label: 'Set to…' },
					],
					default: 'up',
					disableAutoExpression: true,
				},
				{
					id: 'n',
					type: 'number',
					label: 'Volume (%)',
					description: '0 to 100. Switch to an expression to use a variable',
					default: 100,
					min: 0,
					max: 100,
					asInteger: true,
					isVisibleExpression: `$(options:step) == 'set'`,
				},
			],
			callback: async ({ options }) => {
				if (options.step !== 'set') return send(`audio/${options.step}`, 'Volume')
				const n = Math.round(Number(options.n))
				return send(Number.isFinite(n) && n >= 0 && n <= 100 ? `audio/${n}` : null, 'Volume')
			},
		},
		mute: {
			name: 'Mute',
			description:
				'Mutes the live item’s audio, as the Volume action picks it (not saved: the next item starts unmuted)',
			options: [
				{
					id: 'mute',
					type: 'dropdown',
					label: 'Mute',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'mute', label: 'Mute' },
						{ id: 'unmute', label: 'Unmute' },
					],
					default: 'toggle',
				},
			],
			callback: async ({ options }) => {
				const mute = options.mute === 'toggle' ? !self.status?.media.muted : options.mute === 'mute'
				return send(mute ? 'audio/mute' : 'audio/unmute', 'Mute')
			},
		},
		autoAdvance: {
			name: 'Auto-advance: play / pause',
			description:
				'The live item’s slide timer: an image show with Auto Advance on, a PowerPoint using its slide timings. Separate from its media, so pictures and their soundtrack can be paused apart',
			options: [
				{
					id: 'command',
					type: 'dropdown',
					label: 'Command',
					choices: [
						{ id: 'playpause', label: 'Play / Pause' },
						{ id: 'play', label: 'Play' },
						{ id: 'pause', label: 'Pause' },
					],
					default: 'playpause',
				},
			],
			callback: async ({ options }) => send(`autoadvance/${options.command}`, 'Auto-advance'),
		},
	})
}
