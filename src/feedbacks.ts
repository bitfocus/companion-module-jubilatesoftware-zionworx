import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ZwMode, ZwStatus } from './zionworx.js'

// All from the last status; main.ts calls checkFeedbacks() whenever a status arrives.

type AvailKey = keyof ZwStatus['avail']

export type FeedbacksSchema = {
	mode: { type: 'boolean'; options: { mode: ZwMode } }
	camera: { type: 'boolean'; options: Record<string, never> }
	liveItem: { type: 'boolean'; options: { n: number } }
	itemUnavailable: { type: 'boolean'; options: { n: number } }
	liveSlide: { type: 'boolean'; options: { n: number } }
	mediaPlaying: { type: 'boolean'; options: Record<string, never> }
	muted: { type: 'boolean'; options: Record<string, never> }
	alert: { type: 'boolean'; options: { which: 'main' | 'stage' } }
	unavailable: { type: 'boolean'; options: { control: AvailKey } }
}

const cLit = { bgcolor: combineRgb(0, 140, 0), color: combineRgb(255, 255, 255) }
const cMuted = { bgcolor: combineRgb(180, 0, 0), color: combineRgb(255, 255, 255) }
const cGreyedOut = { color: combineRgb(90, 90, 90), bgcolor: combineRgb(0, 0, 0) }

export function UpdateFeedbacks(self: ModuleInstance): void {
	const live = () => self.status?.live

	self.setFeedbackDefinitions({
		mode: {
			type: 'boolean',
			name: 'Output mode is…',
			defaultStyle: cLit,
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					choices: [
						{ id: 'logo', label: 'Logo' },
						{ id: 'blank', label: 'Blank' },
						{ id: 'hideText', label: 'Hide Text' },
						{ id: 'goLive', label: 'Go Live' },
					],
					default: 'goLive',
				},
			],
			callback: ({ options }) => live()?.mode === options.mode,
		},
		camera: {
			type: 'boolean',
			name: 'Camera background is on',
			defaultStyle: cLit,
			options: [],
			callback: () => live()?.camera === true,
		},
		liveItem: {
			type: 'boolean',
			name: 'Playlist item is live',
			defaultStyle: cLit,
			options: [
				{
					id: 'n',
					type: 'number',
					label: 'Item number',
					description: 'Numbered from 1, as in the "Playlist item" action',
					default: 1,
					min: 1,
					max: 9999,
					asInteger: true,
				},
			],
			callback: ({ options }) => (live()?.item ?? 0) > 0 && live()?.item === Math.round(Number(options.n)),
		},
		itemUnavailable: {
			type: 'boolean',
			name: 'Playlist item is unavailable (grey out)',
			description:
				'True when the item’s song or file is missing (ZionWorx greys it out and it can’t go live), there is no such item, or ZionWorx is not connected',
			defaultStyle: cGreyedOut,
			options: [
				{
					id: 'n',
					type: 'number',
					label: 'Item number',
					description: 'Numbered from 1, as in the "Playlist item" action',
					default: 1,
					min: 1,
					max: 9999,
					asInteger: true,
				},
			],
			callback: ({ options }) => {
				if (!self.status) return true
				const item = self.playlist?.items[Math.round(Number(options.n)) - 1]
				return !item || item.available === false
			},
		},
		liveSlide: {
			type: 'boolean',
			name: 'Slide is live',
			defaultStyle: cLit,
			options: [
				{
					id: 'n',
					type: 'number',
					label: 'Slide number',
					description: 'Numbered from 1, as in the "Slide" action',
					default: 1,
					min: 1,
					max: 9999,
					asInteger: true,
				},
			],
			callback: ({ options }) => (live()?.slide ?? 0) > 0 && live()?.slide === Math.round(Number(options.n)),
		},
		mediaPlaying: {
			type: 'boolean',
			name: 'Media is playing',
			defaultStyle: cLit,
			options: [],
			callback: () => self.status?.media.playing === true,
		},
		muted: {
			type: 'boolean',
			name: 'Media is muted',
			defaultStyle: cMuted,
			options: [],
			callback: () => self.status?.avail.volume === true && self.status.media.muted === true,
		},
		alert: {
			type: 'boolean',
			name: 'Alert is showing',
			description: 'On while the alert fades in, shows or fades out',
			defaultStyle: cLit,
			options: [
				{
					id: 'which',
					type: 'dropdown',
					label: 'Alert',
					choices: [
						{ id: 'main', label: 'Main output' },
						{ id: 'stage', label: 'Stage display' },
					],
					default: 'main',
				},
			],
			callback: ({ options }) => {
				const state = self.status?.alerts[options.which]
				return state !== undefined && state !== 'off'
			},
		},
		unavailable: {
			type: 'boolean',
			name: 'Control is unavailable (grey out)',
			description: 'True when the control makes no sense for the live item now, or ZionWorx is not connected',
			defaultStyle: cGreyedOut,
			options: [
				{
					id: 'control',
					type: 'dropdown',
					label: 'Control',
					choices: [
						{ id: 'slides', label: 'Slides (next / previous / go to)' },
						{ id: 'goLive', label: 'Go Live' },
						{ id: 'hideText', label: 'Hide Text' },
						{ id: 'camera', label: 'Camera background' },
						{ id: 'playPause', label: 'Play / Pause' },
						{ id: 'seek', label: 'Rewind / Forward' },
						{ id: 'restart', label: 'Restart' },
						{ id: 'volume', label: 'Volume / Mute' },
					],
					default: 'slides',
				},
			],
			callback: ({ options }) => self.status?.avail[options.control] !== true,
		},
	})
}
