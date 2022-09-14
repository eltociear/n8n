import {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	NodeOperationError,
	PreSendAction,
} from 'n8n-workflow';

/**
 * Get a cursor-based paginator to use with n8n 'getAll' type endpoints.
 *
 * It will look up a 'nextCursor' in the response and if the node has
 * 'returnAll' set to true, will consecutively include it as the 'cursor' query
 * parameter for the next request, effectively getting everything in slices.
 *
 * Prequisites:
 * - routing.send.paginate must be set to true, for all requests to go through here
 * - node is expected to have a boolean parameter 'returnAll'
 * - no postReceive action setting the rootProperty, to get the items mapped
 *
 * @returns A ready-to-use cursor-based paginator function.
 */
export const getCursorPaginator = () => {
	return async function cursorPagination(
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		if (!requestOptions.options.qs) {
			requestOptions.options.qs = {};
		}

		let executions: INodeExecutionData[] = [];
		let responseData: INodeExecutionData[];
		let nextCursor: string | undefined = undefined;
		const returnAll = this.getNodeParameter('returnAll', true) as boolean;

		do {
			requestOptions.options.qs.cursor = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);

			// Check for another page of items
			const lastItem = responseData[responseData.length - 1].json;
			nextCursor = lastItem.nextCursor as string | undefined;

			responseData.forEach((page) => {
				const items = page.json.data as IDataObject[];
				if (items) {
					// Extract the items themselves
					executions = executions.concat(items.map((item) => ({ json: item })));
				}
			});

			// If we don't return all, just return the first page
		} while (returnAll && nextCursor);

		return executions;
	};
};

/**
 * A helper function to parse a node parameter as JSON and set it in the request body.
 * Throws a NodeOperationError is the content is not valid JSON or it cannot be set.
 *
 * Currently, parameters with type 'json' are not validated automatically.
 * Also mapping the value for 'body.data' declaratively has it treated as a string,
 * but some operations (e.g. POST /credentials) don't work unless it is set as an object.
 * To get the JSON-body operations to work consistently, we need to parse and set the body
 * manually.
 *
 * @param parameterName The name of the node parameter to parse
 * @param setAsBodyProperty An optional property name to set the parsed data into
 * @returns The requestOptions with its body replaced with the contents of the parameter
 */
export const parseAndSetBodyJson = (
	parameterName: string,
	setAsBodyProperty?: string,
): PreSendAction => {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		try {
			const rawData = this.getNodeParameter(parameterName, '{}') as string;
			const parsedObject = JSON.parse(rawData);

			// Set the parsed object to either as the request body directly, or as its sub-property
			if (setAsBodyProperty === undefined) {
				requestOptions.body = parsedObject;
			} else {
				requestOptions.body = Object.assign({}, requestOptions.body, {
					[setAsBodyProperty]: parsedObject,
				});
			}
		} catch (err) {
			throw new NodeOperationError(
				this.getNode(),
				`The '${parameterName}' property must be valid JSON, but cannot be parsed: ${err}`,
			);
		}
		return requestOptions;
	};
};
