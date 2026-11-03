import type { CompanionVariableDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ZwMode, ZwPlaylist, ZwStatus } from './zionworx.js'

// Times tick here from the last status (moved on by the time since it arrived), so a second-by-second clock needs
// no polling. Text matches ZionWorx's ClockText: mm:ss, h:mm:ss from an hour; time left rounds up, time gone down.

export type VariablesSchema = {
	playlist_title: string
	playlist_count: number
	live_item: number
	live_title: string
	live_type: string
	live_slide: number
	live_slides: number
	live_slide_of: string
	live_label: string
	mode: string
	mode_label: string
	camera: boolean
	next_item: number
	next_title: string
	next_type: string
	media_playing: boolean
	media_position: string
	media_remaining: string
	media_duration: string
	media_remaining_s: number
	volume: number
	volume_text: string
	muted: boolean
	attached_playing: boolean
	attached_position: string
	attached_remaining: string
	attached_duration: string
	attached_remaining_s: number
	auto_advancing: boolean
	elapsed: string
	elapsed_s: number
	countdown: string
	countdown_s: number
	countdown_running: boolean
	alert_main: string
	alert_stage: string
	[item: `item_${number}_title`]: string
}

const cModeLabels: Record<ZwMode, string> = {
	logo: 'Logo',
	blank: 'Blank',
	hideText: 'Hide Text',
	goLive: 'Go Live',
}

export function clockText(ms: number, roundUp: boolean): string {
	let s = Math.floor(Math.max(0, ms) / 1000)
	if (roundUp && Math.max(0, ms) % 1000 > 0) s++
	const two = (n: number) => String(n).padStart(2, '0')
	return s >= 3600
		? `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`
		: `${two(Math.floor(s / 60))}:${two(s % 60)}`
}

/** All variable values for a status that arrived ageMs ago. */
export function statusValues(status: ZwStatus | null, ageMs: number): Partial<VariablesSchema> {
	if (!status) return {}
	const { live, next, media, elapsed, countdown } = status

	const position = Math.min(
		media.position + (media.playing ? ageMs : 0),
		media.duration > 0 ? media.duration : Infinity,
	)
	const remaining = Math.max(0, media.duration - position)
	const attached = status.attachedMedia
	const attachedPosition = attached
		? Math.min(attached.position + (attached.playing ? ageMs : 0), attached.duration > 0 ? attached.duration : Infinity)
		: 0
	const attachedRemaining = attached ? Math.max(0, attached.duration - attachedPosition) : 0
	const hasAttached = (attached?.duration ?? 0) > 0
	const elapsedMs = elapsed.ms + (elapsed.running ? ageMs : 0)
	const countdownMs = countdown ? Math.max(0, countdown.remaining - (countdown.running ? ageMs : 0)) : 0
	const hasVolume = status.avail.volume === true
	const volume = hasVolume ? (media.volume ?? 0) : 0
	const muted = hasVolume && media.muted === true

	return {
		playlist_title: status.playlist.title,
		playlist_count: status.playlist.count,
		live_item: live.item,
		live_title: live.title,
		live_type: live.type,
		live_slide: live.slide,
		live_slides: live.slides,
		live_slide_of: live.slide > 0 && live.slides > 0 ? `${live.slide}/${live.slides}` : '',
		live_label: live.label,
		mode: live.mode,
		mode_label: cModeLabels[live.mode] ?? live.mode,
		camera: live.camera,
		next_item: next?.item ?? 0,
		next_title: next?.title ?? '',
		next_type: next?.type ?? '',
		media_playing: media.playing,
		media_position: clockText(position, false),
		media_remaining: clockText(remaining, true),
		media_duration: clockText(media.duration, false),
		media_remaining_s: Math.ceil(remaining / 1000),
		volume,
		volume_text: !hasVolume ? '' : muted ? 'Muted' : `${volume}%`,
		muted,
		attached_playing: attached?.playing ?? false,
		attached_position: hasAttached ? clockText(attachedPosition, false) : '',
		attached_remaining: hasAttached ? clockText(attachedRemaining, true) : '',
		attached_duration: hasAttached && attached ? clockText(attached.duration, false) : '',
		attached_remaining_s: Math.ceil(attachedRemaining / 1000),
		auto_advancing: status.avail.autoAdvance === true && status.autoAdvance?.running === true,
		elapsed: clockText(elapsedMs, false),
		elapsed_s: Math.floor(elapsedMs / 1000),
		countdown: countdown ? clockText(countdownMs, true) : '',
		countdown_s: Math.ceil(countdownMs / 1000),
		countdown_running: countdown?.running ?? false,
		alert_main: status.alerts.main,
		alert_stage: status.alerts.stage,
	}
}

export function playlistValues(playlist: ZwPlaylist | null): Partial<VariablesSchema> {
	const values: Partial<VariablesSchema> = {}
	for (const item of playlist?.items ?? []) values[`item_${item.n}_title`] = item.title
	return values
}

export function UpdateVariableDefinitions(self: ModuleInstance, itemCount = 0): void {
	const defs: Partial<CompanionVariableDefinitions<VariablesSchema>> = {
		playlist_title: { name: 'Playlist title' },
		playlist_count: { name: 'Number of playlist items' },
		live_item: { name: 'Live item number (0: none)' },
		live_title: { name: 'Live item title' },
		live_type: { name: 'Live item type (song, bible, video…)' },
		live_slide: { name: 'Live slide number (0: none)' },
		live_slides: { name: 'Number of slides in the live item' },
		live_slide_of: { name: 'Live slide as "3/9"' },
		live_label: { name: 'Song section on screen ("V1", "C"…)' },
		mode: { name: 'Output mode id (logo, blank, hideText, goLive)' },
		mode_label: { name: 'Output mode (Logo, Blank, Hide Text, Go Live)' },
		camera: { name: 'Camera background on' },
		next_item: { name: 'Next item number (0: end of playlist)' },
		next_title: { name: 'Next item title' },
		next_type: { name: 'Next item type' },
		media_playing: { name: 'Media playing (a video / audio item, else attached audio)' },
		media_position: { name: 'Media position (mm:ss)' },
		media_remaining: { name: 'Media time left (mm:ss)' },
		media_duration: { name: 'Media duration (mm:ss)' },
		media_remaining_s: { name: 'Media time left in seconds' },
		volume: { name: 'Live item volume in percent (attached audio, else its own; 0: none)' },
		volume_text: { name: 'Live item volume as "55%", or "Muted" (empty: none)' },
		muted: { name: 'Live item audio muted' },
		attached_playing: { name: 'Attached audio playing' },
		attached_position: { name: 'Attached audio position (mm:ss; empty: none)' },
		attached_remaining: { name: 'Attached audio time left (mm:ss; empty: none)' },
		attached_duration: { name: 'Attached audio duration (mm:ss; empty: none)' },
		attached_remaining_s: { name: 'Attached audio time left in seconds' },
		auto_advancing: { name: 'Auto-advance running (image show / timed PowerPoint)' },
		elapsed: { name: 'Time since the live item went live (mm:ss)' },
		elapsed_s: { name: 'Time since the live item went live in seconds' },
		countdown: { name: 'Countdown time left (mm:ss; empty when no countdown is live)' },
		countdown_s: { name: 'Countdown time left in seconds' },
		countdown_running: { name: 'Countdown running' },
		alert_main: { name: 'Main alert (off, fadingIn, live, fadingOut)' },
		alert_stage: { name: 'Stage alert (off, fadingIn, live, fadingOut)' },
	}
	for (let n = 1; n <= itemCount; n++) defs[`item_${n}_title`] = { name: `Playlist item ${n} title` }
	self.setVariableDefinitions(defs as CompanionVariableDefinitions<VariablesSchema>)
}
