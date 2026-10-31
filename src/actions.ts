import type ModuleInstance from './main.js'

// M2 adds the commands.
export type ActionsSchema = Record<never, never>

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({})
}
