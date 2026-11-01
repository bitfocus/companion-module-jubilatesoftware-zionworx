import { combineRgb, type CompanionPresetDefinitions, type CompanionSimplePresetOptions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'

// M4 adds the rest of the presets; the volume ones came first, for a dial (e.g. on a SOOMFON panel).

const cWhite = combineRgb(255, 255, 255)
const cBlack = combineRgb(0, 0, 0)
const cMuted = { bgcolor: combineRgb(180, 0, 0), color: cWhite }
const cGreyedOut = { color: combineRgb(90, 90, 90), bgcolor: cBlack }

// Companion reads rotaryActions from a preset's options, though the module types don't list it yet.
const cRotary = { rotaryActions: true } as CompanionSimplePresetOptions

export function UpdatePresets(self: ModuleInstance): void {
	const v = (name: string) => `$(${self.label}:${name})`

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		volumeDial: {
			type: 'simple',
			name: 'Volume dial: turn for volume, push to mute',
			keywords: ['volume', 'mute', 'dial', 'rotary', 'encoder', 'knob'],
			style: { text: `Volume\n${v('volume_text')}`, size: '14', color: cWhite, bgcolor: cBlack },
			options: cRotary,
			steps: [
				{
					down: [{ actionId: 'mute', options: { mute: 'toggle' } }],
					up: [],
					rotate_left: [{ actionId: 'volume', options: { step: 'down', n: 100 } }],
					rotate_right: [{ actionId: 'volume', options: { step: 'up', n: 100 } }],
				},
			],
			feedbacks: [
				{ feedbackId: 'muted', options: {}, style: cMuted },
				{ feedbackId: 'unavailable', options: { control: 'volume' }, style: cGreyedOut },
			],
		},
		volumeUp: {
			type: 'simple',
			name: 'Volume up',
			keywords: ['volume'],
			style: { text: `Vol +\n${v('volume_text')}`, size: '14', color: cWhite, bgcolor: cBlack },
			steps: [{ down: [{ actionId: 'volume', options: { step: 'up', n: 100 } }], up: [] }],
			feedbacks: [{ feedbackId: 'unavailable', options: { control: 'volume' }, style: cGreyedOut }],
		},
		volumeDown: {
			type: 'simple',
			name: 'Volume down',
			keywords: ['volume'],
			style: { text: `Vol −\n${v('volume_text')}`, size: '14', color: cWhite, bgcolor: cBlack },
			steps: [{ down: [{ actionId: 'volume', options: { step: 'down', n: 100 } }], up: [] }],
			feedbacks: [{ feedbackId: 'unavailable', options: { control: 'volume' }, style: cGreyedOut }],
		},
		mute: {
			type: 'simple',
			name: 'Mute (toggle)',
			keywords: ['volume', 'mute'],
			style: { text: 'Mute', size: '18', color: cWhite, bgcolor: cBlack },
			steps: [{ down: [{ actionId: 'mute', options: { mute: 'toggle' } }], up: [] }],
			feedbacks: [
				{ feedbackId: 'muted', options: {}, style: cMuted },
				{ feedbackId: 'unavailable', options: { control: 'volume' }, style: cGreyedOut },
			],
		},
	}

	self.setPresetDefinitions(
		[
			{
				id: 'audio',
				name: 'Volume',
				description: 'The live video / audio item’s volume and mute',
				definitions: ['volumeDial', 'volumeUp', 'volumeDown', 'mute'],
			},
		],
		presets,
	)
}
