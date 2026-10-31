import type ModuleInstance from './main.js'

// M3 adds the variables.
export type VariablesSchema = Record<never, never>

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({})
}
