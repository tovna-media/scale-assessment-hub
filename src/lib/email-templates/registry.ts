import type { ComponentType } from 'react'
import { template as welcomeTemplate } from './welcome'
import { template as gapReportReadyTemplate } from './gap-report-ready'
import { template as notificationTemplate } from './notification'
import { template as paymentSucceededTemplate } from './payment-succeeded'
import { template as subscriptionActivatedTemplate } from './subscription-activated'
import { template as subscriptionCanceledTemplate } from './subscription-canceled'
import { template as subscriptionUpdatedTemplate } from './subscription-updated'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'gap-report-ready': gapReportReadyTemplate,
  notification: notificationTemplate,
  'payment-succeeded': paymentSucceededTemplate,
  'subscription-activated': subscriptionActivatedTemplate,
  'subscription-canceled': subscriptionCanceledTemplate,
  'subscription-updated': subscriptionUpdatedTemplate,
}
