import daisyui from 'daisyui'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  plugins: [daisyui],
  daisyui: { themes: ['light', 'dark'] },
}