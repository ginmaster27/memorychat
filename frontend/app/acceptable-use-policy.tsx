import { LegalLayout } from '../src/components/LegalLayout';
import { acceptableUsePolicy } from '../src/legal/policies';

export default function AcceptableUsePolicyScreen() {
  return <LegalLayout policy={acceptableUsePolicy} />;
}
