import { PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { IRestApiContext, IRootState, IRootStatePinia } from '@/Interface';
import { defineStore } from 'pinia';

export const useRootStore = defineStore('root', {
	state: (): IRootStatePinia => ({
		// @ts-ignore
		baseUrl: process.env.VUE_APP_URL_BASE_API ? process.env.VUE_APP_URL_BASE_API : (window.BASE_PATH === '/%BASE_PATH%/' ? '/' : window.BASE_PATH),
		defaultLocale: 'en',
		endpointWebhook: 'webhook',
		endpointWebhookTest: 'webhook-test',
		executionId: null,
		executingNode: '',
		executionWaitingForWebhook: false,
		pushConnectionActive: true,
		saveDataErrorExecution: 'all',
		saveDataSuccessExecution: 'all',
		saveManualExecutions: false,
		timezone: 'America/New_York',
		executionTimeout: -1,
		maxExecutionTimeout: Number.MAX_SAFE_INTEGER,
		versionCli: '0.0.0',
		oauthCallbackUrls: {},
		n8nMetadata: {},
		sessionId: Math.random().toString(36).substring(2, 15),
		urlBaseWebhook: 'http://localhost:5678/',
		isNpmAvailable: false,
		instanceId: '',
		nodeMetadata: {},
	}),
	getters: {
		getParametersLastUpdated: (state: IRootStatePinia): ((name: string) => number | undefined) => {
			return (nodeName: string) => state.nodeMetadata[nodeName] && state.nodeMetadata[nodeName].parametersLastUpdatedAt;
		},
		getRestUrl: (state: IRootStatePinia): string => {
			let endpoint = 'rest';
			if (process.env.VUE_APP_ENDPOINT_REST) {
				endpoint = process.env.VUE_APP_ENDPOINT_REST;
			}
			return `${state.baseUrl}${endpoint}`;
		},
		getRestApiContext: (state: IRootStatePinia): IRestApiContext => {
			let endpoint = 'rest';
			if (process.env.VUE_APP_ENDPOINT_REST) {
				endpoint = process.env.VUE_APP_ENDPOINT_REST;
			}
			return {
				baseUrl: `${state.baseUrl}${endpoint}`,
				sessionId: state.sessionId,
			};
		},
		getWebhookUrl: (state: IRootStatePinia): string => {
			return `${state.urlBaseWebhook}${state.endpointWebhook}`;
		},
		getWebhookTestUrl: (state: IRootStatePinia): string => {
			return `${state.urlBaseWebhook}${state.endpointWebhookTest}`;
		},
	},
	actions: {

	},
});
