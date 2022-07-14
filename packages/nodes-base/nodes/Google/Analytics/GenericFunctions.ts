import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError,
} from 'n8n-workflow';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,
	endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const apiVersion = this.getNodeParameter('apiVersion', 0) as string;
	const baseURL = apiVersion === 'dataAPI' ? 'https://analyticsdata.googleapis.com' : 'https://analyticsreporting.googleapis.com';

	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `${baseURL}${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'googleAnalyticsOAuth2', options);

	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function googleApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any

	const apiVersion = this.getNodeParameter('apiVersion', 0) as string;
	const returnData: IDataObject[] = [];

	let responseData;

	if (apiVersion === 'dataAPI') {
		let rows: IDataObject[] = [];
		query.limit = 100000;
		query.offset = 0;

		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		rows = rows.concat(responseData.rows);
		query.offset = rows.length;

		while (responseData.rowCount > rows.length) {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			rows = rows.concat(responseData.rows);
			query.offset = rows.length;
		}
		responseData.rows = rows;
		returnData.push(responseData);

	} else {
		do {
			responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
			if (body.reportRequests && Array.isArray(body.reportRequests)) {
				body.reportRequests[0]['pageToken'] = responseData[propertyName][0].nextPageToken;
			} else {
				body.pageToken = responseData['nextPageToken'];
			}
			returnData.push.apply(returnData, responseData[propertyName]);
		} while (
			(responseData['nextPageToken'] !== undefined &&
				responseData['nextPageToken'] !== '') ||
			(responseData[propertyName] &&
				responseData[propertyName][0].nextPageToken &&
				responseData[propertyName][0].nextPageToken !== undefined)
		);
	}

	return returnData;
}

export function simplify(responseData: any | [any]) { // tslint:disable-line:no-any
	const response = [];
	for (const { columnHeader: { dimensions }, data: { rows } } of responseData) {
		if (rows === undefined) {
			// Do not error if there is no data
			continue;
		}
		for (const row of rows) {
			const data: IDataObject = {};
			if (dimensions) {
				for (let i = 0; i < dimensions.length; i++) {
					data[dimensions[i]] = row.dimensions[i];
					data['total'] = row.metrics[0].values.join(',');
				}
			} else {
				data['total'] = row.metrics[0].values.join(',');
			}
			response.push(data);
		}
	}
	return response;
}

export function merge(responseData: [any]) { // tslint:disable-line:no-any
	const response: { columnHeader: IDataObject, data: { rows: [] } } = {
		columnHeader: responseData[0].columnHeader,
		data: responseData[0].data,
	};
	const allRows = [];
	for (const { data: { rows } } of responseData) {
		allRows.push(...rows);
	}
	response.data.rows = allRows as [];
	return [response];
}

export function processFilters(expression: IDataObject): IDataObject[] {
	const processedFilters: IDataObject[] = [];

	Object.entries(expression as IDataObject).forEach(entry => {
		const [filterType, filters] = entry;

		(filters as IDataObject[]).forEach(filter => {
			const { fieldName } = filter;
			delete filter.fieldName;

			if (filterType === 'inListFilter') {
				filter.values = (filter.values as string).split(',');
			}

			if (filterType === 'numericFilter') {
				filter.value = {
					[filter.valueType as string]: filter.value,
				};
				delete filter.valueType;
			}

			if (filterType === 'betweenFilter') {
				filter.fromValue = {
					[filter.valueType as string]: filter.fromValue,
				};
				filter.toValue = {
					[filter.valueType as string]: filter.toValue,
				};
				delete filter.valueType;
			}

			processedFilters.push({
				filter: {
						fieldName,
						[filterType]: filter,
					},
			});
		});
	});

	return processedFilters;
}
