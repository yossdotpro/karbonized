import * as prismThemes from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Style {
	label: string;
	theme: Record<string, React.CSSProperties>;
}

export const themes: Style[] = [
	{ label: 'a11yDark', theme: prismThemes.a11yDark },
	{ label: 'atomDark', theme: prismThemes.atomDark },
	{
		label: 'base16AteliersulphurpoolLight',
		theme: prismThemes.base16AteliersulphurpoolLight,
	},
	{ label: 'cb', theme: prismThemes.cb },
	{ label: 'coldarkCold', theme: prismThemes.coldarkCold },
	{ label: 'coldarkDark', theme: prismThemes.coldarkDark },
	{ label: 'coy', theme: prismThemes.coy },
	{ label: 'darcula', theme: prismThemes.darcula },
	{ label: 'duotoneDark', theme: prismThemes.duotoneDark },
	{ label: 'duotoneEarth', theme: prismThemes.duotoneEarth },
	{ label: 'duotoneForest', theme: prismThemes.duotoneForest },
	{ label: 'duotoneLight', theme: prismThemes.duotoneLight },
	{ label: 'duotoneSea', theme: prismThemes.duotoneSea },
	{ label: 'duotoneSpace', theme: prismThemes.duotoneSpace },
	{ label: 'funky', theme: prismThemes.funky },
	{ label: 'ghcolors', theme: prismThemes.ghcolors },
	{ label: 'gruvboxDark', theme: prismThemes.gruvboxDark },
	{ label: 'gruvboxLight', theme: prismThemes.gruvboxLight },
	{ label: 'hopscotch', theme: prismThemes.hopscotch },
	{ label: 'materialDark', theme: prismThemes.materialDark },
	{ label: 'materialLight', theme: prismThemes.materialLight },
	{ label: 'materialOceanic', theme: prismThemes.materialOceanic },
	{ label: 'nord', theme: prismThemes.nord },
	{ label: 'okaidia', theme: prismThemes.okaidia },
	{ label: 'oneDark', theme: prismThemes.oneDark },
	{ label: 'oneLight', theme: prismThemes.oneLight },
	{ label: 'pojoaque', theme: prismThemes.pojoaque },
	{ label: 'prism', theme: prismThemes.prism },
	{ label: 'shadesOfPurple', theme: prismThemes.shadesOfPurple },
	{ label: 'solarizedlight', theme: prismThemes.solarizedlight },
	{ label: 'synthwave84', theme: prismThemes.synthwave84 },
	{ label: 'tomorrow', theme: prismThemes.tomorrow },
	{ label: 'twilight', theme: prismThemes.twilight },
	{ label: 'vs', theme: prismThemes.vs },
	{ label: 'vscDarkPlus', theme: prismThemes.vscDarkPlus },
	{ label: 'xonokai', theme: prismThemes.xonokai },
];

/** The background a theme paints its code on, which code blocks start from. */
export const codeThemeBackground = (label: string): string | undefined => {
	const theme = themes.find((value) => value.label === label)?.theme;
	if (!theme) return undefined;
	const background =
		theme[':not(pre) > code[class*="language-"]']?.background ??
		theme['code[class*="language-"]']?.background;
	return typeof background === 'string' ? background : undefined;
};
