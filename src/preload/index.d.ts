import type { NetfixAPI } from './index'

declare global {
  interface Window {
    netfix: NetfixAPI
  }
}
