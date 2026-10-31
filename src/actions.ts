import type { CompanionInputFieldNumber } from '@companion-module/base'
import type ModuleInstance from './main.js'

// Every command in the HTTP API v1 (HTTP_API.md §2). Mode, camera and media commands set a state rather than toggle,
// so pressing a button twice never undoes it.

type Step = 'next' | 'prev' | 'number'

export type ActionsSchema = {
	slide: { options: { step: Step; n: number } }
	item: { options: { step: Step; n: number } }
	mode: { options: { mode: 'logo' | 'blank' | 'hidetext' | 'showall' } }
	camera: { options: { on: 'on' | 'off' } }
	media: { options: { command: 'playpause' | 'restart' | 'rewind' | 'forward' } }
}

const cErrors: Record<string, string> = {
	badArgs: 'no such item or slide',
	unavailable: 'not possible now (no slides, slides still loading, nothing to play…)',
	stale: 'the live item changed while the command was on its way',
	unreachable: 'ZionWorx is not reachable',
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
			description: 'Sets the output mode; choosing the mode already showing does nothing',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'logo', label: 'Logo' },
						{ id: 'blank', label: 'Blank' },
						{ id: 'hidetext', label: 'Hide Text' },
						{ id: 'showall', label: 'Show All' },
					],
					default: 'showall',
				},
			],
			callback: async ({ options }) => send(`mode/${options.mode}`, 'Output mode'),
		},
		camera: {
			name: 'Camera background',
			options: [
				{
					id: 'on',
					type: 'dropdown',
					label: 'Camera',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
					default: 'on',
				},
			],
			callback: async ({ options }) => send(`camera/${options.on}`, 'Camera'),
		},
		media: {
			name: 'Media transport',
			description: 'Video / audio of the live item',
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
	})
}
