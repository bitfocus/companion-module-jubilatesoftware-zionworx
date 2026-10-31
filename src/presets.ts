import type ModuleInstance from './main.js'

// M4 adds the presets.
export function UpdatePresets(self: ModuleInstance): void {
	self.setPresetDefinitions([], {})
}
