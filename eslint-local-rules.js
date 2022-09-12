'use strict';

/**
 * This file contains any locally defined ESLint rules. They are picked up by
 * eslint-plugin-local-rules and exposed as 'local-rules/<rule-name>'.
 * See packages/@n8n_io/eslint-config/ for details.
 *
 * These are looked up in a directory above node_modules/, which means that for an
 * npm workspace it needs to be located at the very root.
 */
module.exports = {
	/**
	 * A rule to detect calls to JSON.parse() that are not wrapped inside try/catch blocks.
	 *
	 * Valid:
	 * ```js
	 * try { JSON.parse(foo) } catch(err) { baz() }
	 * ```
	 *
	 * Invalid:
	 * ```js
	 * JSON.parse(foo)
	 * ```
	 *
	 * The pattern where an object is cloned with JSON.parse(JSON.stringify()) is allowed:
	 *
	 * Valid:
	 * ```js
	 * JSON.parse(JSON.stringify(foo))
	 * ```
	 */
	'require-catch-json-parse': {
		meta: {
			type: 'problem',
			docs: {
				description: 'Calls to JSON.parse() must be surrounded with a try/catch block.',
				recommended: 'error',
			},
			schema: [],
			messages: {
				requireCatchJsonParse: 'Surround the JSON.parse() call with a try/catch block.',
			},
		},
		defaultOptions: [],
		create(context) {
			return {
				MemberExpression(node) {
					if (node.object.name !== 'JSON' || node.property.name !== 'parse') {
						return;
					}

					if (node.parent?.type !== 'CallExpression') {
						return;
					}

					// Allow the special case of 'JSON.parse(JSON.stringify(foo))', which is
					// abundant in our codebase and not expected to throw errors (if not for cyclic deps!)
					const parseArg = node.parent.arguments?.[0];
					if (
						parseArg?.type === 'CallExpression' &&
						parseArg.callee.object.name === 'JSON' &&
						parseArg.callee.property.name === 'stringify'
					) {
						return;
					}

					// If we're wrapped inside a try statement, all is fine
					if (context.getAncestors().find((node) => node.type === 'TryStatement') !== undefined) {
						return;
					}

					// Found a JSON.parse() call not wrapped into a try/catch, so report it
					context.report({
						messageId: 'requireCatchJsonParse',
						node,
					});
				},
			};
		},
	},
};
