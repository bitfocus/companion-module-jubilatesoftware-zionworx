import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
}

export type ModuleSecrets = {
	token: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'Setting up',
			width: 12,
			value:
				'In ZionWorx, open Web Remote and tick Active. Click Add API Client…, name it (for example "Companion") and paste the token it shows below. The token is shown only once.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'ZionWorx PC address',
			description: 'IP address or name of the PC running ZionWorx (127.0.0.1 if it is this PC)',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			description: 'Shown in the Web Remote window (normally 7650)',
			width: 4,
			min: 1,
			max: 65535,
			default: 7650,
		},
		{
			type: 'secret-text',
			id: 'token',
			label: 'API client token',
			width: 12,
		},
	]
}
