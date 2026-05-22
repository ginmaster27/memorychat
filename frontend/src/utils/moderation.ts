export type ModerationAction = 'allow' | 'warn' | 'block';

export interface ModerationResult {
  action: ModerationAction;
  categories: string[];
  score: number;
  userMessage: string;
}

const CATEGORY_RULES: Record<string, RegExp[]> = {
  underage_reference: [
    /\bminor\b/i,
    /\bunderage\b/i,
    /\b1[67]\b/i,
    /\bschool\s*girl\b/i,
    /\bschoolboy\b/i,
    /\bteen\b/i,
    /\bchild\b/i,
    /\bkid\b/i,
    /\byounger than 18\b/i,
  ],
  sexual_content: [
    /\bnude(s)?\b/i,
    /\bexplicit\b/i,
    /\bsex\b/i,
    /\bsexual\b/i,
    /\bsend pics\b/i,
    /\bsend private photo\b/i,
    /\bhookup\b/i,
    /\bintimate\b/i,
  ],
  grooming_or_exploitation: [
    /\bdon['’]?t tell anyone\b/i,
    /\bsecret between us\b/i,
    /\bmeet alone\b/i,
    /\bsend private photo\b/i,
    /\bkeep (it|this) secret\b/i,
  ],
  illegal_activity: [
    /\bsell illegal\b/i,
    /\btrafficking\b/i,
    /\bsell drugs\b/i,
    /\bbuy drugs\b/i,
    /\billegal deal\b/i,
  ],
  coercion_or_threat: [
    /\bi['’]?ll hurt\b/i,
    /\bthreat(en)?\b/i,
    /\bblackmail\b/i,
    /\bdo it or\b/i,
    /\bforce you\b/i,
  ],
  drugs_or_weapons: [
    /\bdrugs?\b/i,
    /\bweapon\b/i,
    /\bgun\b/i,
    /\bammo\b/i,
    /\bknife\b/i,
  ],
  harassment: [
    /\bharass(ment)?\b/i,
    /\babuse\b/i,
    /\bstupid\b/i,
    /\bidiot\b/i,
    /\bworthless\b/i,
  ],
};

const USER_MESSAGES: Record<ModerationAction, string> = {
  allow: '',
  warn: 'This message may violate Vibly’s safety rules. Sexual, exploitative, coercive, or illegal conversations are not allowed.',
  block: 'This content cannot be sent because it appears to involve underage, exploitative, illegal, or unsafe content.',
};

function detectCategories(message: string) {
  return Object.entries(CATEGORY_RULES)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(message)))
    .map(([category]) => category);
}

export function moderateMessage(message: string): ModerationResult {
  const categories = detectCategories(message);
  const categorySet = new Set(categories);
  const score = Math.min(1, categories.length * 0.22);
  const hasUnderage = categorySet.has('underage_reference');
  const hasGrooming = categorySet.has('grooming_or_exploitation');
  const hasAbuse = categorySet.has('harassment') || categorySet.has('coercion_or_threat');
  const hasIllegalOrWeapon = categorySet.has('illegal_activity') || categorySet.has('drugs_or_weapons');
  const hasRisk = categories.length > 0;

  let action: ModerationAction = 'allow';

  if (hasUnderage || hasAbuse || hasIllegalOrWeapon) {
    action = 'block';
  } else if (hasGrooming || hasRisk) {
    action = 'warn';
  }

  return {
    action,
    categories,
    score,
    userMessage: USER_MESSAGES[action],
  };
}
