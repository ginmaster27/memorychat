import { LegalLayout } from '../src/components/LegalLayout';
import { termsOfService } from '../src/legal/policies';

export default function TermsOfServiceScreen() {
  return <LegalLayout policy={termsOfService} />;
}
