export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      colors: {
        ink: '#12131a',
        paper: '#f8fafc',
        coral: '#fb7185',
        amber: '#f59e0b',
        teal: '#14b8a6',
        violet: '#8b5cf6'
      },
      boxShadow: {
        glass: '0 24px 80px rgba(15, 23, 42, 0.18)'
      }
    }
  },
  plugins: []
};
