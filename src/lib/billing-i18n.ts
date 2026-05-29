import type { BillingPlanKey } from "@/lib/billing";
import type { AppLocale } from "@/lib/i18n";
import { translate } from "@/lib/i18n/messages";

const PLAN_FEATURE_KEYS: Record<BillingPlanKey, string[]> = {
  basic: ["plans.basic.f1", "plans.basic.f2", "plans.basic.f3", "plans.basic.f4", "plans.basic.f5"],
  pro: ["plans.pro.f1", "plans.pro.f2", "plans.pro.f3", "plans.pro.f4", "plans.pro.f5"],
  premium: ["plans.premium.f1", "plans.premium.f2", "plans.premium.f3", "plans.premium.f4", "plans.premium.f5"],
};

export function getLocalizedPlanName(locale: AppLocale, planKey: BillingPlanKey) {
  return translate(locale, `billing.plans.${planKey}.name`);
}

export function getLocalizedPlanDescription(locale: AppLocale, planKey: BillingPlanKey) {
  return translate(locale, `billing.plans.${planKey}.description`);
}

export function getLocalizedPlanFeatures(locale: AppLocale, planKey: BillingPlanKey) {
  return PLAN_FEATURE_KEYS[planKey].map((key) => translate(locale, key));
}

export function getLocalizedStarterLabel(locale: AppLocale) {
  return translate(locale, "billing.starterLabel");
}
