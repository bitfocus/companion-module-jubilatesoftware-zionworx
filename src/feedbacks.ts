import type ModuleInstance from './main.js'

// M3 adds the feedbacks.
export type FeedbacksSchema = Record<never, never>

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({})
}
