import {
	combineRgb,
	type CompanionButtonStyleProps,
	type CompanionPresetDefinitions,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
	type CompanionSimplePresetOptions,
} from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'

// The ready-made buttons, in the sections of the old generated page (test\WebRemote\make_companion_page.py in the
// ZionWorx source): slides, items, output, media, volume, clocks and status. Buttons light from feedbacks and grey
// out when their control makes no sense for the live item. Slides and items are push buttons; the one dial preset
// is the volume (turn = volume, push = mute).

type Preset = CompanionSimplePresetDefinition<ModuleSchema>
type Step = Preset['steps'][number]
type Feedback = Preset['feedbacks'][number]

const cWhite = combineRgb(255, 255, 255)
const cBlack = combineRgb(0, 0, 0)
const cGreen = { bgcolor: combineRgb(0, 140, 0), color: cWhite }
const cRed = { bgcolor: combineRgb(180, 0, 0), color: cWhite }
const cAmber = { bgcolor: combineRgb(200, 120, 0), color: cWhite }
const cGreyedOut = { color: combineRgb(90, 90, 90), bgcolor: cBlack }
const cDisplayBlue = combineRgb(0, 90, 200)
const cCueBlue = combineRgb(0, 40, 95)
const cDisplayGrey = combineRgb(48, 48, 48)

// How many numbered slide and item buttons to offer.
const cSlideButtons = 10
const cItemButtons = 20

// Companion reads rotaryActions from a preset's options, though the module types don't list it yet.
const cRotary = { rotaryActions: true } as CompanionSimplePresetOptions

function style(
	text: string,
	size: CompanionButtonStyleProps['size'] = 'auto',
	bgcolor = cBlack,
): CompanionButtonStyleProps {
	return { text, size, color: cWhite, bgcolor }
}

function press(down: Step['down']): Step[] {
	return [{ down, up: [] }]
}

function greyedOut(
	control: 'slides' | 'goLive' | 'hideText' | 'camera' | 'playPause' | 'seek' | 'restart' | 'volume',
): Feedback {
	return { feedbackId: 'unavailable', options: { control }, style: cGreyedOut }
}

export function UpdatePresets(self: ModuleInstance): void {
	const v = (name: string) => `$(${self.label}:${name})`
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const add = (id: string, preset: Preset): string => {
		presets[id] = preset
		return id
	}

	// --- Slides ------------------------------------------------------------------------------------------------------
	const slideNav = [
		add('slidePrev', {
			type: 'simple',
			name: 'Previous slide',
			keywords: ['slide', 'previous', 'back'],
			style: style('Prev\nSlide'),
			steps: press([{ actionId: 'slide', options: { step: 'prev', n: 1 } }]),
			feedbacks: [greyedOut('slides')],
		}),
		add('slideNext', {
			type: 'simple',
			name: 'Next slide',
			keywords: ['slide', 'next', 'advance'],
			style: style('Next\nSlide'),
			steps: press([{ actionId: 'slide', options: { step: 'next', n: 1 } }]),
			feedbacks: [greyedOut('slides')],
		}),
		add('slideNow', {
			type: 'simple',
			name: 'Live slide (press: next slide)',
			keywords: ['slide', 'section', 'verse'],
			style: style(`Slide\n${v('live_slide_of')}\n${v('live_label')}`, '14', cDisplayBlue),
			steps: press([{ actionId: 'slide', options: { step: 'next', n: 1 } }]),
			feedbacks: [],
		}),
	]
	const slideNumbers: string[] = []
	for (let n = 1; n <= cSlideButtons; n++)
		slideNumbers.push(
			add(`slide${n}`, {
				type: 'simple',
				name: `Slide ${n}`,
				keywords: ['slide'],
				style: style(`Slide\n${n}`),
				steps: press([{ actionId: 'slide', options: { step: 'number', n } }]),
				feedbacks: [{ feedbackId: 'liveSlide', options: { n }, style: cGreen }, greyedOut('slides')],
			}),
		)

	// --- Playlist items ----------------------------------------------------------------------------------------------
	const itemNav = [
		add('itemPrev', {
			type: 'simple',
			name: 'Previous item',
			keywords: ['item', 'playlist', 'previous'],
			style: style('Prev\nItem'),
			steps: press([{ actionId: 'item', options: { step: 'prev', n: 1 } }]),
			feedbacks: [],
		}),
		add('itemNext', {
			type: 'simple',
			name: 'Next item',
			keywords: ['item', 'playlist', 'next'],
			style: style('Next\nItem'),
			steps: press([{ actionId: 'item', options: { step: 'next', n: 1 } }]),
			feedbacks: [],
		}),
		add('itemLive', {
			type: 'simple',
			name: 'Live item title (press: next item)',
			keywords: ['item', 'title', 'live'],
			style: style(v('live_title'), '14', cDisplayBlue),
			steps: press([{ actionId: 'item', options: { step: 'next', n: 1 } }]),
			feedbacks: [],
		}),
		add('itemNextTitle', {
			type: 'simple',
			name: 'Next item title (press: next item)',
			keywords: ['item', 'title', 'next', 'cue'],
			style: style(`Next:\n${v('next_title')}`, '14', cCueBlue),
			steps: press([{ actionId: 'item', options: { step: 'next', n: 1 } }]),
			feedbacks: [],
		}),
	]
	const itemNumbers: string[] = []
	for (let n = 1; n <= cItemButtons; n++)
		itemNumbers.push(
			add(`item${n}`, {
				type: 'simple',
				name: `Playlist item ${n}`,
				keywords: ['item', 'playlist'],
				style: style(`${n}. ${v(`item_${n}_title`)}`, '14'),
				steps: press([{ actionId: 'item', options: { step: 'number', n } }]),
				feedbacks: [
					{ feedbackId: 'liveItem', options: { n }, style: cGreen },
					{ feedbackId: 'itemUnavailable', options: { n }, style: cGreyedOut },
				],
			}),
		)

	// --- Output ------------------------------------------------------------------------------------------------------
	const output = [
		add('modeLogo', {
			type: 'simple',
			name: 'Logo',
			keywords: ['mode', 'logo'],
			style: style('Logo'),
			steps: press([{ actionId: 'mode', options: { mode: 'logo' } }]),
			feedbacks: [{ feedbackId: 'mode', options: { mode: 'logo' }, style: cRed }],
		}),
		add('modeBlank', {
			type: 'simple',
			name: 'Blank',
			keywords: ['mode', 'blank', 'black', 'curtain'],
			style: style('Blank'),
			steps: press([{ actionId: 'mode', options: { mode: 'blank' } }]),
			feedbacks: [{ feedbackId: 'mode', options: { mode: 'blank' }, style: cRed }],
		}),
		add('modeHideText', {
			type: 'simple',
			name: 'Hide Text',
			keywords: ['mode', 'hide', 'text', 'clear'],
			style: style('Hide\nText'),
			steps: press([{ actionId: 'mode', options: { mode: 'hidetext' } }]),
			feedbacks: [{ feedbackId: 'mode', options: { mode: 'hideText' }, style: cRed }, greyedOut('hideText')],
		}),
		add('modeGoLive', {
			type: 'simple',
			name: 'Go Live',
			keywords: ['mode', 'go', 'live', 'show'],
			style: style('Go\nLive'),
			steps: press([{ actionId: 'mode', options: { mode: 'golive' } }]),
			feedbacks: [{ feedbackId: 'mode', options: { mode: 'goLive' }, style: cGreen }, greyedOut('goLive')],
		}),
		add('cameraOn', {
			type: 'simple',
			name: 'Camera background on',
			keywords: ['camera', 'background'],
			style: style('Camera\nOn'),
			steps: press([{ actionId: 'camera', options: { on: 'on' } }]),
			feedbacks: [{ feedbackId: 'camera', options: {}, style: cGreen }, greyedOut('camera')],
		}),
		add('cameraOff', {
			type: 'simple',
			name: 'Camera background off',
			keywords: ['camera', 'background'],
			style: style('Camera\nOff'),
			steps: press([{ actionId: 'camera', options: { on: 'off' } }]),
			feedbacks: [greyedOut('camera')],
		}),
	]

	// --- Media -------------------------------------------------------------------------------------------------------
	const media = [
		add('mediaPlayPause', {
			type: 'simple',
			name: 'Play / Pause (shows the time left)',
			keywords: ['media', 'video', 'audio', 'play', 'pause'],
			style: style(`Play\nPause\n${v('media_remaining')}`, '14'),
			steps: press([{ actionId: 'media', options: { command: 'playpause' } }]),
			feedbacks: [{ feedbackId: 'mediaPlaying', options: {}, style: cGreen }, greyedOut('playPause')],
		}),
		add('mediaRestart', {
			type: 'simple',
			name: 'Restart',
			keywords: ['media', 'video', 'audio', 'restart', 'start'],
			style: style('Restart'),
			steps: press([{ actionId: 'media', options: { command: 'restart' } }]),
			feedbacks: [greyedOut('restart')],
		}),
		add('mediaRewind', {
			type: 'simple',
			name: 'Rewind',
			keywords: ['media', 'video', 'audio', 'rewind', 'back'],
			style: style('Rewind'),
			steps: press([{ actionId: 'media', options: { command: 'rewind' } }]),
			feedbacks: [greyedOut('seek')],
		}),
		add('mediaForward', {
			type: 'simple',
			name: 'Forward',
			keywords: ['media', 'video', 'audio', 'forward', 'skip'],
			style: style('Forward'),
			steps: press([{ actionId: 'media', options: { command: 'forward' } }]),
			feedbacks: [greyedOut('seek')],
		}),
		add('mediaTimes', {
			type: 'simple',
			name: 'Media position and time left',
			keywords: ['media', 'time', 'remaining', 'position'],
			style: style(`${v('media_position')}\n-${v('media_remaining')}`, '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [{ feedbackId: 'mediaPlaying', options: {}, style: cGreen }],
		}),
	]

	// --- Volume ------------------------------------------------------------------------------------------------------
	const volume = [
		add('volumeDial', {
			type: 'simple',
			name: 'Volume dial: turn for volume, push to mute',
			keywords: ['volume', 'mute', 'dial', 'rotary', 'encoder', 'knob'],
			style: style(`Volume\n${v('volume_text')}`, '14'),
			options: cRotary,
			steps: [
				{
					down: [{ actionId: 'mute', options: { mute: 'toggle' } }],
					up: [],
					rotate_left: [{ actionId: 'volume', options: { step: 'down', n: 100 } }],
					rotate_right: [{ actionId: 'volume', options: { step: 'up', n: 100 } }],
				},
			],
			feedbacks: [{ feedbackId: 'muted', options: {}, style: cRed }, greyedOut('volume')],
		}),
		add('volumeUp', {
			type: 'simple',
			name: 'Volume up',
			keywords: ['volume'],
			style: style(`Vol +\n${v('volume_text')}`, '14'),
			steps: press([{ actionId: 'volume', options: { step: 'up', n: 100 } }]),
			feedbacks: [greyedOut('volume')],
		}),
		add('volumeDown', {
			type: 'simple',
			name: 'Volume down',
			keywords: ['volume'],
			style: style(`Vol −\n${v('volume_text')}`, '14'),
			steps: press([{ actionId: 'volume', options: { step: 'down', n: 100 } }]),
			feedbacks: [greyedOut('volume')],
		}),
		add('mute', {
			type: 'simple',
			name: 'Mute (toggle)',
			keywords: ['volume', 'mute'],
			style: style('Mute', '18'),
			steps: press([{ actionId: 'mute', options: { mute: 'toggle' } }]),
			feedbacks: [{ feedbackId: 'muted', options: {}, style: cRed }, greyedOut('volume')],
		}),
	]

	// --- Clocks and status -------------------------------------------------------------------------------------------
	const status = [
		add('countdown', {
			type: 'simple',
			name: 'Countdown time left',
			keywords: ['countdown', 'timer', 'clock'],
			style: style(`Countdown\n${v('countdown')}`, '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [],
		}),
		add('elapsed', {
			type: 'simple',
			name: 'Time since the item went live',
			keywords: ['elapsed', 'timer', 'clock'],
			style: style(`Live for\n${v('elapsed')}`, '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [],
		}),
		add('playlistTitle', {
			type: 'simple',
			name: 'Playlist title',
			keywords: ['playlist', 'title'],
			style: style(v('playlist_title'), '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [],
		}),
		add('modeShowing', {
			type: 'simple',
			name: 'Output mode showing',
			keywords: ['mode', 'output'],
			style: style(`Output\n${v('mode_label')}`, '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [{ feedbackId: 'mode', options: { mode: 'goLive' }, style: cGreen }],
		}),
		add('alertMain', {
			type: 'simple',
			name: 'Main alert showing',
			keywords: ['alert', 'notice', 'message'],
			style: style('Alert\nMain', '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [{ feedbackId: 'alert', options: { which: 'main' }, style: cAmber }],
		}),
		add('alertStage', {
			type: 'simple',
			name: 'Stage alert showing',
			keywords: ['alert', 'stage', 'message'],
			style: style('Alert\nStage', '14', cDisplayGrey),
			steps: press([]),
			feedbacks: [{ feedbackId: 'alert', options: { which: 'stage' }, style: cAmber }],
		}),
	]

	const sections: CompanionPresetSection<ModuleSchema>[] = [
		{
			id: 'slides',
			name: 'Slides',
			description: 'The live item’s slides. Greyed out when the live item has none',
			definitions: [
				{ id: 'slideNav', type: 'simple', name: 'Previous / next', presets: slideNav },
				{ id: 'slideNumbers', type: 'simple', name: 'Go to a slide (lit while live)', presets: slideNumbers },
			],
		},
		{
			id: 'items',
			name: 'Playlist items',
			description: 'Put playlist items live. The numbered buttons show the item titles and light while live',
			definitions: [
				{ id: 'itemNav', type: 'simple', name: 'Previous / next', presets: itemNav },
				{ id: 'itemNumbers', type: 'simple', name: 'Go to an item', presets: itemNumbers },
			],
		},
		{
			id: 'output',
			name: 'Output',
			description: 'The output mode (each sets its mode; pressing again does nothing) and the camera background',
			definitions: output,
		},
		{
			id: 'media',
			name: 'Media',
			description: 'The live video or audio',
			definitions: media,
		},
		{
			id: 'audio',
			name: 'Volume',
			description: 'The live video / audio item’s volume and mute',
			definitions: volume,
		},
		{
			id: 'status',
			name: 'Clocks and status',
			description: 'Displays: countdown, time live, playlist, output mode and alerts',
			definitions: status,
		},
	]

	self.setPresetDefinitions(sections, presets)
}
