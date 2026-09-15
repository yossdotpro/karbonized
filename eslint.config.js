import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
	js.configs.recommended,
	{
		ignores: ['dist', 'node_modules', '*.config.js', '*.config.ts'],
	},
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint,
			react,
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
			prettier,
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			// TypeScript checks these; the core versions misreport TS syntax.
			'no-unused-vars': 'off',
			'no-undef': 'off',
			'no-redeclare': 'off',
			// React 17+ JSX transform
			'react/react-in-jsx-scope': 'off',
			// React Compiler rules from react-hooks v7. Existing code predates
			// them; keep them visible as warnings until those spots are refactored.
			'react-hooks/set-state-in-effect': 'warn',
			'react-hooks/immutability': 'warn',
			'react-hooks/refs': 'warn',
			// Props are typed with TypeScript
			'react/prop-types': 'off',
			'react/jsx-no-target-blank': 'off',
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			'prettier/prettier': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_' },
			],
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	},
	prettierConfig,
];
