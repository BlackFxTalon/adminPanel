import type { Component } from 'vue'

import CreateOrderOverlay from '../orders/CreateOrderOverlay.vue'
import ConfirmationOverlay from './ConfirmationOverlay.vue'
import FormOverlay from './FormOverlay.vue'
import InformationOverlay from './InformationOverlay.vue'
import type { OverlayType } from './overlay-lifecycle'

export type OverlayRegistry = Readonly<Record<OverlayType, { readonly component: Component }>>

export const overlayRegistry = {
  createOrder: { component: CreateOrderOverlay },
  information: { component: InformationOverlay },
  form: { component: FormOverlay },
  confirmation: { component: ConfirmationOverlay },
} satisfies OverlayRegistry
