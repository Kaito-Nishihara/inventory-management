import type { Preview } from '@storybook/react-vite'
import '../src/index.css'
import './wireframe.css'
import React from 'react'

const preview: Preview = {
  globalTypes: {
    wireframe: {
      name: 'Wireframe',
      description: 'Global wireframe rendering mode',
      defaultValue: true,
      toolbar: {
        icon: 'mirror',
        items: [
          { value: true, title: 'Wireframe On' },
          { value: false, title: 'Wireframe Off' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const className = context.globals.wireframe ? 'sb-wireframe' : ''
      return React.createElement('div', { className }, React.createElement(Story))
    },
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
