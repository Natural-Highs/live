/** @type {import('tailwindcss').Config} */

module.exports = {
	content: ["./src/**/*.{js,ts,jsx,tsx}"], // adjust paths to your project
	theme: {
		extend: {},
	},
	plugins: [],
}

module.exports = {
    theme: {
        extend: {
            colors: {
                btnGreen: "#347937",
                btnGrey: "#637B7C",
                midGreen: "#98DA87",
                bgGreen: "#E2FDE6",
            },
            fontFamily: {
                inria: ['Inria Serif', 'sans-serif'], // text
                inter: ['Inter', 'sans-serif'], // just because
                kapakana: ['Kapakana', 'sans-serif'], // logo
                kotta: ['Kotta One', 'sans-serif'], // buttons
                lisu: ['Lisu Bosa', 'sans-serif'], // h1
            }
        },
    },
};

/*
// I found this online. Supposedly it'll set a default for all h1 elements
// I just don't know where to put it in the file structure.
    <style>
      html * {
        font-size: 37px;
        font-family: Lisu Bosa, sans-serif;
      }
    </style>
*/