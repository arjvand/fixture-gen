import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { Check, Minus, X } from '@lucide/vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('IconCheck', Check)
    app.component('IconX', X)
    app.component('IconMinus', Minus)
  },
} satisfies Theme
