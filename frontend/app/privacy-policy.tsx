import { LegalLayout } from '../src/components/LegalLayout';
import { privacyPolicy } from '../src/legal/policies';

export default function PrivacyPolicyScreen() {
  return <LegalLayout policy={privacyPolicy} />;
}
